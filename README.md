# MCDA Chat Interface Setup

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install react-markdown react-syntax-highlighter
   ```

2. **Start Ollama** (in separate terminal):
   ```bash
   ollama serve
   ```

3. **Verify Qwen3 Model** (in separate terminal):
   ```bash
   ollama list
   # Should show qwen3:latest in the list
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Open Browser**:
   - Navigate to `http://localhost:5173`
   - You should see the MCDA Chat Interface

## Features Included

- ✅ **Qwen3 Integration**: Optimized for qwen3:latest model
- ✅ **Real-time Streaming**: Live response streaming from Ollama
- ✅ **Tool Support**: Ready for MCP server integration
- ✅ **Thinking Mode**: Displays Qwen3's reasoning process
- ✅ **Connection Management**: Auto-detect Ollama connection
- ✅ **Model Selection**: Switch between available models
- ✅ **Performance Metrics**: Tokens/sec, timing, metadata
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Responsive Design**: Mobile and desktop support
- ✅ **Dark Theme**: Professional dark mode interface

## Troubleshooting

### Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check Ollama is accessible: `curl http://localhost:11434/api/version`
- Verify models are available: `ollama list`

### Missing Dependencies
```bash
npm install react-markdown react-syntax-highlighter
```

### Model Issues
- Pull Qwen3: `ollama pull qwen3:latest`
- Check model status: `ollama ps`

## Project Structure
```
src/
├── components/
│   ├── ChatInterface/
│   │   ├── ChatContainer.jsx       # Main chat component
│   │   ├── MessageList.jsx         # Message display
│   │   ├── MessageBubble.jsx       # Individual messages
│   │   ├── MessageInput.jsx        # Input field
│   │   ├── ConnectionStatus.jsx    # Connection indicator
│   │   ├── TypingIndicator.jsx     # Typing animation
│   │   └── ChatContainer.css       # Styles
│   ├── ModelSelector/
│   │   └── ModelSelector.jsx       # Model dropdown
│   └── ErrorBoundary/
│       └── ErrorBoundary.jsx       # Error handling
├── context/
│   └── ChatContext.js              # Global state management
├── hooks/
│   └── useStreamingChat.js         # Chat logic
├── utils/
│   └── ollamaApi.js                # API integration
└── App.jsx                         # Main app component
```