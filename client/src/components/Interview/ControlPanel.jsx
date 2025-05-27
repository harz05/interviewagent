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
  console.log('--- ControlPanel RENDERED ---', new Date().toISOString());
  
  const navigate = useNavigate();
  const {
    endSession,
    isTranscribing,
    userTranscript,
    startTranscription,
    stopTranscription
  } = useSession();
  const { localParticipant } = useLocalParticipant();
  
  // Log transcription status and user transcript
  React.useEffect(() => {
    console.log('ControlPanel: isTranscribing =', isTranscribing);
    if (userTranscript) {
      console.log('ControlPanel: userTranscript =',
                  userTranscript.substring(0, 50) +
                  (userTranscript.length > 50 ? '...' : ''));
    }
  }, [isTranscribing, userTranscript]);
  
  // Log local participant status
  React.useEffect(() => {
    if (localParticipant) {
      console.log('ControlPanel: localParticipant status -',
                  'mic:', localParticipant.isMicrophoneEnabled ? 'ON' : 'OFF',
                  'camera:', localParticipant.isCameraEnabled ? 'ON' : 'OFF');
    } else {
      console.log('ControlPanel: localParticipant not available');
    }
  }, [localParticipant?.isMicrophoneEnabled, localParticipant?.isCameraEnabled]);

  const handleEndInterview = async () => {
    await endSession();
    navigate('/');
  };

  const toggleAudio = async () => {
    if (localParticipant) {
      const newMicState = !localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(newMicState);
      // If using LiveKit's mic state to control Deepgram, adjust here:
      // if (newMicState && !isTranscribing) {
      //   startTranscription();
      // } else if (!newMicState && isTranscribing) {
      //   stopTranscription();
      // }
      // For now, transcription is started/stopped by InterviewPage based on LiveKit connection.
      // This toggle only mutes/unmutes the track sent to LiveKit. Deepgram continues if active.
    }
  };
  
  // Manual start/stop for transcription if needed, otherwise it's automatic from InterviewPage
  const handleToggleTranscription = () => {
    if (isTranscribing) {
      stopTranscription();
    } else {
      startTranscription();
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

      {/* Transcription Status Display */}
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <Typography variant="caption" color={isTranscribing ? "green" : "textSecondary"}>
          {isTranscribing ? "Listening..." : "Microphone off / Not transcribing"}
        </Typography>
        {isTranscribing && userTranscript && (
          <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', color: 'text.secondary', maxHeight: '3em', overflow: 'hidden' }}>
            Interim: {userTranscript}
          </Typography>
        )}
        
        {/* Uncomment this button for manual control of transcription during testing */}
        <Button onClick={handleToggleTranscription} size="small" sx={{ml: 2, mt: 1}}>
          {isTranscribing ? "Stop Listening" : "Start Listening"}
        </Button>
      </Box>
    </Paper>
  );
};

export default ControlPanel;