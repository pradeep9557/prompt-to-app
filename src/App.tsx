import { useState } from 'react'
import { ThemeProvider, createTheme } from '@mui/material'
import CssBaseline from '@mui/material/CssBaseline'
import ApiKeyInput from './components/ApiKeyInput'
import CodeEditor from './components/CodeEditor'
import './App.css'
import { Box } from '@mui/material'

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
})

function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem('openai-api-key')
  })

  const handleApiKeyChange = () => {
    localStorage.removeItem('openai-api-key')
    setApiKey(null)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {!apiKey ? (
          <ApiKeyInput onApiKeySet={setApiKey} />
        ) : (
          <CodeEditor apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
        )}
      </Box>
    </ThemeProvider>
  )
}

export default App
