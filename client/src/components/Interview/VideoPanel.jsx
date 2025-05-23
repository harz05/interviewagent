// src/components/Interview/VideoPanel.jsx
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  useConnectionState,
  ConnectionState
} from '@livekit/components-react';

const VideoPanel = () => {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  // Check if the connection is still establishing
  if (connectionState === ConnectionState.Connecting) {
    return (
      <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6">Connecting to interview session...</Typography>
      </Paper>
    );
  }

  // Check if the connection failed
  if (connectionState === ConnectionState.Disconnected || connectionState === ConnectionState.Failed) {
    return (
      <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" color="error">
          Connection to interview session failed. Please refresh and try again.
        </Typography>
      </Paper>
    );
  }

  // Get the first remote participant (AI interviewer)
  const aiParticipant = remoteParticipants[0];

  return (
    <Paper sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>AI Interviewer</Typography>
        <Box sx={{ flexGrow: 1, bgcolor: 'grey.800', borderRadius: 1, overflow: 'hidden' }}>
          {aiParticipant && aiParticipant.videoTracks.size > 0 ? (
            <VideoTrack 
              participant={aiParticipant}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Box 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <Typography variant="h6">AI Interviewer</Typography>
            </Box>
          )}
        </Box>
      </Box>
      
      <Box sx={{ height: '30%' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>You</Typography>
        <Box sx={{ height: '100%', bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
          {localParticipant && localParticipant.isCameraEnabled && localParticipant.videoTrack ? (
            <VideoTrack 
              participant={localParticipant}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Box 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Typography>Camera is off</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default VideoPanel;