// server/services/ttsService.js - Enhanced with streaming
const fetch = require('node-fetch');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Convert text to speech using OpenAI TTS.
 * Returns a ReadableStream of the audio data.
 */
exports.textToSpeechOpenAI = async (text) => {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for OpenAI TTS');
    }
    // Note: OpenAI TTS currently returns MP3 by default.
    // For LiveKit LocalAudioTrack in Node, PCM is preferred.
    // This might require an MP3 decoding step if PCM output isn't directly available.
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.llm.type === 'openai' ? config.llm.apiKey : config.tts.apiKey}`, // Use correct API key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.tts.openaiModel || 'tts-1', // Make model configurable
        input: text.substring(0, 4096),
        voice: config.tts.openaiVoice || 'alloy', // Make voice configurable
        response_format: config.tts.openaiFormat || 'mp3', // e.g., mp3, opus, aac, flac. pcm might be 'pcm_s16le' if supported
        speed: 1.0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI TTS error (${response.status}): ${errorText}`);
    }
    logger.info(`OpenAI TTS stream initiated for text: "${text.substring(0,30)}..."`);
    return response.body; // Returns a ReadableStream

  } catch (error) {
    logger.error('Error generating speech with OpenAI:', error);
    throw error;
  }
};

/**
 * Convert text to speech using ElevenLabs API.
 * Returns a ReadableStream of the audio data.
 */
exports.textToSpeechElevenLabs = async (text) => {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for ElevenLabs TTS');
    }
    const selectedVoiceId = config.tts.elevenlabsVoiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default if not in config
    const modelId = config.tts.elevenlabsModelId || 'eleven_turbo_v2'; // Or other suitable model

    // ElevenLabs can stream PCM directly, which is good for LiveKit.
    // Example for PCM: audio/pcm; sample_rate=24000
    // We need to specify output_format for PCM.
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}/stream`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg', // Default, or 'audio/pcm' if we configure PCM output
        'Content-Type': 'application/json',
        'xi-api-key': config.tts.apiKey
      },
      body: JSON.stringify({
        text: text.substring(0, 5000), // Max length for ElevenLabs
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0, // Set to 0 for more neutral if desired, or higher for more expressive
          use_speaker_boost: true
        },
        // For PCM output (example, check ElevenLabs docs for exact format string)
        // output_format: 'pcm_24000' // This tells ElevenLabs to stream 24kHz PCM
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs TTS error (${response.status}): ${errorText}`);
    }
    logger.info(`ElevenLabs TTS stream initiated for text: "${text.substring(0,30)}..."`);
    return response.body; // Returns a ReadableStream

  } catch (error) {
    logger.error('Error generating speech with ElevenLabs:', error);
    throw error;
  }
};

/**
 * Returns the configured TTS service provider details.
 */
exports.getTTSServiceProvider = () => {
  const provider = config.tts.provider.toLowerCase();
  if (provider === 'elevenlabs') {
    return {
      type: 'elevenlabs',
      apiKey: config.tts.apiKey,
      voiceId: config.tts.elevenlabsVoiceId,
      textToSpeech: exports.textToSpeechElevenLabs,
    };
  } else if (provider === 'openai_tts' || provider === 'openai') {
    return {
      type: 'openai',
      apiKey: config.llm.type === 'openai' ? config.llm.apiKey : config.tts.apiKey,
      textToSpeech: exports.textToSpeechOpenAI,
    };
  }
  logger.warn(`Unsupported TTS provider configured: ${config.tts.provider}`);
  return null;
};

// Renaming old export for clarity if it was used elsewhere, though it's now replaced by OpenAI one.
exports.textToSpeechStreamOpenAI_DEPRECATED_BUFFER = async (text) => { /* old buffer code */ };