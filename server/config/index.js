require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    url: process.env.LIVEKIT_URL || 'ws://localhost:7880'
  },
  llm: {
    type: process.env.LLM_TYPE || 'mistral', // 'mistral' or 'openai'
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL || 'mistral-7b-instruct-v0.2',
    baseUrl: process.env.LLM_API_BASE_URL
  },
  stt: {
    provider: process.env.STT_PROVIDER || 'deepgram', // e.g., 'deepgram', 'openai_whisper'
    apiKey: process.env.STT_API_KEY,
    deepgramModel: process.env.DEEPGRAM_MODEL || 'nova-2-general',
    // Add other provider-specific settings if needed
  },
  tts: {
    provider: process.env.TTS_PROVIDER || 'elevenlabs', // e.g., 'elevenlabs', 'google_tts'
    apiKey: process.env.TTS_API_KEY,
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
    // Add other provider-specific settings if needed
  },
  aiParticipant: {
    identity: process.env.AI_PARTICIPANT_IDENTITY || 'ai-interviewer',
    name: process.env.AI_PARTICIPANT_NAME || 'AI Interviewer'
  },
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '30') * 60000, // Default 30 minutes
};