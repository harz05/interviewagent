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
  const { sessionId } = useParams();
  const { 
    joinSession, 
    livekitUrl, 
    livekitToken, 
    onConnected, 
    onDisconnected 
  } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  }, [sessionId, joinSession]);

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
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      connect={true}
      style={{ height: '100vh' }}
    >
      <Container maxWidth="xl" sx={{ height: '100vh', py: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          <Grid item xs={12} md={8} sx={{ height: { xs: '50%', md: '100%' } }}>
            <VideoPanel />
          </Grid>
          <Grid item xs={12} md={4} sx={{ height: { xs: '50%', md: '100%' } }}>
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