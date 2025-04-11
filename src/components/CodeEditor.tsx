import React, { useState, useRef, FC } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Box, TextField, Button, Typography, IconButton, Tooltip, useMediaQuery, useTheme, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import JSZip from 'jszip';
import OpenAI from 'openai';
import InfoIcon from '@mui/icons-material/Info';
import Autocomplete from '@mui/material/Autocomplete';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ComputerIcon from '@mui/icons-material/Computer';
import DeployDialog from './DeployDialog';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import prettier from 'prettier/standalone';
import babel from 'prettier/parser-babel';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';

interface CodeEditorProps {
  apiKey: string;
  onApiKeyChange: () => void;
}

type AppType = 'web' | 'mobile' | 'desktop' | 'api' | 'cli' | 'animation';
type DeploymentType = 'cloud' | 'local' | 'container' | 'serverless';

interface ConversationStep {
  userPrompt: string;
  aiResponse: string;
  timestamp: Date;
}

const CodeEditor: FC<CodeEditorProps> = ({ apiKey, onApiKeyChange }) => {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [appType, setAppType] = useState<AppType>('web');
  const [conversationHistory, setConversationHistory] = useState<ConversationStep[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [deploymentType, setDeploymentType] = useState<DeploymentType>('local');
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('');
  const [tabs, setTabs] = useState<Record<string, string>>({});
  const [previewKey, setPreviewKey] = useState(0);
  const [debugConsole, setDebugConsole] = useState<string[]>([]);

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const detectAppType = (prompt: string): AppType => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('mobile') || lowerPrompt.includes('app') || lowerPrompt.includes('ios') || lowerPrompt.includes('android')) {
      return 'mobile';
    } else if (lowerPrompt.includes('desktop') || lowerPrompt.includes('electron') || lowerPrompt.includes('native')) {
      return 'desktop';
    } else if (lowerPrompt.includes('api') || lowerPrompt.includes('backend') || lowerPrompt.includes('server')) {
      return 'api';
    } else if (lowerPrompt.includes('cli') || lowerPrompt.includes('command') || lowerPrompt.includes('terminal')) {
      return 'cli';
    }
    return 'web';
  };

  const getAppTypePrompt = (type: AppType): string => {
    switch (type) {
      case 'web':
        return 'Create a modern web application using React and TypeScript. Include proper component structure, state management, and styling.';
      case 'mobile':
        return 'Create a mobile application using React Native. Include proper navigation, state management, and native components.';
      case 'desktop':
        return 'Create a desktop application using Electron and React. Include proper window management, native features, and UI components.';
      case 'api':
        return 'Create a RESTful API using Node.js and Express. Include proper routing, middleware, and database integration.';
      case 'cli':
        return 'Create a command-line interface application using Node.js. Include proper argument parsing, commands, and help documentation.';
      case 'animation':
        return 'Create an animated video from a text story. Include scene transitions, character animations, and background effects.';
      default:
        return 'Create a modern web application using React and TypeScript.';
    }
  };

  const handleTabClick = (fileName: string) => {
    setActiveTab(fileName);
    setGeneratedCode(tabs[fileName] || '');
    setSelectedFile(fileName);
    setSelectedFileContent(tabs[fileName] || '');
  };

  const handleTabClose = (fileName: string) => {
    const newTabs = { ...tabs };
    delete newTabs[fileName];
    setTabs(newTabs);
    
    if (activeTab === fileName) {
      const remainingTabs = Object.keys(newTabs);
      setActiveTab(remainingTabs[0] || '');
      setGeneratedCode(remainingTabs[0] ? newTabs[remainingTabs[0]] : '');
      setSelectedFile(remainingTabs[0] || '');
      setSelectedFileContent(remainingTabs[0] ? newTabs[remainingTabs[0]] : '');
    }
  };

  const handleGenerateCode = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Add user prompt to conversation history
      setConversationHistory((prev: ConversationStep[]) => [...prev, {
        userPrompt: prompt,
        aiResponse: '',
        timestamp: new Date()
      }]);

      // Get the last few conversation steps for context
      const recentContext = conversationHistory.slice(-3).map((step: ConversationStep) => 
        `User: ${step.userPrompt}\nAI: ${step.aiResponse}`
      ).join('\n\n');

      const systemPrompt = `You are an AI coding assistant. The user is building a ${appType} application. 
Previous conversation context:
${recentContext}

Please generate the following files for the application:
${appType === 'web' ? `
1. public/index.html - The main HTML file with proper structure
2. public/styles.css - All CSS styles for the application
3. public/script.js - JavaScript functionality
` : appType === 'mobile' ? `
1. src/App.tsx - Main React Native component
2. src/styles.ts - Styles for the mobile app
3. src/components/ - Component files as needed
` : appType === 'desktop' ? `
1. src/main.ts - Main Electron application file
2. src/renderer.ts - Renderer process file
3. src/preload.ts - Preload script
` : appType === 'api' ? `
1. src/index.ts - Main API server file
2. src/routes.ts - API routes
3. src/config.ts - Configuration file
` : appType === 'cli' ? `
1. src/index.ts - Main CLI entry point
2. src/commands.ts - CLI commands
3. src/utils.ts - Utility functions
` : ''}

For each file, provide the content in a code block with the file path as a comment at the top.
Example:
${appType === 'web' ? `
// public/index.html
\`\`\`html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="styles.css">
    <script src="script.js" defer></script>
  </head>
  <body>
    <!-- Content here -->
  </body>
</html>
\`\`\`

// public/styles.css
\`\`\`css
/* Styles here */
\`\`\`

// public/script.js
\`\`\`javascript
// JavaScript code here
\`\`\`
` : appType === 'mobile' ? `
// src/App.tsx
\`\`\`typescript
import React from 'react';
import { View, Text } from 'react-native';

const App = () => {
  return (
    <View>
      <Text>Hello World</Text>
    </View>
  );
};

export default App;
\`\`\`

// src/styles.ts
\`\`\`typescript
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
\`\`\`
` : appType === 'desktop' ? `
// src/main.ts
\`\`\`typescript
import { app, BrowserWindow } from 'electron';

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
\`\`\`

// src/renderer.ts
\`\`\`typescript
import React from 'react';
import ReactDOM from 'react-dom';

const App = () => {
  return <div>Hello World</div>;
};

ReactDOM.render(<App />, document.getElementById('root'));
\`\`\`
` : appType === 'api' ? `
// src/index.ts
\`\`\`typescript
import express from 'express';
import routes from './routes';

const app = express();
app.use(express.json());
app.use('/api', routes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
\`\`\`

// src/routes.ts
\`\`\`typescript
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

export default router;
\`\`\`
` : appType === 'cli' ? `
// src/index.ts
\`\`\`typescript
import { Command } from 'commander';
import { setupCommands } from './commands';

const program = new Command();
setupCommands(program);
program.parse(process.argv);
\`\`\`

// src/commands.ts
\`\`\`typescript
export const setupCommands = (program: Command) => {
  program
    .command('start')
    .description('Start the application')
    .action(() => {
      console.log('Starting...');
    });
};
\`\`\`
` : ''}

Make sure to include all necessary code for a complete application.`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Generate code for: ${prompt}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const generatedContent = response.choices[0]?.message?.content?.trim() || '';
      
      // Parse the generated content to extract files
      const fileRegex = /\/\/\s*([^\n]+)\n```(?:typescript|javascript|html|css)?\n([\s\S]*?)```/g;
      let match;
      const newTabs: Record<string, string> = {};
      const newAdditionalFiles: Record<string, string> = {};
      
      while ((match = fileRegex.exec(generatedContent)) !== null) {
        const filePath = match[1].trim();
        const fileContent = match[2].trim();
        
        // Add the file if it hasn't been added yet
        if (!newTabs[filePath]) {
          newTabs[filePath] = fileContent;
          newAdditionalFiles[filePath] = fileContent;
        }
      }

      setTabs(newTabs);
      setAdditionalFiles(newAdditionalFiles);
      
      // Set the first file as active
      const firstFile = Object.keys(newTabs)[0];
      if (firstFile) {
        setActiveTab(firstFile);
        setGeneratedCode(newTabs[firstFile]);
        setSelectedFile(firstFile);
        setSelectedFileContent(newTabs[firstFile]);
      }

      // Update the last conversation step with AI's response
      setConversationHistory((prev: ConversationStep[]) => {
        const updated = [...prev];
        updated[updated.length - 1].aiResponse = generatedContent;
        return updated;
      });

      setTerminalOutput(prev => [...prev, `✅ Generated ${Object.keys(newTabs).length} files`]);
    } catch (err) {
      setError('Error generating code. Please check your API key and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAnimation = async () => {
    if (!prompt.trim()) {
      setError('Please enter a story to animate');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: "You are an AI animation generator. Create a sequence of scenes based on the provided story. Each scene should include detailed descriptions of characters, backgrounds, and animations."
          },
          {
            role: "user",
            content: `Create an animated sequence for this story: ${prompt}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const animationScript = response.choices[0]?.message?.content?.trim() || '';
      setGeneratedCode(animationScript);
      setTerminalOutput(prev => [...prev, '✅ Animation script generated successfully']);
    } catch (err) {
      setError('Error generating animation. Please check your API key and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFile = () => {
    const fileName = window.prompt('Enter the new file name (e.g., public/newfile.js):');
    if (fileName) {
      // Ensure the file is in the public directory
      const filePath = fileName.startsWith('public/') ? fileName : `public/${fileName}`;
      
      // Add to both tabs and additionalFiles
      setTabs(prev => ({ ...prev, [filePath]: '' }));
      setAdditionalFiles(prev => ({ ...prev, [filePath]: '' }));
      
      // Set as active tab
      setActiveTab(filePath);
      setGeneratedCode('');
      setSelectedFile(filePath);
      setSelectedFileContent('');
      
      setTerminalOutput(prev => [...prev, `✅ Created new file: ${filePath}`]);
    }
  };

  const handleEditFile = (fileName: string, content: string) => {
    setAdditionalFiles((prev: Record<string, string>) => ({ ...prev, [fileName]: content }));
  };

  const handleDownload = async () => {
    try {
      const zip = new JSZip();
      
      // Add all files from both tabs and additionalFiles
      for (const [path, content] of Object.entries({ ...tabs, ...additionalFiles })) {
        zip.file(path, content);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const element = document.createElement('a');
      element.href = URL.createObjectURL(content);
      element.download = `generated-${appType}-app.zip`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
      
      setTerminalOutput(prev => [...prev, '✅ Project downloaded successfully']);
    } catch (error) {
      console.error('Error creating zip file:', error);
      setTerminalOutput(prev => [...prev, `Error creating zip file: ${(error as Error).message}`]);
    }
  };

  const getProjectStructure = (type: AppType, code: string): Record<string, string> => {
    const baseStructure: Record<string, string> = {
      'package.json': JSON.stringify(getPackageJson(type), null, 2),
      'README.md': getReadmeContent(type),
      '.gitignore': getGitignore(),
    };

    switch (type) {
      case 'web':
        return {
          ...baseStructure,
          'src/App.tsx': code,
          'src/index.tsx': getWebIndex(),
          'src/styles.css': getCssTemplate(),
          'public/index.html': getHtmlTemplate(),
          'tsconfig.json': JSON.stringify(getTsConfig(), null, 2),
          'webpack.config.js': getWebpackConfig(),
        };
      case 'mobile':
        return {
          ...baseStructure,
          'App.tsx': code,
          'index.js': getMobileIndex(),
          'app.json': JSON.stringify(getAppJson(), null, 2),
          'babel.config.js': getBabelConfig(),
        };
      case 'desktop':
        return {
          ...baseStructure,
          'src/main.ts': code,
          'src/renderer.ts': getElectronRenderer(),
          'src/preload.ts': getElectronPreload(),
          'package.json': JSON.stringify(getElectronPackageJson(), null, 2),
        };
      case 'api':
        return {
          ...baseStructure,
          'src/index.ts': code,
          'src/routes.ts': getApiRoutes(),
          'src/config.ts': getApiConfig(),
          'tsconfig.json': JSON.stringify(getTsConfig(), null, 2),
        };
      case 'cli':
        return {
          ...baseStructure,
          'src/index.ts': code,
          'src/commands.ts': getCliCommands(),
          'src/utils.ts': getCliUtils(),
          'tsconfig.json': JSON.stringify(getTsConfig(), null, 2),
        };
      default:
        return baseStructure;
    }
  };

  const getGitignore = (): string => {
    return `node_modules/
dist/
build/
.env
.DS_Store
*.log
`;
  };

  const getWebIndex = (): string => {
    return `import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles.css';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);`;
  };

  const getMobileIndex = (): string => {
    return `import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);`;
  };

  const getAppJson = (): Record<string, any> => {
    return {
      name: "GeneratedApp",
      displayName: "Generated App"
    };
  };

  const getBabelConfig = (): string => {
    return `module.exports = {
      presets: ['module:metro-react-native-babel-preset'],
    };`;
  };

  const getWebpackConfig = (): string => {
    return `const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};`;
  };

  const getTsConfig = (): Record<string, any> => {
    return {
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noFallthroughCasesInSwitch: true,
        module: "esnext",
        moduleResolution: "node",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx"
      },
      include: ["src"]
    };
  };

  const getApiRoutes = (): string => {
    return `import express from 'express';
const router = express.Router();

// Add your routes here
router.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

export default router;`;
  };

  const getApiConfig = (): string => {
    return `export const config = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
};`;
  };

  const getCliCommands = (): string => {
    return `import { Command } from 'commander';

export const setupCommands = (program: Command) => {
  program
    .command('start')
    .description('Start the application')
    .action(() => {
      console.log('Starting application...');
    });

  return program;
};`;
  };

  const getCliUtils = (): string => {
    return `export const logger = {
  info: (message: string) => console.log(\`[INFO] \${message}\`),
  error: (message: string) => console.error(\`[ERROR] \${message}\`),
  warn: (message: string) => console.warn(\`[WARN] \${message}\`),
};`;
  };

  const getElectronPackageJson = (): Record<string, any> => {
    return {
      ...getPackageJson('desktop'),
      main: "dist/main.js",
      scripts: {
        ...getPackageJson('desktop').scripts,
        "start": "electron .",
        "build": "tsc",
        "watch": "tsc -w"
      }
    };
  };

  const getElectronRenderer = (): string => {
    return `import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);`;
  };

  const getElectronPreload = (): string => {
    return `const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel: string, func: Function) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});`;
  };

  const getMainFileName = (type: AppType): string => {
    switch (type) {
      case 'web': return 'src/App.tsx';
      case 'mobile': return 'App.tsx';
      case 'desktop': return 'src/main.ts';
      case 'api': return 'src/index.ts';
      case 'cli': return 'src/index.ts';
      default: return 'src/index.ts';
    }
  };

  const getPackageJson = (type: AppType): any => {
    const basePackage = {
      name: `generated-${type}-app`,
      version: "1.0.0",
      description: `Generated ${type} application`,
      main: getMainFileName(type),
      scripts: {
        start: getStartScript(type)
      },
      dependencies: getDependencies(type)
    };

    return basePackage;
  };

  const getStartScript = (type: AppType): string => {
    switch (type) {
      case 'web': return 'react-scripts start';
      case 'mobile': return 'react-native start';
      case 'desktop': return 'electron .';
      case 'api': return 'ts-node src/index.ts';
      case 'cli': return 'ts-node src/index.ts';
      default: return 'node src/index.js';
    }
  };

  const getDependencies = (type: AppType): Record<string, string> => {
    const baseDeps = {
      "typescript": "^4.9.5",
      "@types/node": "^18.15.11"
    };

    switch (type) {
      case 'web':
        return {
          ...baseDeps,
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "react-scripts": "5.0.1",
          "@types/react": "^18.0.33",
          "@types/react-dom": "^18.0.11"
        };
      case 'mobile':
        return {
          ...baseDeps,
          "react-native": "^0.72.4",
          "@types/react-native": "^0.72.1"
        };
      case 'desktop':
        return {
          ...baseDeps,
          "electron": "^25.1.0",
          "react": "^18.2.0",
          "react-dom": "^18.2.0"
        };
      case 'api':
        return {
          ...baseDeps,
          "express": "^4.18.2",
          "@types/express": "^4.17.17"
        };
      case 'cli':
        return {
          ...baseDeps,
          "commander": "^10.0.1",
          "@types/commander": "^2.12.2"
        };
      default:
        return baseDeps;
    }
  };

  const getReadmeContent = (type: AppType): string => {
    const baseContent = `# Generated ${type.charAt(0).toUpperCase() + type.slice(1)} Application

This application was generated using Prompt-to-App AI Coding Agent.

## How to Run

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Start the application:
\`\`\`bash
npm start
\`\`\`
`;

    switch (type) {
      case 'web':
        return baseContent + `
## Features
- React with TypeScript
- Modern UI components
- Responsive design
`;
      case 'mobile':
        return baseContent + `
## Features
- React Native
- Cross-platform support
- Native components
`;
      case 'desktop':
        return baseContent + `
## Features
- Electron
- Native desktop features
- Cross-platform support
`;
      case 'api':
        return baseContent + `
## Features
- Express.js
- TypeScript
- RESTful API
`;
      case 'cli':
        return baseContent + `
## Features
- Command-line interface
- Argument parsing
- Help documentation
`;
      default:
        return baseContent;
    }
  };

  const getHtmlTemplate = (): string => {
    return '';
  };

  const getCssTemplate = (): string => {
    return `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
  };

  const getReactNativeTemplate = (): string => {
    return `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const App = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to your React Native app!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default App;`;
  };

  const getElectronMain = (): string => {
    return `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});`;
  };

  const handleRun = () => {
    setIsRunning(true);
    setTerminalOutput(['Starting project...']);
    
    try {
      // Create a new worker to run the code
      const worker = new Worker(URL.createObjectURL(new Blob([`
        self.onmessage = function(e) {
          try {
            eval(e.data);
            self.postMessage({ type: 'output', data: 'Code executed successfully' });
          } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
          }
        };
      `], { type: 'text/javascript' })));

      worker.onmessage = (e) => {
        if (e.data.type === 'output') {
          setTerminalOutput(prev => [...prev, e.data.data]);
        } else if (e.data.type === 'error') {
          setTerminalOutput(prev => [...prev, `Error: ${e.data.data}`]);
        }
      };

      worker.postMessage(generatedCode);
    } catch (error) {
      setTerminalOutput(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setTerminalOutput(prev => [...prev, 'Project stopped']);
  };

  const handleDeploy = async () => {
    setIsDeployDialogOpen(true);
    setDeploymentLogs(['Starting deployment process...']);
    
    try {
      switch (deploymentType) {
        case 'cloud':
          await deployToCloud();
          break;
        case 'container':
          await deployToContainer();
          break;
        case 'serverless':
          await deployToServerless();
          break;
        case 'local':
        default:
          await deployLocally();
          break;
      }
    } catch (error: any) {
      setDeploymentLogs(prev => [...prev, `Deployment error: ${error.message || 'Unknown error occurred'}`]);
    }
  };

  const deployToCloud = async () => {
    setDeploymentLogs(prev => [...prev, 'Preparing cloud deployment...']);
    
    // Create a zip file of the project
    const zip = new JSZip();
    
    // Add all files from both tabs and additionalFiles
    for (const [path, content] of Object.entries({ ...tabs, ...additionalFiles })) {
      zip.file(path, content);
    }

    // Generate the zip file
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Create a form data object to send the zip file
    const formData = new FormData();
    formData.append('file', content, `generated-${appType}-app.zip`);
    formData.append('appType', appType);
    formData.append('deploymentType', 'cloud');

    // Here you would typically send the formData to your deployment service
    // For now, we'll simulate a successful deployment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setDeploymentLogs(prev => [...prev, '✅ Cloud deployment completed']);
  };

  const deployToContainer = async () => {
    setDeploymentLogs(prev => [...prev, 'Building container image...']);
    
    // Create a zip file of the project
    const zip = new JSZip();
    
    // Add all files from both tabs and additionalFiles
    for (const [path, content] of Object.entries({ ...tabs, ...additionalFiles })) {
      zip.file(path, content);
    }

    // Generate the zip file
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Create a form data object to send the zip file
    const formData = new FormData();
    formData.append('file', content, `generated-${appType}-app.zip`);
    formData.append('appType', appType);
    formData.append('deploymentType', 'container');

    // Here you would typically send the formData to your containerization service
    // For now, we'll simulate a successful deployment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setDeploymentLogs(prev => [...prev, '✅ Container deployment completed']);
  };

  const deployToServerless = async () => {
    setDeploymentLogs(prev => [...prev, 'Deploying to serverless platform...']);
    
    // Create a zip file of the project
    const zip = new JSZip();
    
    // Add all files from both tabs and additionalFiles
    for (const [path, content] of Object.entries({ ...tabs, ...additionalFiles })) {
      zip.file(path, content);
    }

    // Generate the zip file
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Create a form data object to send the zip file
    const formData = new FormData();
    formData.append('file', content, `generated-${appType}-app.zip`);
    formData.append('appType', appType);
    formData.append('deploymentType', 'serverless');

    // Here you would typically send the formData to your serverless platform
    // For now, we'll simulate a successful deployment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setDeploymentLogs(prev => [...prev, '✅ Serverless deployment completed']);
  };

  const deployLocally = async () => {
    setDeploymentLogs(prev => [...prev, 'Setting up local environment...']);
    
    // Create a zip file of the project
    const zip = new JSZip();
    
    // Add all files from both tabs and additionalFiles
    for (const [path, content] of Object.entries({ ...tabs, ...additionalFiles })) {
      zip.file(path, content);
    }

    // Generate the zip file
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Create a download link for the zip file
    const element = document.createElement('a');
    element.href = URL.createObjectURL(content);
    element.download = `generated-${appType}-app.zip`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
    
    setDeploymentLogs(prev => [...prev, '✅ Local environment ready - Project downloaded']);
  };

  const cleanGeneratedCode = (code: string): string => {
    // Extract content between code block markers
    const codeBlockRegex = /```(?:html|javascript|jsx|tsx|typescript)?\n([\s\S]*?)```/g;
    const matches = code.match(codeBlockRegex);
    
    if (matches && matches.length > 0) {
      // Get the last code block (most recent)
      const lastCodeBlock = matches[matches.length - 1];
      // Remove the code block markers and return the content
      return lastCodeBlock.replace(/```(?:html|javascript|jsx|tsx|typescript)?\n?/g, '').replace(/```$/g, '');
    }
    
    // If no code blocks found, return the original code
    return code;
  };

  const handleFileClick = (path: string, content: string) => {
    setSelectedFile(path);
    setSelectedFileContent(content);
    setGeneratedCode(content);
  };

  const handleFileSave = (path: string, content: string) => {
    // Update both tabs and additionalFiles to keep everything in sync
    setTabs(prev => ({ ...prev, [path]: content }));
    setAdditionalFiles(prev => ({ ...prev, [path]: content }));
    setTerminalOutput(prev => [...prev, `✅ File ${path} saved successfully`]);
    
    // If this is the active tab, update the generated code
    if (activeTab === path) {
      setGeneratedCode(content);
    }
  };

  const getPreviewContent = () => {
    switch (appType) {
      case 'web':
        const htmlContent = tabs['public/index.html'] || '';
        const cssContent = tabs['public/styles.css'] || '';
        const jsContent = tabs['public/script.js'] || '';

        // Clean the content to remove any markdown code block markers
        const cleanHtml = cleanGeneratedCode(htmlContent);
        const cleanCss = cleanGeneratedCode(cssContent);
        const cleanJs = cleanGeneratedCode(jsContent);

        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                ${getCssTemplate()}
                body { margin: 0; padding: 20px; }
                * { box-sizing: border-box; }
                ${cleanCss}
              </style>
            </head>
            <body>
              ${cleanHtml}
              <script>
                try {
                  ${cleanJs}
                } catch (error) {
                  console.error('Error executing script:', error);
                }
              </script>
            </body>
          </html>
        `;
      
      case 'mobile':
        const mobileContent = tabs['src/App.tsx'] || '';
        const mobileStyles = tabs['src/styles.ts'] || '';

        // Clean the content to remove any markdown code block markers
        const cleanMobileContent = cleanGeneratedCode(mobileContent);
        const cleanMobileStyles = cleanGeneratedCode(mobileStyles);

        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                  background: #f0f0f0;
                }
                .mobile-preview {
                  width: 375px;
                  height: 667px;
                  border: 12px solid #1a1a1a;
                  border-radius: 40px;
                  overflow: hidden;
                  position: relative;
                  margin: 20px auto;
                  background: #fff;
                  box-shadow: 0 0 20px rgba(0,0,0,0.2);
                }
                .mobile-content {
                  padding: 20px;
                  height: 100%;
                  overflow-y: auto;
                  background: #fff;
                }
                .notch {
                  position: absolute;
                  top: 0;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 150px;
                  height: 30px;
                  background: #1a1a1a;
                  border-bottom-left-radius: 20px;
                  border-bottom-right-radius: 20px;
                  z-index: 1;
                }
                ${cleanMobileStyles}
              </style>
            </head>
            <body>
              <div class="mobile-preview">
                <div class="notch"></div>
                <div class="mobile-content">
                  ${cleanMobileContent}
                </div>
              </div>
            </body>
          </html>
        `;
      
      case 'desktop':
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                }
                .desktop-preview {
                  width: 800px;
                  height: 600px;
                  border: 1px solid #ccc;
                  border-radius: 8px;
                  overflow: hidden;
                  position: relative;
                  margin: 20px auto;
                  background: #fff;
                }
                .desktop-content {
                  padding: 20px;
                  height: 100%;
                  overflow-y: auto;
                }
              </style>
            </head>
            <body>
              <div class="desktop-preview">
                <div class="desktop-content">
                  <h2>Desktop App Preview</h2>
                  <p>This is a preview of your Electron app. The actual app would run as a native desktop application.</p>
                </div>
              </div>
            </body>
          </html>
        `;
      
      case 'api':
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                }
                .api-preview {
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                  background: #f5f5f5;
                  border-radius: 8px;
                }
                .endpoint {
                  background: #fff;
                  padding: 15px;
                  margin: 10px 0;
                  border-radius: 4px;
                  border-left: 4px solid #1976d2;
                }
              </style>
            </head>
            <body>
              <div class="api-preview">
                <h2>API Documentation</h2>
                <div class="endpoint">
                  <h3>GET /api</h3>
                  <p>Base endpoint that returns API status</p>
                </div>
                <div class="endpoint">
                  <h3>GET /api/routes</h3>
                  <p>List all available API routes</p>
                </div>
              </div>
            </body>
          </html>
        `;
      
      case 'cli':
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: monospace;
                  background: #1e1e1e;
                  color: #fff;
                }
                .cli-preview {
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                  background: #2d2d2d;
                  border-radius: 8px;
                }
                .command {
                  margin: 10px 0;
                  padding: 10px;
                  background: #3d3d3d;
                  border-radius: 4px;
                }
                .prompt {
                  color: #4CAF50;
                }
              </style>
            </head>
            <body>
              <div class="cli-preview">
                <h2>CLI Commands</h2>
                <div class="command">
                  <span class="prompt">$</span> npm start
                </div>
                <div class="command">
                  <span class="prompt">$</span> npm run build
                </div>
              </div>
            </body>
          </html>
        `;
      
      default:
        return '';
    }
  };

  const handleRefreshPreview = () => {
    // Force the iframe to reload by updating the key
    setPreviewKey(prev => prev + 1);
    
    // Update the preview content with the latest file content
    const htmlContent = tabs['public/index.html'] || '';
    const cssContent = tabs['public/styles.css'] || '';
    const jsContent = tabs['public/script.js'] || '';

    // Clean the content to remove any markdown code block markers
    const cleanHtml = cleanGeneratedCode(htmlContent);
    const cleanCss = cleanGeneratedCode(cssContent);
    const cleanJs = cleanGeneratedCode(jsContent);

    // Update the preview content
    const previewContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${getCssTemplate()}
            body { margin: 0; padding: 20px; }
            * { box-sizing: border-box; }
            ${cleanCss}
          </style>
        </head>
        <body>
          ${cleanHtml}
          <script>
            try {
              ${cleanJs}
            } catch (error) {
              console.error('Error executing script:', error);
            }
          </script>
        </body>
      </html>
    `;

    // Update the iframe's srcDoc
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.srcdoc = previewContent;
    }
  };

  const addDebugMessage = (message: string) => {
    setDebugConsole(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'row',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <Box sx={{ 
        width: '15%', 
        height: '100%', 
        borderLeft: 1, 
        borderColor: 'divider',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '180px',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <img src="../../assets/image.png" alt="AppyPie.AI" style={{ maxWidth: '100px', height: '100px', borderRadius: '50%' }} />
        </Box>
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexShrink: 0
        }}>
          <IconButton onClick={handleAddFile} size="small" sx={{ ml: 'auto', color: '#333' }}>
            <AddIcon />
          </IconButton>
          <IconButton onClick={handleDeploy} size="small" sx={{ ml: 'auto', color: '#333' }}>
            <CloudUploadIcon />
          </IconButton>
          <Tooltip title="Download Code">
            <IconButton
              color="primary"
              onClick={handleDownload}
              disabled={!Object.keys(tabs).length && !Object.keys(additionalFiles).length}
              size="small"
              sx={{ 
                minWidth: '40px',
                height: '40px',
                color: '#666666',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  color: '#1976d2'
                }
              }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Change API Key">
            <IconButton
              color="primary"
              onClick={onApiKeyChange}
              size="small"
              sx={{ 
                minWidth: '40px',
                height: '40px',
                color: '#666666',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  color: '#1976d2'
                }
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ 
          p: 1, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexShrink: 0
        }}>
          <FolderIcon sx={{ color: '#666666' }} />
          <Typography color="black" variant="subtitle1">Project Structure</Typography>
        </Box>
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 2
        }}>
          {Object.keys(tabs).length > 0 || Object.keys(additionalFiles).length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries({ ...tabs, ...additionalFiles }).map(([path, content]) => {
                // Show all generated files
                return (
                  <Box key={path} sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    pl: path.split('/').length * 2,
                    '&:hover': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}>
                    <InsertDriveFileIcon sx={{ fontSize: 16, color: '#666666' }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#333333',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        flex: 1
                      }}
                      onClick={() => handleFileClick(path, content)}
                    >
                      {path.split('/').pop()}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: '#666666'
            }}>
              <FolderIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="body1">
                No files generated yet
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Generate code to see files here
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ 
        width: '85%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden', 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <Box sx={{ 
            height: '70%',
            borderBottom: 1,
            borderColor: 'divider',
            position: 'relative',
            overflow: 'auto',
            flex: 1,
            paddingTop: '60px',
            paddingBottom: 0
          }}>
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              backgroundColor: '#1e1e1e',
              width: '100%',
              borderBottom: '1px solid #333'
            }}>
              <Box sx={{ 
                display: 'flex', 
                gap: 1,
                overflowX: 'auto',
                flex: 1
              }}>
                {Object.keys(tabs).map((fileName) => (
                  <Box
                    key={fileName}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      backgroundColor: activeTab === fileName ? '#333' : 'transparent',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#333'
                      }
                    }}
                    onClick={() => handleTabClick(fileName)}
                  >
                    <Typography variant="caption" sx={{ color: '#fff' }}>
                      {fileName.split('/').pop()}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabClose(fileName);
                      }}
                      sx={{ 
                        color: '#fff',
                        padding: '2px',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
              <Tooltip title="Save File">
                <IconButton
                  size="small"
                  onClick={() => {
                    if (activeTab) {
                      handleFileSave(activeTab, generatedCode);
                    }
                  }}
                  sx={{ 
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'row',
              overflow: 'hidden'
            }}>
              <Box sx={{
                width: '50%',
                height: '100%',
                display: 'flex',
                overflow: 'hidden'
              }}>
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  value={generatedCode}
                  theme="vs-dark"
                  options={{
                    readOnly: false,
                    minimap: { enabled: false },
                    padding: { top: 40 },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    matchBrackets: 'always',
                    autoClosingBrackets: 'always',
                    formatOnPaste: true,
                    formatOnType: true,
                    tabSize: 2,
                    copyWithSyntaxHighlighting: true,
                    contextmenu: true,
                    quickSuggestions: true,
                    folding: true,
                    dragAndDrop: true,
                    links: true,
                    mouseWheelZoom: true
                  }}
                  onChange={(value) => setGeneratedCode(value || '')}
                  onMount={(editor) => {
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                      // Save functionality
                      console.log('Saving code...');
                    });
                  }}
                />
              </Box>  
              <Box sx={{
                width: '50%',
                height: '100%',
                display: 'flex',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                borderLeft: '1px solid #333',
                flexDirection: 'column'
              }}>
                <Box sx={{
                  p: 1,
                  backgroundColor: '#1e1e1e',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderBottom: '1px solid #333'
                }}>
                  <Typography variant="caption" sx={{ color: '#fff' }}>
                    Preview
                  </Typography>
                  <Tooltip title="Refresh Preview">
                    <IconButton
                      size="small"
                      onClick={handleRefreshPreview}
                      sx={{ 
                        color: '#fff',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                      }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  <iframe
                    key={previewKey}
                    srcDoc={getPreviewContent()}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </Box>
              </Box>
            </Box>
          </Box>
          <Box
            ref={terminalRef}
            sx={{
              height: '20%',
              bgcolor: '#1e1e1e',
              color: '#fff',
              p: 2,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '14px',
              borderTop: '1px solid #333',
              whiteSpace: 'pre-wrap',
              display: 'flex',
              flexDirection: 'row',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px'
              },
              '&::-webkit-scrollbar-track': {
                background: '#2d2d2d'
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#666',
                borderRadius: '4px',
                '&:hover': {
                  background: '#888'
                }
              }
            }}
          >
            <Box sx={{ 
              width: '50%', 
              borderRight: '1px solid #333',
              pr: 2
            }}>
              <Typography sx={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>Terminal Output</Typography>
              {terminalOutput.map((line, index) => (
                <Typography 
                  key={index} 
                  sx={{ 
                    color: line.startsWith('Error:') ? '#ff4444' : '#fff',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    lineHeight: 1.5
                  }}
                >
                  {line}
                </Typography>
              ))}
            </Box>
            <Box sx={{ 
              width: '50%',
              pl: 2
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 1
              }}>
                <Typography sx={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>Debug Console</Typography>
                <Tooltip title="Clear Console">
                  <IconButton
                    size="small"
                    onClick={() => setDebugConsole([])}
                    sx={{ 
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              {debugConsole.map((message, index) => (
                <Typography 
                  key={index} 
                  sx={{ 
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    lineHeight: 1.5
                  }}
                >
                  {message}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          width: '100%',
          backgroundColor: '#f5f5f5',
          flexShrink: 0
        }}>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
            <Box sx={{ width: '100%', maxWidth: '1200px' }}>
              <TextField
                fullWidth
                label="Enter your prompt"
                variant="outlined"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                error={!!error}
                helperText={error}
                multiline
                rows={3}
                autoFocus={!prompt}
                placeholder="Type your prompt here to generate code. For example: 'Create a React application with a login form and dashboard'"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    padding: '8px',
                    backgroundColor: '#ffffff',
                    '& textarea': {
                      minHeight: '80px !important',
                      maxHeight: '120px !important',
                      color: '#000000'
                    },
                    '& .MuiInputLabel-root': {
                      color: '#000000'
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: '#666666',
                      opacity: 1,
                      visibility: 'visible'
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#666666'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#000000'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2'
                    }
                  }
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: '180px', flexShrink: 0 }}>
              <FormControl sx={{ width: '100%', mt: '8px' }}>
                <InputLabel sx={{ color: '#000000' }}>Application Type</InputLabel>
                <Select
                  value={appType}
                  label="Application Type"
                  onChange={(e) => setAppType(e.target.value as AppType)}
                  sx={{
                    backgroundColor: '#ffffff',
                    '& .MuiSelect-select': {
                      color: '#000000'
                    }
                  }}
                >
                  <MenuItem value="web">Web Application</MenuItem>
                  <MenuItem value="mobile">Mobile Application</MenuItem>
                  <MenuItem value="desktop">Desktop Application</MenuItem>
                  <MenuItem value="api">API Service</MenuItem>
                  <MenuItem value="cli">CLI Tool</MenuItem>
                  <MenuItem value="animation">Animation Video</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="primary"
                onClick={appType === 'animation' ? handleGenerateAnimation : handleGenerateCode}
                disabled={isLoading || !prompt.trim()}
                size="large"
                sx={{ 
                  height: '40px',
                  width: '100%',
                  backgroundColor: '#1976d2',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#1565c0'
                  }
                }}
              >
                {isLoading ? 'Generating...' : (appType === 'animation' ? 'Generate Animation' : 'Generate')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <DeployDialog
        open={isDeployDialogOpen}
        onClose={() => setIsDeployDialogOpen(false)}
        deploymentType={deploymentType}
        setDeploymentType={setDeploymentType}
        deploymentLogs={deploymentLogs}
        appType={appType}
      />
    </Box>
  );
};

export default CodeEditor; 