import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import { useSession } from '../../contexts/SessionContext';

const ChatPanel = () => {
  console.log('--- ChatPanel RENDERED ---', new Date().toISOString());
  
  const { messages } = useSession();
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    console.log('ChatPanel: messages updated, count =', messages.length);
    if (messages.length > 0) {
      console.log('ChatPanel: last message =',
                  'sender:', messages[messages.length-1].sender,
                  'text:', messages[messages.length-1].text.substring(0, 50) +
                         (messages[messages.length-1].text.length > 50 ? '...' : ''));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Paper sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Interview Transcript</Typography>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List>
          {messages.map((message, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={message.sender === 'ai' ? 'AI Interviewer' : 'You'}
                  secondary={message.text}
                  primaryTypographyProps={{
                    fontWeight: 'bold',
                    color: message.sender === 'ai' ? 'primary.main' : 'secondary.main'
                  }}
                  secondaryTypographyProps={{
                    style: { whiteSpace: 'pre-wrap' }
                  }}
                />
              </ListItem>
              {index < messages.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Box>
    </Paper>
  );
};

export default ChatPanel;