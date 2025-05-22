const fetch = require('node-fetch');
const logger = require('../../utils/logger');

// Configuration
let apiConfig = null;

/**
 * Initialize the OpenAI API client
 * @param {Object} config - LLM configuration
 */
exports.initialize = async (config) => {
  try {
    logger.info(`Initializing OpenAI API for model: ${config.model}`);
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    apiConfig = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-3.5-turbo',
      baseUrl: config.baseUrl || 'https://api.openai.com/v1'
    };
    
    logger.info('OpenAI API initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize OpenAI API:', error);
    throw error;
  }
};

/**
 * Generate a response using the OpenAI API
 * @param {string} systemPrompt - System prompt for context
 * @param {Array} messages - Conversation history
 * @returns {Promise<string>} - Generated response
 */
exports.generateResponse = async (systemPrompt, messages) => {
  try {
    if (!apiConfig) {
      throw new Error('OpenAI API not initialized');
    }
    
    // Prepare the messages array with system prompt and history
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
    
    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: formattedMessages,
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    logger.error('Error generating response from OpenAI API:', error);
    throw error;
  }
};