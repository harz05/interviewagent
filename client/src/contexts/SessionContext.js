// src/contexts/SessionContext.js
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import io from 'socket.io-client';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [livekitToken, setLivekitToken] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
    });
    
    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    newSocket.on('ai-message', (message) => {
      setMessages(prev => [...prev, { sender: 'ai', text: message }]);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Join the session
  const joinSession = useCallback(async (sessionData) => {
    try {
      setSessionId(sessionData.sessionId);
      setLivekitUrl(sessionData.livekitUrl);
      setLivekitToken(sessionData.token);
      
      // Join the socket.io room
      if (socket) {
        socket.emit('join-session', { sessionId: sessionData.sessionId });
      }
      
      // Add initial AI greeting
      setMessages([{ 
        sender: 'ai', 
        text: "Hello! I'm your AI interviewer today. I'll ask you some questions about your experience and skills. Let's get started. Could you please introduce yourself?" 
      }]);
      
      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    }
  }, [socket]);

  // End session
  const endSession = useCallback(async () => {
    if (socket && sessionId) {
      socket.emit('end-session', { sessionId });
    }
    
    setSessionId(null);
    setMessages([]);
    setLivekitUrl(null);
    setLivekitToken(null);
    setIsConnected(false);
    return true;
  }, [socket, sessionId]);

  // Add user message to transcript and send to backend
  const sendMessage = useCallback((text) => {
    if (socket && sessionId) {
      setMessages(prev => [...prev, { sender: 'user', text }]);
      socket.emit('user-message', { sessionId, message: text });
    }
  }, [socket, sessionId]);

  const onConnected = useCallback(() => {
    setIsConnected(true);
    console.log('Connected to LiveKit room');
  }, []);

  const onDisconnected = useCallback(() => {
    setIsConnected(false);
    console.log('Disconnected from LiveKit room');
  }, []);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        messages,
        livekitUrl,
        livekitToken,
        isConnected,
        joinSession,
        endSession,
        sendMessage,
        onConnected,
        onDisconnected
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};