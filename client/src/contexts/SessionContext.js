import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRoom, useLocalParticipant } from '@livekit/components-react';
import { Room } from 'livekit-client';
import io from 'socket.io-client';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

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

  // Join the LiveKit room and session
  const joinSession = useCallback(async (sessionData) => {
    try {
      setSessionId(sessionData.sessionId);
      
      // Connect to LiveKit room
      const newRoom = new Room();
      await newRoom.connect(sessionData.livekitUrl, sessionData.token);
      setRoom(newRoom);
      
      // Enable audio and video by default
      await newRoom.localParticipant.setCameraEnabled(true);
      await newRoom.localParticipant.setMicrophoneEnabled(true);
      
      // Join the socket.io room
      if (socket) {
        socket.emit('join-session', { sessionId: sessionData.sessionId });
      }
      
      // Add initial AI greeting
      setMessages([{ sender: 'ai', text: "Hello! I'm your AI interviewer today. I'll ask you some questions about your experience and skills. Let's get started. Could you please introduce yourself?" }]);
      
      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    }
  }, [socket]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (room) {
      const enabled = !isAudioEnabled;
      await room.localParticipant.setMicrophoneEnabled(enabled);
      setIsAudioEnabled(enabled);
    }
  }, [room, isAudioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (room) {
      const enabled = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(enabled);
      setIsVideoEnabled(enabled);
    }
  }, [room, isVideoEnabled]);

  // End session
  const endSession = useCallback(async () => {
    if (socket && sessionId) {
      socket.emit('end-session', { sessionId });
    }
    
    if (room) {
      room.disconnect();
    }
    
    setSessionId(null);
    setMessages([]);
    return true;
  }, [socket, sessionId, room]);

  // Add user message to transcript and send to backend
  const sendMessage = useCallback((text) => {
    if (socket && sessionId) {
      setMessages(prev => [...prev, { sender: 'user', text }]);
      socket.emit('user-message', { sessionId, message: text });
    }
  }, [socket, sessionId]);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        messages,
        isAudioEnabled,
        isVideoEnabled,
        joinSession,
        toggleAudio,
        toggleVideo,
        endSession,
        sendMessage
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};