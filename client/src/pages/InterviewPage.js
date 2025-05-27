// src/pages/InterviewPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Container } from '@mui/material';
import { LiveKitRoom } from '@livekit/components-react';
import VideoPanel from '../components/Interview/VideoPanel';
import ChatPanel from '../components/Interview/ChatPanel';
import ControlPanel from '../components/Interview/ControlPanel';
import { useSession } from '../contexts/SessionContext';
import { getInterviewSession } from '../services/interviewService';

const InterviewPage = () => {
  console.log('--- InterviewPage RENDERED / REMOUNTED ---', new Date().toISOString());
  
  const { sessionId } = useParams();
  const {
    joinSession,
    livekitUrl,
    livekitToken,
    onConnected, // This is now onLiveKitConnected in context
    onDisconnected, // This is now onLiveKitDisconnected in context
    isLiveKitConnected, // New state from context
    startTranscription,
    stopTranscription,
    // isTranscribing, // Can be used for UI feedback
    // userTranscript, // Can be used for UI feedback
  } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Store stopTranscription in a ref to stabilize it for effect cleanup
  const stopTranscriptionRef = React.useRef(stopTranscription);
  React.useEffect(() => {
    stopTranscriptionRef.current = stopTranscription;
  }, [stopTranscription]);

  useEffect(() => {
    const setupSession = async () => {
      try {
        const sessionData = await getInterviewSession(sessionId);
        await joinSession(sessionData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to setup interview session:', err);
        setError('Failed to join interview session');
        setLoading(false);
      }
    };

    setupSession();

    // Cleanup transcription on component unmount
    return () => {
      console.log('InterviewPage unmounting, stopping transcription.');
      // Use the ref version to avoid dependency on stopTranscription
      stopTranscriptionRef.current();
    };
  }, [sessionId, joinSession]); // Removed stopTranscription from dependency array

  // Effect to start transcription when LiveKit is connected
  // Use a ref to track if we've already started transcription for this connection
  const hasStartedTranscriptionRef = React.useRef(false);
  
  useEffect(() => {
    if (isLiveKitConnected && !hasStartedTranscriptionRef.current) {
      console.log('LiveKit connected, attempting to start transcription.');
      startTranscription();
      hasStartedTranscriptionRef.current = true;
    } else if (!isLiveKitConnected) {
      // Reset the flag when disconnected
      hasStartedTranscriptionRef.current = false;
      console.log('LiveKit not connected/disconnected, transcription will be stopped by context.');
    } else {
      console.log('LiveKit connected but transcription already started.');
    }
  }, [isLiveKitConnected, startTranscription]);


  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ height: '100vh', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          Loading interview session...
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ height: '100vh', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          Error: {error}
        </Box>
      </Container>
    );
  }

  if (!livekitUrl || !livekitToken) {
    return (
      <Container maxWidth="xl" sx={{ height: '100vh', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          Waiting for connection details...
        </Box>
      </Container>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={livekitToken}
      serverUrl={livekitUrl}
      // onConnected and onDisconnected from useSession are already wired up internally in SessionContext
      // to call the LiveKitRoom's respective event handlers and then call our onLiveKitConnected/Disconnected
      // So, we pass the context's onConnected/onDisconnected here which are actually named onLiveKitConnected/Disconnected in the context
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      connect={true}
      style={{ height: '100vh' }}
    >
      <Container maxWidth="xl" sx={{ height: '100vh', py: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          <Grid item xs={12} md={9} sx={{ height: { xs: '50%', md: '100%' } }}>
  <VideoPanel />
</Grid>
<Grid item xs={12} md={3} sx={{ height: { xs: '50%', md: '100%' } }}>
  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
      <ChatPanel />
    </Box>
    <ControlPanel />
  </Box>
</Grid>

        </Grid>
      </Container>
    </LiveKitRoom>
  );
};

export default InterviewPage;