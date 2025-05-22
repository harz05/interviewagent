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
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '30') * 60000, // Default 30 minutes
};