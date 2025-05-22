import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  TextField, 
  Paper 
} from '@mui/material';
import { motion } from 'framer-motion';
import { startInterview } from '../services/interviewService';

const HomePage = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartInterview = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const { sessionId } = await startInterview(name);
      navigate(`/interview/${sessionId}`);
    } catch (error) {
      console.error('Failed to start interview:', error);
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h2" component="h1" gutterBottom>
            AI Interview Agent
          </Typography>
          <Typography variant="h5" sx={{ mb: 4 }}>
            Practice your interview skills with our AI interviewer
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Paper 
            elevation={3} 
            sx={{ p: 4, maxWidth: 500, mx: 'auto' }}
          >
            <form onSubmit={handleStartInterview}>
              <TextField
                fullWidth
                label="Your Name"
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                margin="normal"
                required
              />
              <Button 
                type="submit"
                variant="contained" 
                size="large"
                disabled={loading}
                sx={{ mt: 2 }}
                fullWidth
              >
                {loading ? 'Starting...' : 'Start Interview'}
              </Button>
            </form>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default HomePage;