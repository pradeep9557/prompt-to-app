import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

interface ApiKeyInputProps {
  onApiKeySet: (apiKey: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }
    localStorage.setItem('openai-api-key', apiKey);
    onApiKeySet(apiKey);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 500,
          width: '100%',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Prompt-to-App
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Please enter your OpenAI API key to get started
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="OpenAI API Key"
            variant="outlined"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            error={!!error}
            helperText={error}
            margin="normal"
            type="password"
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            Continue
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default ApiKeyInput; 