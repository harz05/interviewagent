const { getSessionMessages } = require('./sessionStore');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize the LLM provider based on configuration
let llmProvider;

if (config.llm.type === 'mistral') {
  // Import Mistral API provider
  llmProvider = require('./llmProviders/mistralAPI');
} else if (config.llm.type === 'openai') {
  // Import OpenAI API provider
  llmProvider = require('./llmProviders/openaiAPI');
} else {
  // Default to Mistral if not specified
  logger.warn(`Unknown LLM type: ${config.llm.type}, defaulting to Mistral API`);
  llmProvider = require('./llmProviders/mistralAPI');
}

/**
 * Initialize the LLM service
 */
exports.initLLMService = async () => {
  try {
    await llmProvider.initialize(config.llm);
    logger.info(`LLM service initialized with provider: ${config.llm.type}`);
  } catch (error) {
    logger.error('Failed to initialize LLM service:', error);
    throw error;
  }
};

/**
 * Generate AI response based on conversation history
 * @param {string} sessionId - The session ID
 * @param {string} userMessage - The latest user message
 * @returns {Promise<string>} - AI generated response
 */
exports.generateAIResponse = async (sessionId, userMessage) => {
  try {
    // Get conversation history
    const messages = getSessionMessages(sessionId);
    
    // Format messages for the LLM
    const formattedMessages = messages.map(msg => ({
      role: msg.sender === 'ai' ? 'assistant' : 'user',
      content: msg.text
    }));
    
    // Add system prompt for interview context
    const systemPrompt = `You are an AI interviewer conducting a job interview. 
    Ask relevant questions about the candidate's experience, skills, and qualifications. 
    Be professional but conversational. Ask one question at a time and wait for the response. 
    Follow up on the candidate's answers when appropriate. At the end of the interview, thank the candidate for their time.`;
    
    // Add latest user message if not already in history
    if (!messages.find(msg => msg.sender === 'user' && msg.text === userMessage)) {
      formattedMessages.push({
        role: 'user',
        content: userMessage
      });
    }
    
    // Generate response
    const aiResponse = await llmProvider.generateResponse(systemPrompt, formattedMessages);
    return aiResponse;
  } catch (error) {
    logger.error('Error generating AI response:', error);
    throw error;
  }
};