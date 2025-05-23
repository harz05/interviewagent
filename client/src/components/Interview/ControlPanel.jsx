// src/components/Interview/ControlPanel.jsx
import React from 'react';
import { Box, Paper, IconButton, Button, Typography } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import { useNavigate } from 'react-router-dom';
import { useLocalParticipant } from '@livekit/components-react';
import { useSession } from '../../contexts/SessionContext';

const ControlPanel = () => {
  const navigate = useNavigate();
  const { endSession } = useSession();
  const { localParticipant } = useLocalParticipant();

  const handleEndInterview = async () => {
    await endSession();
    navigate('/');
  };

  const toggleAudio = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    }
  };

  const toggleVideo = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
    }
  };

  const isAudioEnabled = localParticipant?.isMicrophoneEnabled ?? false;
  const isVideoEnabled = localParticipant?.isCameraEnabled ?? false;

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">Interview Controls</Typography>
        
        <Box>
          <IconButton 
            onClick={toggleAudio} 
            color={isAudioEnabled ? 'primary' : 'default'}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
          
          <IconButton 
            onClick={toggleVideo} 
            color={isVideoEnabled ? 'primary' : 'default'}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            sx={{ mx: 1 }}
          >
            {isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
          
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleEndInterview}
          >
            End Interview
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default ControlPanel;