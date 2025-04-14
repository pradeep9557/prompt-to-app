# Prompt-to-App AI Code Generator

A powerful AI-powered code generation tool that converts natural language prompts into functional applications. Built with React, TypeScript, and OpenAI's GPT models.

## 🚀 Features

- **Multi-Platform Support**: Generate code for web, mobile, desktop, API, and CLI applications
- **Real-time Preview**: Live preview of generated applications
- **Code Editor**: Built-in Monaco editor with syntax highlighting and auto-completion
- **Project Management**: File system view and tab-based code editing
- **Debug Console**: Integrated terminal and debug console for development
- **Deployment Options**: Support for cloud, container, serverless, and local deployment
- **File Generation**: Automatic generation of project structure and configuration files

## 📁 Project Structure

```
prompt-to-app/
├── public/                  # Public assets
│   ├── index.html          # Main HTML file
│   ├── styles.css          # Global styles
│   └── script.js           # Main JavaScript file
├── src/                    # Source code
│   ├── components/         # React components
│   │   ├── CodeEditor.tsx  # Main editor component
│   │   └── DeployDialog.tsx# Deployment dialog
│   ├── App.tsx            # Root component
│   └── index.tsx          # Application entry point
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md             # Project documentation
```

## 🛠️ Technologies Used

- **Frontend**: React, TypeScript, Material-UI
- **Code Editor**: Monaco Editor
- **AI Integration**: OpenAI GPT API
- **Build Tools**: Vite, TypeScript
- **Deployment**: JSZip for project packaging

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/prompt-to-app.git
   cd prompt-to-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 💻 Usage

1. **Select Application Type**
   - Choose from web, mobile, desktop, API, or CLI applications

2. **Enter Your Prompt**
   - Describe the application you want to generate in natural language

3. **Generate Code**
   - Click the "Generate" button to create your application

4. **Preview and Edit**
   - View the generated code in the editor
   - See the live preview of your application
   - Make modifications as needed

5. **Save and Deploy**
   - Save your changes
   - Choose a deployment option (cloud, container, serverless, or local)

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Generation Process

1. User enters a prompt describing the desired application
2. System determines the appropriate application type
3. OpenAI GPT generates the initial code
4. Code is parsed and organized into the project structure
5. Files are created and displayed in the editor
6. Preview is updated to show the generated application

## 📝 File Generation

The system automatically generates the following files based on the application type:

### Web Application
- `public/index.html` - Main HTML structure
- `public/styles.css` - Global styles
- `public/script.js` - JavaScript functionality

### Mobile Application
- `src/App.tsx` - Main React Native component
- `src/styles.ts` - Mobile app styles
- `src/components/` - Additional components

### Desktop Application
- `src/main.ts` - Main Electron process
- `src/renderer.ts` - Renderer process
- `src/preload.ts` - Preload script

### API Service
- `src/index.ts` - Main server file
- `src/routes.ts` - API routes
- `src/config.ts` - Configuration

### CLI Tool
- `src/index.ts` - Main CLI entry point
- `src/commands.ts` - CLI commands
- `src/utils.ts` - Utility functions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for their powerful GPT models
- Monaco Editor for the code editing experience
- Material-UI for the beautiful UI components
- The open-source community for their invaluable contributions
