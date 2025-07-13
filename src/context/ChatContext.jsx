// src/context/ChatContext.js
import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Simple counter for unique IDs
let messageIdCounter = 0;

// Generate unique message ID
const generateMessageId = () => {
  messageIdCounter += 1;
  return `${Date.now()}-${messageIdCounter}`;
};

// Initial state
const initialState = {
  messages: [],
  currentModel: 'qwen3:latest',
  availableModels: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  connectionStatus: 'disconnected', // disconnected, connecting, connected, error
  tools: [], // Available MCP tools
  toolResults: {}, // Store tool execution results
  streamingMessage: '', // Current streaming message content
  conversationId: null,
  modelInfo: null,
  settings: {
    temperature: 0.7,
    maxTokens: 2048,
    enableTools: true,
    streamResponse: true,
  }
};

// Action types
export const ActionTypes = {
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  COMPLETE_STREAMING_MESSAGE: 'COMPLETE_STREAMING_MESSAGE',
  UPDATE_STREAMING_MESSAGE: 'UPDATE_STREAMING_MESSAGE',
  CLEAR_STREAMING_MESSAGE: 'CLEAR_STREAMING_MESSAGE',
  SET_LOADING: 'SET_LOADING',
  SET_STREAMING: 'SET_STREAMING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  SET_CURRENT_MODEL: 'SET_CURRENT_MODEL',
  SET_AVAILABLE_MODELS: 'SET_AVAILABLE_MODELS',
  SET_TOOLS: 'SET_TOOLS',
  ADD_TOOL_RESULT: 'ADD_TOOL_RESULT',
  SET_MODEL_INFO: 'SET_MODEL_INFO',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  RESET_CHAT: 'RESET_CHAT',
};

// Chat reducer
const chatReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_MESSAGES:
      return {
        ...state,
        messages: action.payload,
      };

    case ActionTypes.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, {
          id: action.payload.id || generateMessageId(),
          timestamp: new Date().toISOString(),
          ...action.payload,
        }],
      };

    case ActionTypes.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { ...msg, ...action.payload }
            : msg
        ),
      };

    case ActionTypes.COMPLETE_STREAMING_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { ...msg, ...action.payload }
            : msg
        ),
        streamingMessage: '',
        isStreaming: false,
      };

    case ActionTypes.UPDATE_STREAMING_MESSAGE:
      return {
        ...state,
        streamingMessage: state.streamingMessage + action.payload,
      };

    case ActionTypes.CLEAR_STREAMING_MESSAGE:
      return {
        ...state,
        streamingMessage: '',
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ActionTypes.SET_STREAMING:
      return {
        ...state,
        isStreaming: action.payload,
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isStreaming: false,
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ActionTypes.SET_CONNECTION_STATUS:
      return {
        ...state,
        connectionStatus: action.payload,
      };

    case ActionTypes.SET_CURRENT_MODEL:
      return {
        ...state,
        currentModel: action.payload,
      };

    case ActionTypes.SET_AVAILABLE_MODELS:
      return {
        ...state,
        availableModels: action.payload,
      };

    case ActionTypes.SET_TOOLS:
      return {
        ...state,
        tools: action.payload,
      };

    case ActionTypes.ADD_TOOL_RESULT:
      return {
        ...state,
        toolResults: {
          ...state.toolResults,
          [action.payload.id]: action.payload.result,
        },
      };

    case ActionTypes.SET_MODEL_INFO:
      return {
        ...state,
        modelInfo: action.payload,
      };

    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    case ActionTypes.RESET_CHAT:
      return {
        ...state,
        messages: [],
        streamingMessage: '',
        error: null,
        isLoading: false,
        isStreaming: false,
        toolResults: {},
      };

    default:
      return state;
  }
};

// Context
const ChatContext = createContext();

// Provider component
export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Memoize helper functions to prevent unnecessary re-renders
  const addMessage = useCallback((message) => {
    dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });
  }, []);

  const updateMessage = useCallback((message) => {
    dispatch({ type: ActionTypes.UPDATE_MESSAGE, payload: message });
  }, []);

  const completeStreamingMessage = useCallback((message) => {
    dispatch({ type: ActionTypes.COMPLETE_STREAMING_MESSAGE, payload: message });
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
  }, []);

  const setStreaming = useCallback((streaming) => {
    dispatch({ type: ActionTypes.SET_STREAMING, payload: streaming });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  }, []);

  const updateStreamingMessage = useCallback((content) => {
    dispatch({ type: ActionTypes.UPDATE_STREAMING_MESSAGE, payload: content });
  }, []);

  const clearStreamingMessage = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_STREAMING_MESSAGE });
  }, []);

  const setConnectionStatus = useCallback((status) => {
    dispatch({ type: ActionTypes.SET_CONNECTION_STATUS, payload: status });
  }, []);

  const resetChat = useCallback(() => {
    dispatch({ type: ActionTypes.RESET_CHAT });
  }, []);

  const value = {
    state,
    dispatch,
    // Helper functions
    addMessage,
    updateMessage,
    completeStreamingMessage,
    setLoading,
    setStreaming,
    setError,
    clearError,
    updateStreamingMessage,
    clearStreamingMessage,
    setConnectionStatus,
    resetChat,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook to use the chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;