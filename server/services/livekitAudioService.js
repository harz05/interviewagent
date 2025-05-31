// server/services/livekitAudioService.js
// Removed: const { Room, RoomEvent, RemoteParticipant, RemoteTrack, Track, LocalAudioTrack, ParticipantEvent, ConnectionState } = require('livekit-client');
// Removed: const aiParticipantService = require('./aiParticipantService'); // AI participant client is removed
const { RoomServiceClient, IngressInput, EgressStatus } = require('livekit-server-sdk'); // Added EgressStatus
const config = require('../config');
const logger = require('../utils/logger');
// const { getSTTServiceProvider } = require('./speechService'); // STT provider details might still be needed for Egress config
const { generateAIResponse } = require('./llmService');
const { getTTSServiceProvider } = require('./ttsService');
const fs = require('fs').promises;
const fsSync = require('fs'); // For createWriteStream
const path = require('path');
const { pipeline } = require('stream/promises');
const { addMessageToSession } = require('./sessionStore');
// Import the getIoInstance function directly
const { getIoInstance } = require('../utils/socketInstance');
const { spawn } = require('child_process'); // For FFMPEG

// Export the handleTranscript function so it can be used by socketService.js
module.exports.handleTranscript = handleTranscript;

const conversationHistories = new Map(); // roomName -> [{ role, content }]
const activeEgresses = new Map(); // trackSid -> egressId (or roomName_participantIdentity -> egressId)
const ffmpegProcesses = new Map(); // egressId -> FFMPEG process

const roomServiceClient = new RoomServiceClient(
  config.livekit.url,
  config.livekit.apiKey,
  config.livekit.apiSecret
);

// RTMP endpoint for LiveKit Egress to send audio to.
// This needs to be an actual running RTMP server.
const RTMP_BASE_URL = process.env.RTMP_SERVER_URL || 'rtmp://localhost:1935/live';


/**
 * Starts a LiveKit Egress for a user's audio track to an RTMP endpoint.
 * @param {string} roomName
 * @param {string} participantIdentity
 * @param {string} trackSid
 */
async function startUserAudioEgress(roomName, participantIdentity, trackSid) {
  const egressIdKey = `${roomName}_${participantIdentity}_${trackSid}`;
  if (activeEgresses.has(egressIdKey)) {
    logger.info(`[LiveKitAudioService] Egress already active for track ${trackSid}.`);
    return;
  }

  const rtmpUrl = `${RTMP_BASE_URL}/${egressIdKey}`; // Unique stream key for RTMP
  logger.info(`[LiveKitAudioService] Starting Egress for track ${trackSid} (user: ${participantIdentity}, room: ${roomName}) to ${rtmpUrl}`);

  try {
    const egressInfo = await roomServiceClient.createEgress({
      roomName: roomName,
      // Egress to a specific track
      trackId: trackSid,
      output: {
        case: 'stream', // Indicates RTMP stream output
        value: { urls: [rtmpUrl] },
      },
      // You can also use track_composite if you need to mix multiple tracks or have more control
      // output: {
      //   case: 'trackComposite',
      //   value: {
      //     roomName: roomName,
      //     audioTrackId: trackSid,
      //     // No video track
      //     output: {
      //       case: 'rtmp',
      //       value: { urls: [rtmpUrl] }
      //     }
      //   }
      // }
    });

    logger.info(`[LiveKitAudioService] Egress created for track ${trackSid} with ID: ${egressInfo.egressId}. Status: ${egressInfo.status}`);
    activeEgresses.set(egressIdKey, egressInfo.egressId);

    // Now, start FFMPEG to consume this RTMP stream and pipe to Deepgram
    startFFmpegToDeepgram(egressInfo.egressId, rtmpUrl, roomName, participantIdentity);

  } catch (error) {
    logger.error(`[LiveKitAudioService] Error starting Egress for track ${trackSid}:`, error);
  }
}

/**
 * Starts an FFMPEG process to take RTMP audio, convert it, and stream to Deepgram.
 * @param {string} egressId - For logging and tracking.
 * @param {string} rtmpUrl - The RTMP URL FFMPEG should connect to.
 * @param {string} roomName
 * @param {string} participantIdentity
 */
function startFFmpegToDeepgram(egressId, rtmpUrl, roomName, participantIdentity) {
  if (!config.stt.apiKey || config.stt.provider.toLowerCase() !== 'deepgram') {
    logger.warn(`[LiveKitAudioService] Deepgram not configured. Skipping FFMPEG to Deepgram for egress ${egressId}.`);
    return;
  }

  // Deepgram WebSocket URL
  const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=${config.stt.deepgramModel || 'nova-2-general'}&encoding=linear16&sample_rate=16000&channels=1&smart_format=true&interim_results=false&punctuate=true`;
  
  // FFMPEG command:
  // -i ${rtmpUrl}: Input from RTMP
  // -vn: No video
  // -acodec pcm_s16le: Output audio codec PCM signed 16-bit little-endian
  // -ar 16000: Audio sample rate 16kHz (Deepgram prefers this for many models)
  // -ac 1: Mono audio
  // -f s16le: Output format raw PCM
  // -: Output to stdout, which we will pipe
  // This is a basic command. It might need adjustments for buffering, reconnects, etc.
  const ffmpegArgs = [
    '-i', rtmpUrl,
    '-vn', // No video
    '-acodec', 'pcm_s16le',
    '-ar', '16000',
    '-ac', '1',
    '-f', 's16le',
    '-bufsize', '81920', // Buffer size
    '-blocksize', '16384', // Block size for output
    '-flush_packets', '1', // Try to flush packets immediately
    'pipe:1' // Output to stdout
  ];

  logger.info(`[LiveKitAudioService] Starting FFMPEG for egress ${egressId}: ffmpeg ${ffmpegArgs.join(' ')} | wscat -H "Authorization: Token ${config.stt.apiKey.substring(0,5)}..." ${deepgramUrl}`);
  
  const ffmpeg = spawn('ffmpeg', ffmpegArgs);
  ffmpegProcesses.set(egressId, ffmpeg);

  const deepgramWs = new (require('ws'))(deepgramUrl, {
    headers: { 'Authorization': `Token ${config.stt.apiKey}` }
  });

  ffmpeg.stdout.on('data', (chunk) => {
    if (deepgramWs.readyState === deepgramWs.OPEN) {
      deepgramWs.send(chunk);
    }
  });

  ffmpeg.stderr.on('data', (data) => {
    // logger.debug(`[FFMPEG stderr - ${egressId}]: ${data.toString().trim()}`);
  });

  ffmpeg.on('close', (code) => {
    logger.info(`[LiveKitAudioService] FFMPEG process for egress ${egressId} exited with code ${code}`);
    if (deepgramWs.readyState === deepgramWs.OPEN) {
      deepgramWs.close();
    }
    ffmpegProcesses.delete(egressId);
    // Consider stopping egress if FFMPEG dies unexpectedly
  });
  ffmpeg.on('error', (err) => {
    logger.error(`[LiveKitAudioService] FFMPEG process error for egress ${egressId}:`, err);
    if (deepgramWs.readyState === deepgramWs.OPEN) {
      deepgramWs.close();
    }
    ffmpegProcesses.delete(egressId);
  });

  deepgramWs.on('open', () => {
    logger.info(`[LiveKitAudioService] Deepgram WebSocket connected for egress ${egressId}.`);
  });
  deepgramWs.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      if (response.channel?.alternatives?.[0]?.transcript && response.is_final) {
        const transcript = response.channel.alternatives[0].transcript.trim();
        if (transcript) {
          logger.info(`[Deepgram Transcript - ${egressId}]: ${transcript}`);
          handleTranscript(roomName, participantIdentity, transcript);
        }
      }
    } catch (e) {
      logger.error(`[LiveKitAudioService] Error parsing Deepgram message for ${egressId}:`, e);
    }
  });
  deepgramWs.on('error', (err) => {
    logger.error(`[LiveKitAudioService] Deepgram WebSocket error for ${egressId}:`, err);
    ffmpeg.kill('SIGINT'); // Kill FFMPEG if Deepgram errors
  });
  deepgramWs.on('close', (code, reason) => {
    logger.info(`[LiveKitAudioService] Deepgram WebSocket closed for ${egressId}. Code: ${code}, Reason: ${reason}`);
    ffmpeg.kill('SIGINT'); // Kill FFMPEG if Deepgram closes
  });
}


/**
 * Stops a LiveKit Egress.
 * @param {string} roomName
 * @param {string} participantIdentity
 * @param {string} trackSid - Can be null if stopping all for a participant.
 */
async function stopUserAudioEgress(roomName, participantIdentity, trackSid) {
  const egressIdKeyPattern = trackSid ? `${roomName}_${participantIdentity}_${trackSid}` : `${roomName}_${participantIdentity}_`;
  
  for (const [key, egressId] of activeEgresses.entries()) {
    if (key.startsWith(egressIdKeyPattern)) {
      logger.info(`[LiveKitAudioService] Stopping Egress ID: ${egressId} for key ${key}`);
      try {
        await roomServiceClient.stopEgress(egressId);
        logger.info(`[LiveKitAudioService] Egress ${egressId} stopped successfully.`);
      } catch (error) {
        // Egress might have already stopped or been deleted
        if (error.message && error.message.includes('egress not found')) {
            logger.warn(`[LiveKitAudioService] Egress ${egressId} not found, likely already stopped/deleted.`);
        } else {
            logger.error(`[LiveKitAudioService] Error stopping Egress ${egressId}:`, error);
        }
      }
      const ffmpeg = ffmpegProcesses.get(egressId);
      if (ffmpeg) {
        ffmpeg.kill('SIGINT');
        ffmpegProcesses.delete(egressId);
      }
      activeEgresses.delete(key);
    }
  }
}


async function handleTranscript(roomName, userIdentity, transcript, isInitialAIMessage = false) {
  logger.info(`[LiveKitAudioService] Handling transcript for ${userIdentity} in ${roomName}: "${transcript.substring(0, 100)}..."`);

  if (!isInitialAIMessage) {
    if (!conversationHistories.has(roomName)) {
      conversationHistories.set(roomName, [{
          role: 'system',
          content: `You are an AI interviewer. Be conversational, engaging, and ask follow-up questions. Keep responses concise.`
      }]);
    }
    const currentConversation = conversationHistories.get(roomName);
    currentConversation.push({ role: 'user', content: transcript });
  }

  try {
    let aiTextResponse;
    if (isInitialAIMessage) {
        aiTextResponse = transcript;
    } else {
        const currentConversationForLLM = conversationHistories.get(roomName) || [];
        aiTextResponse = await generateAIResponse(roomName, transcript, currentConversationForLLM);
    }
    
    logger.info(`[LiveKitAudioService] AI Text Response for ${roomName}: "${aiTextResponse}"`);

    if (aiTextResponse) {
      if (!isInitialAIMessage) {
        const currentConversation = conversationHistories.get(roomName);
        if(currentConversation) currentConversation.push({ role: 'assistant', content: aiTextResponse});
      }
      
      addMessageToSession(roomName, {
        sender: 'ai',
        text: aiTextResponse,
        timestamp: new Date()
      });

      const io = getIoInstance();
      if (io) {
        io.to(roomName).emit('ai-message', aiTextResponse);
      } else {
        logger.warn(`[LiveKitAudioService] Socket.IO instance not available, cannot emit 'ai-message' for room ${roomName}`);
      }


      const ttsService = getTTSServiceProvider();
      if (!ttsService || !ttsService.textToSpeech) {
          logger.error(`[LiveKitAudioService] TTS service not configured or textToSpeech method not available for ${roomName}.`);
          return;
      }
      const aiAudioStream = await ttsService.textToSpeech(aiTextResponse); 

      if (aiAudioStream) {
        const tempDir = path.join(__dirname, '..', 'temp_audio');
        await fs.mkdir(tempDir, { recursive: true });
        const audioFileExtension = (config.tts.provider === 'openai' && config.tts.openaiFormat) || 'mp3';
        const audioFilePath = path.join(tempDir, `ai_response_${roomName}_${Date.now()}.${audioFileExtension}`);

        logger.info(`[LiveKitAudioService] Saving AI audio stream to ${audioFilePath}`);
        const fileWriteStream = fsSync.createWriteStream(audioFilePath);
        await pipeline(aiAudioStream, fileWriteStream);
        logger.info(`[LiveKitAudioService] AI audio saved to ${audioFilePath}`);

        await playAIAudioFileViaIngress(roomName, audioFilePath);

        setTimeout(async () => {
          try {
            await fs.unlink(audioFilePath);
            logger.info(`[LiveKitAudioService] Deleted temp AI audio file: ${audioFilePath}`);
          } catch (e) {
            logger.warn(`[LiveKitAudioService] Could not delete temp AI audio file ${audioFilePath}: ${e.message}`);
          }
        }, 120000);

      } else {
        logger.error(`[LiveKitAudioService] Failed to generate AI audio stream for room ${roomName}. AI will not speak.`);
      }
    } else {
      logger.warn(`[LiveKitAudioService] No AI response generated for room ${roomName}`);
    }
  } catch (error) {
    logger.error(`[LiveKitAudioService] Error in transcript handling or AI response for ${roomName}:`, error);
  }
}

async function playAIAudioFileViaIngress(roomName, filePath) {
  try {
    logger.info(`[LiveKitAudioService] Creating File Ingress for ${filePath} in room ${roomName}`);
    const ingressInfo = await roomServiceClient.createIngress({
      inputType: IngressInput.FILE_INPUT,
      name: `ai-tts-${Date.now()}`,
      roomName: roomName,
      participantIdentity: config.aiParticipant.identity,
      participantName: config.aiParticipant.name,
      url: `file://${path.resolve(filePath)}`, // Ensure absolute path for file://
    });
    logger.info(`[LiveKitAudioService] File Ingress created: ${ingressInfo.ingressId}, state: ${ingressInfo.state?.status}`);
  } catch (error) {
    logger.error(`[LiveKitAudioService] Error creating File Ingress for ${filePath} in room ${roomName}:`, error);
  }
}

async function cleanupRoomResources(roomName) {
    logger.info(`[LiveKitAudioService] Cleaning up all resources for room ${roomName}`);
    // Stop all egresses for this room
    const egressKeysToStop = [];
    for (const key of activeEgresses.keys()) {
        if (key.startsWith(`${roomName}_`)) {
            egressKeysToStop.push(key);
        }
    }
    for (const key of egressKeysToStop) {
        const egressId = activeEgresses.get(key);
        logger.info(`[LiveKitAudioService] Cleaning up Egress ID: ${egressId} for key ${key}`);
        try {
            await roomServiceClient.stopEgress(egressId);
        } catch (error) {
            logger.warn(`[LiveKitAudioService] Error stopping Egress ${egressId} during cleanup: ${error.message}`);
        }
        const ffmpeg = ffmpegProcesses.get(egressId);
        if (ffmpeg) {
            ffmpeg.kill('SIGINT');
            ffmpegProcesses.delete(egressId);
        }
        activeEgresses.delete(key);
    }

    conversationHistories.delete(roomName);
    // No aiParticipantService.disconnectAI(roomName) as AI client is removed.
    logger.info(`[LiveKitAudioService] Finished cleaning resources for room ${roomName}`);
}

module.exports = {
  // processUserAudioTrack, // This is no longer the primary way to get user audio
  startUserAudioEgress,
  stopUserAudioEgress,
  cleanupRoomResources,
  handleTranscript,
};