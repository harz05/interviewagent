import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Start a new interview session
 * @param {string} name - The name of the interviewee
 * @returns {Promise<{sessionId: string, token: string, livekitUrl: string}>}
 */
export const startInterview = async (name) => {
  try {
    const response = await axios.post(`${API_URL}/sessions`, { name });
    return response.data;
  } catch (error) {
    console.error('Error starting interview:', error);
    throw error;
  }
};

/**
 * Get existing interview session data
 * @param {string} sessionId - The ID of the session to retrieve
 * @returns {Promise<{sessionId: string, token: string, livekitUrl: string}>}
 */
export const getInterviewSession = async (sessionId) => {
  try {
    const response = await axios.get(`${API_URL}/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting interview session:', error);
    throw error;
  }
};

/**
 * End an interview session
 * @param {string} sessionId - The ID of the session to end
 * @returns {Promise<void>}
 */
export const endInterviewSession = async (sessionId) => {
  try {
    await axios.delete(`${API_URL}/sessions/${sessionId}`);
  } catch (error) {
    console.error('Error ending interview session:', error);
    throw error;
  }
};