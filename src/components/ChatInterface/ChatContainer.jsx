// src/components/ChatInterface/ChatContainer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useChat, ActionTypes } from '../../context/ChatContext.jsx';
import { useEnhancedChat } from '../../hooks/useEnhancedChat';
import { ollamaAPI } from '../../utils/ollamaApi';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from '../ModelSelector/ModelSelector';
import ConnectionStatus from './ConnectionStatus';
import MCPToolsPanel from '../MCPTools/MCPToolsPanel';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import './ChatContainer.css';

const ChatContainer = () => {
  const { state, dispatch, setConnectionStatus } = useChat();
  const {
    sendMessage,
    stopStreaming,
    retryConnection,
    isLoading,
    isStreaming,
    error,
    connectionStatus,
    mcpConnected,
    mcpTools,
    availableToolsCount,
  } = useEnhancedChat();

  const [models, setModels] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [showToolsPanel, setShowToolsPanel] = useState(true);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.streamingMessage]);

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const availableModels = await ollamaAPI.getModels();
        setModels(availableModels);
        
        dispatch({
          type: ActionTypes.SET_AVAILABLE_MODELS,
          payload: availableModels
        });
      } catch (error) {
        console.error('Failed to load models:', error);
        setConnectionStatus('error');
      }
    };

    if (connectionStatus === 'connected') {
      loadModels();
    }
  }, [connectionStatus, dispatch, setConnectionStatus]);

  // Set default model when models are loaded
  useEffect(() => {
    if (models.length > 0) {
      // Check if current model exists in available models
      const currentModelExists = models.some(model => model.name === state.currentModel);
      
      if (!currentModelExists) {
        // Set Qwen3 as default if available
        const qwenModel = models.find(model => 
          model.name.includes('qwen3') || model.name.includes('qwen')
        );
        
        if (qwenModel) {
          dispatch({
            type: ActionTypes.SET_CURRENT_MODEL,
            payload: qwenModel.name
          });
        } else if (models.length > 0) {
          // Fallback to first available model
          dispatch({
            type: ActionTypes.SET_CURRENT_MODEL,
            payload: models[0].name
          });
        }
      }
    }
  }, [models, dispatch]);

  // Load model info when current model changes
  useEffect(() => {
    const loadModelInfo = async () => {
      if (state.currentModel) {
        try {
          const info = await ollamaAPI.getModelInfo(state.currentModel);
          setModelInfo(info);
          dispatch({
            type: ActionTypes.SET_MODEL_INFO,
            payload: info
          });
        } catch (error) {
          console.error('Failed to load model info:', error);
        }
      }
    };

    loadModelInfo();
  }, [state.currentModel, dispatch]);

  const handleSendMessage = async (content) => {
    await sendMessage(content);
  };

  const handleModelChange = (modelName) => {
    dispatch({
      type: ActionTypes.SET_CURRENT_MODEL,
      payload: modelName
    });
  };

  const handleStopGeneration = () => {
    stopStreaming();
  };

  const handleClearChat = () => {
    dispatch({ type: ActionTypes.RESET_CHAT });
  };

  const handleRetryConnection = async () => {
    await retryConnection();
  };

  const handleToolSelect = (tool) => {
    // Auto-fill a sample prompt for the selected tool
    const samplePrompts = {
      'check_data_availability': 'What process data is available in the database?',
      'promethee_1': 'Run PROMETHEE I analysis on alternatives A, B, C with criteria Cost and Quality',
      'promethee_2': 'Run PROMETHEE II for complete ranking with net flows',
      'ahp': 'Perform AHP analysis for decision making',
    };
    
    const prompt = samplePrompts[tool.name] || `Use the ${tool.name} tool to help me with MCDA analysis`;
    
    // You could set this in an input field or just show it as a suggestion
    console.log(`Suggested prompt for ${tool.name}: ${prompt}`);
  };

  const getConnectionSummary = () => {
    const ollamaStatus = connectionStatus === 'connected' ? '✅' : '❌';
    const mcpStatus = mcpConnected ? '✅' : '❌';
    
    return `${ollamaStatus} Ollama | ${mcpStatus} MCP Tools (${availableToolsCount})`;
  };

  return (
    <ErrorBoundary>
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-left">
            <h1 className="chat-title">MCDA AGENT</h1>
            <ConnectionStatus 
              status={connectionStatus}
              onRetry={handleRetryConnection}
            />
            <div className="connection-summary">
              {getConnectionSummary()}
            </div>
          </div>
          
          <div className="header-right">
            {/* Tools panel toggle button removed */}
            
            <ModelSelector
              models={models}
              currentModel={state.currentModel}
              onModelChange={handleModelChange}
              modelInfo={modelInfo}
              disabled={isLoading || isStreaming}
            />
            
            <button
              className="clear-chat-btn"
              onClick={handleClearChat}
              disabled={isLoading || isStreaming || state.messages.length === 0}
              title="Start a new chat"
            >
              ➕ New Chat
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{error.message}</span>
              {error.code && (
                <span className="error-code">({error.code})</span>
              )}
            </div>
            <button
              className="error-dismiss"
              onClick={() => dispatch({ type: ActionTypes.CLEAR_ERROR })}
            >
              ✕
            </button>
          </div>
        )}

        {/* Connection Status Banner */}
        {connectionStatus === 'disconnected' && (
          <div className="status-banner disconnected">
            <span>🔴 Disconnected from Ollama</span>
            <button onClick={handleRetryConnection}>Retry Connection</button>
          </div>
        )}

        {connectionStatus === 'connecting' && (
          <div className="status-banner connecting">
            <span>🟡 Connecting to Ollama...</span>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="status-banner error">
            <span>🔴 Connection Error - Please ensure Ollama is running on localhost:11434</span>
            <button onClick={handleRetryConnection}>Retry</button>
          </div>
        )}

        {/* MCP Tools Panel - Removed */}

        {/* Main Chat Area */}
        <div className="chat-main">
          {/* Messages */}
          <div className="messages-container">
            {state.messages.length === 0 && connectionStatus === 'connected' && (
              <div className="welcome-message">
                <div className="welcome-content">
                  <h2>👋 Welcome to MCDA Agent</h2>
                  <p>You're connected to <strong>{state.currentModel}</strong></p>
                  {mcpConnected ? (
                    <div className="mcp-welcome">
                      <p>🎉 <strong>{availableToolsCount} MCDA tools</strong> are ready to use!</p>
                      <div className="tool-categories">
                        <span>🗄️ Database</span>
                        <span>📊 PROMETHEE</span>
                        <span>🔢 AHP</span>
                      </div>
                      <p className="welcome-hint">
                        Try: "What data is available?" or "Run PROMETHEE analysis on my alternatives"
                      </p>
                    </div>
                  ) : (
                    <div className="mcp-disconnected">
                      <p>⚠️ MCDA tools unavailable</p>
                      <p>Start the Python MCP server to access analysis tools</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <MessageList
              messages={state.messages}
              streamingMessage={state.streamingMessage}
              isStreaming={isStreaming}
              currentModel={state.currentModel}
            />
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="input-container">
            <MessageInput
              onSendMessage={handleSendMessage}
              onStopGeneration={handleStopGeneration}
              disabled={isLoading || connectionStatus !== 'connected'}
              isLoading={isLoading}
              isStreaming={isStreaming}
              placeholder={
                connectionStatus !== 'connected' 
                  ? 'Connect to Ollama to start chatting...'
                  : mcpConnected
                  ? `Ask me about MCDA analysis using ${state.currentModel}...`
                  : `Message ${state.currentModel}...`
              }
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ChatContainer;