// server/services/speechService.js - Enhanced with streaming support
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Transcribe audio using OpenAI Whisper API (Enhanced)
 */
exports.transcribeAudioStream = async (audioBuffer) => {
  try {
    if (!audioBuffer || audioBuffer.length === 0) {
      return '';
    }

    // Write audio buffer to temporary file
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `audio_${Date.now()}.wav`);
    await fs.writeFile(tempFilePath, audioBuffer);

    // Create form data for API call
    const formData = new FormData();
    formData.append('file', await fs.readFile(tempFilePath), {
      filename: 'audio.wav',
      contentType: 'audio/wav'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    // Clean up temp file
    await fs.unlink(tempFilePath).catch(() => {});

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.text?.trim() || '';

  } catch (error) {
    logger.error('Error transcribing audio:', error);
    return '';
  }
};

/**
 * Real-time transcription using Deepgram streaming
 */
exports.createDeepgramStream = (onTranscript, onError) => {
  try {
    const ws = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true', {
      headers: {
        'Authorization': `Token ${config.deepgram.apiKey}`
      }
    });

    ws.on('open', () => {
      logger.info('Deepgram WebSocket connected');
    });

    ws.on('message', (data) => {
      try {
        const result = JSON.parse(data);
        if (result.channel?.alternatives?.[0]?.transcript) {
          const transcript = result.channel.alternatives[0].transcript;
          const isFinal = result.is_final;
          
          if (transcript.trim() && isFinal) {
            onTranscript(transcript);
          }
        }
      } catch (error) {
        logger.error('Error parsing Deepgram response:', error);
      }
    });

    ws.on('error', (error) => {
      logger.error('Deepgram WebSocket error:', error);
      onError(error);
    });

    return ws;
  } catch (error) {
    logger.error('Error creating Deepgram stream:', error);
    if (onError) onError(error);
    return null;
  }
};

/**
 * Returns the configured STT service provider details.
 * This is a placeholder and can be expanded for multiple providers.
 */
exports.getSTTServiceProvider = () => {
  const provider = config.stt.provider.toLowerCase();
  if (provider === 'deepgram') {
    return {
      type: 'deepgram',
      apiKey: config.stt.apiKey,
      model: config.stt.deepgramModel,
      createStream: exports.createDeepgramStream, // Reference to the function
    };
  } else if (provider === 'openai_whisper' || provider === 'whisper') {
    return {
      type: 'whisper',
      apiKey: config.llm.type === 'openai' ? config.llm.apiKey : config.stt.apiKey, // Assuming Whisper uses OpenAI key if LLM is OpenAI
      transcribeBuffer: exports.transcribeAudioStream, // Reference to the function
    };
  }
  logger.warn(`Unsupported STT provider configured: ${config.stt.provider}`);
  return null;
};
