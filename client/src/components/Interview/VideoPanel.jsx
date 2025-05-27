// src/components/Interview/VideoPanel.jsx
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  useTracks,
  useRemoteParticipants,
  VideoTrack,
  useConnectionState,
  ConnectionState
} from '@livekit/components-react';
import { Track } from 'livekit-client';

const VideoPanel = () => {
  console.log('--- VideoPanel RENDERED ---', new Date().toISOString());
  
  const connectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();
  console.log('VideoPanel: connectionState =', connectionState,
              'remoteParticipants count =', remoteParticipants.length);
  
  const localTracks = useTracks([Track.Source.Camera]);
  const localVideoTrack = localTracks.find(t => t.publication.source === Track.Source.Camera);

  if (connectionState === ConnectionState.Connecting) {
    return (
      <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6">Connecting to interview session...</Typography>
      </Paper>
    );
  }

  if (connectionState === ConnectionState.Disconnected || connectionState === ConnectionState.Failed) {
    return (
      <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" color="error">
          Connection to interview session failed. Please refresh and try again.
        </Typography>
      </Paper>
    );
  }

  const aiParticipant = remoteParticipants[0];
  
  // Log AI participant details if available
  if (aiParticipant) {
    console.log('VideoPanel: AI participant found:',
                'identity =', aiParticipant.identity,
                'videoTracks =', aiParticipant.videoTracks ?
                  `${aiParticipant.videoTracks.size} tracks` : 'undefined');
  } else {
    console.log('VideoPanel: No AI participant found in remoteParticipants');
  }

  return (
    <Paper sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>AI Interviewer</Typography>
        <Box sx={{ flexGrow: 1, bgcolor: 'grey.800', borderRadius: 1, overflow: 'hidden' }}>
          {aiParticipant && aiParticipant.videoTracks && aiParticipant.videoTracks.size > 0 ? (
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
          {localVideoTrack ? (
            <VideoTrack
              trackRef={localVideoTrack}
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
