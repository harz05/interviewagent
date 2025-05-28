// src/contexts/SessionContext.js
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [livekitToken, setLivekitToken] = useState(null);
  const [isLiveKitConnected, setIsLiveKitConnected] = useState(false); // Renamed for clarity

  // Deepgram state
  const [deepgramClient, setDeepgramClient] = useState(null);
  const [dgConnection, setDgConnection] = useState(null); // Deepgram connection instance
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [microphone, setMicrophone] = useState(null);
  const [userTranscript, setUserTranscript] = useState(''); // For displaying interim transcript
  const transcriptTimeoutRef = useRef(null);


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

  // Initialize Deepgram
  useEffect(() => {
    if (process.env.REACT_APP_DEEPGRAM_API_KEY) {
      const dg = createClient(process.env.REACT_APP_DEEPGRAM_API_KEY);
      setDeepgramClient(dg);
    } else {
      console.warn('Deepgram API Key not found. Transcription will not be available.');
    }
  }, []);


  const startTranscription = useCallback(async () => {
    if (!deepgramClient || !sessionId) {
      console.error('Deepgram client or session ID not available for transcription.');
      return;
    }
    if (isTranscribing || dgConnection) {
      console.warn('Transcription already active or connection exists.');
      return;
    }

    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Log the Deepgram API key (first few characters) for debugging
      console.log('Deepgram API Key available:',
                  process.env.REACT_APP_DEEPGRAM_API_KEY ?
                  `${process.env.REACT_APP_DEEPGRAM_API_KEY.substring(0, 5)}...` :
                  'Not found');
      
      // Simplify Deepgram parameters to reduce potential issues
      const newDgConnection = deepgramClient.listen.live({
        model: 'nova-2',
        smart_format: true,
        interim_results: true,
        language: 'en-US',
        punctuate: true,
        // Removed endpointing and vad_turnoff as they might be causing issues
      });

      newDgConnection.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened successfully.');
        setIsTranscribing(true);
        if (mic.getAudioTracks().length > 0) {
          try {
            // Try with explicit mime type
            const mediaRecorder = new MediaRecorder(mic, { mimeType: 'audio/webm' });
            
            mediaRecorder.addEventListener('dataavailable', event => {
              try {
                if (event.data.size > 0 && newDgConnection.getReadyState() === 1 /* OPEN */) {
                  console.log(`Sending audio chunk to Deepgram, size: ${event.data.size} bytes`);
                  newDgConnection.send(event.data);
                }
              } catch (err) {
                console.error('Error sending data to Deepgram:', err);
              }
            });
            
            // Send smaller chunks more frequently for better responsiveness
            mediaRecorder.start(100); // Send data every 100ms
            setMicrophone({ mediaRecorder, stream: mic });
            console.log('MediaRecorder started successfully');
          } catch (err) {
            console.error('Error creating MediaRecorder:', err);
            // Try with a fallback mime type if the first one fails
            try {
              const mediaRecorder = new MediaRecorder(mic);
              mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0 && newDgConnection.getReadyState() === 1) {
                  newDgConnection.send(event.data);
                }
              });
              mediaRecorder.start(100);
              setMicrophone({ mediaRecorder, stream: mic });
              console.log('MediaRecorder started with default mime type');
            } catch (fallbackErr) {
              console.error('Fallback MediaRecorder also failed:', fallbackErr);
            }
          }
        } else {
          console.error('No audio tracks available in the microphone stream');
        }
      });

      newDgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const currentAlternative = data.channel.alternatives[0];
        const transcript = currentAlternative.transcript;

        if (transcript) {
          // Always update the interim transcript display for user feedback
          setUserTranscript(transcript);
          
          if (data.is_final && data.speech_final && transcript.trim()) {
            // This is a final transcript for an utterance
            const finalTranscript = transcript.trim();
            console.log('Final transcript from Deepgram:', finalTranscript);
            
            // Add to messages list for local display
            setMessages(prev => [...prev, { sender: 'user', text: finalTranscript }]);
            
            // Send to backend
            if (socket) {
              socket.emit('user-message', { sessionId, message: finalTranscript });
            }
            
            // Clear the interim transcript display
            setUserTranscript('');
            clearTimeout(transcriptTimeoutRef.current); // Clear any pending timeout
          } else {
            // This is an interim transcript
            // Set up a timeout to handle long pauses - if the user pauses for more than 2.5 seconds,
            // we'll treat the current transcript as final even if Deepgram hasn't marked it as speech_final
            clearTimeout(transcriptTimeoutRef.current);
            transcriptTimeoutRef.current = setTimeout(() => {
              const currentTranscript = transcript.trim();
              // Reduced minimum length requirement to capture shorter phrases
              if (currentTranscript && currentTranscript.length > 2) {
                console.log('Sending transcript after pause:', currentTranscript);
                
                // Add to messages list for local display
                setMessages(prev => [...prev, { sender: 'user', text: currentTranscript }]);
                
                // Send to backend
                if (socket) {
                  socket.emit('user-message', { sessionId, message: currentTranscript });
                }
                
                // Clear the interim transcript display
                setUserTranscript('');
              }
            }, 1500); // Reduced to 1.5 seconds for faster response
          }
        }
      });
      
      newDgConnection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed.');
        setIsTranscribing(false);
        setDgConnection(null);
        if (microphone) {
          microphone.mediaRecorder?.stop();
          microphone.stream?.getTracks().forEach(track => track.stop());
          setMicrophone(null);
        }
      });

      newDgConnection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram error:', error);
        
        // Attempt to restart transcription after a brief delay
        console.log('Will attempt to restart transcription in 3 seconds...');
        setTimeout(() => {
          if (isTranscribing) {
            console.log('Attempting to restart transcription after error');
            stopTranscription();
            setTimeout(() => {
              startTranscription();
            }, 1000);
          }
        }, 3000);
      });
      
      setDgConnection(newDgConnection);

    } catch (error) {
      console.error('Error starting microphone or Deepgram:', error);
      setIsTranscribing(false); // Ensure state is reset on error
      if (microphone?.mediaRecorder) microphone.mediaRecorder.stop();
      if (microphone?.stream) microphone.stream.getTracks().forEach(track => track.stop());
      setMicrophone(null);
      if(dgConnection) dgConnection.finish(); // Attempt to close connection
      setDgConnection(null);

    }
  }, [deepgramClient, socket, sessionId, dgConnection, microphone]); // Removed isTranscribing

  const stopTranscription = useCallback(() => {
    if (dgConnection) {
      dgConnection.finish(); // Finish sending and close
      // The 'close' event handler will do the rest of the cleanup.
    }
    if (microphone) {
      microphone.mediaRecorder?.stop();
      microphone.stream?.getTracks().forEach(track => track.stop());
      setMicrophone(null);
    }
    setIsTranscribing(false); // Explicitly set here too
    setUserTranscript('');
    clearTimeout(transcriptTimeoutRef.current);
  }, [dgConnection, microphone]);


  // End session
  const endSession = useCallback(async () => {
    stopTranscription(); // Stop transcription when session ends
    if (socket && sessionId) {
      socket.emit('end-session', { sessionId });
    }
    setSessionId(null);
    setMessages([]);
    setLivekitUrl(null);
    setLivekitToken(null);
    setIsLiveKitConnected(false);
    return true;
  }, [socket, sessionId, stopTranscription]);

  // sendMessage is now primarily for sending final transcripts from STT
  // or if you add a text input fallback.
  const sendMessage = useCallback((text) => {
    if (socket && sessionId && text.trim()) {
      // This could be called by startTranscription on final transcript,
      // or by a manual text input.
      // If called by STT, message is already added to `messages` array.
      // If manual, add it now:
      // setMessages(prev => [...prev, { sender: 'user', text }]);
      socket.emit('user-message', { sessionId, message: text });
    }
  }, [socket, sessionId]);

  const onLiveKitConnected = useCallback(() => {
    setIsLiveKitConnected(true);
    console.log('Connected to LiveKit room');
    // Automatically start transcription once LiveKit is connected
    // startTranscription(); // Consider if this should be user-initiated via a button
  }, []);

  const onLiveKitDisconnected = useCallback(() => {
    setIsLiveKitConnected(false);
    console.log('Disconnected from LiveKit room');
    stopTranscription(); // Stop transcription if LiveKit disconnects
  }, [stopTranscription]);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        messages,
        livekitUrl,
        livekitToken,
        isLiveKitConnected,
        isTranscribing,
        userTranscript, // Interim transcript for UI
        joinSession,
        endSession,
        sendMessage, // Can be used by STT callback or manual text input
        onConnected: onLiveKitConnected, // Renamed for clarity
        onDisconnected: onLiveKitDisconnected, // Renamed for clarity
        startTranscription,
        stopTranscription
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};