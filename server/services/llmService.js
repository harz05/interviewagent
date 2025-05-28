// server/services/llmService.js - Enhanced for Mistral
const fetch = require('node-fetch');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Generate AI response using Mistral API with conversation context
 */
exports.generateAIResponse = async (sessionId, userMessage, conversationHistory = []) => {
  try {
    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are an AI interviewer conducting a professional job interview. 
        Be conversational, engaging, and ask follow-up questions based on the candidate's responses. 
        Keep responses concise (2-3 sentences max) to maintain natural conversation flow.
        Ask about their experience, skills, projects, and motivations.
        Be encouraging and professional.`
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      {
        role: 'user',
        content: userMessage
      }
    ];

    const requestBody = {
      model: config.llm.model || 'mistral-7b-instruct',
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
      stream: false
    };

    // Use the correct API endpoint URL
    // If baseUrl is provided, use it, otherwise use the default Mistral API URL
    const apiUrl = config.llm.baseUrl
      ? `${config.llm.baseUrl}/chat/completions`
      : 'https://api.mistral.ai/v1/chat/completions';
    
    logger.info(`[LLMService] Using Mistral API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.llm.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error('No response from Mistral API');
    }

    logger.info(`Mistral response generated for session ${sessionId}`);
    return aiResponse;

  } catch (error) {
    logger.error('Error generating AI response:', error);
    // Fallback response
    return "I apologize, I'm having some technical difficulties. Could you please repeat that?";
  }
};

/**
 * Generate streaming AI response (for real-time responses)
 */
exports.generateStreamingAIResponse = async (sessionId, userMessage, conversationHistory, onChunk) => {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are an AI interviewer. Be conversational and concise.`
      },
      ...conversationHistory.slice(-8),
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await fetch(`${config.llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.llm.apiKey}`
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages: messages,
        max_tokens: 150,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    let fullResponse = '';
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              onChunk(content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return fullResponse;
  } catch (error) {
    logger.error('Error generating streaming AI response:', error);
    throw error;
  }
};