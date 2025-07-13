// src/hooks/useStreamingChat.js
import { useCallback, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import { ollamaAPI, OllamaError } from '../utils/ollamaApi';

export const useStreamingChat = () => {
  const {
    state,
    addMessage,
    updateMessage,
    setLoading,
    setStreaming,
    setError,
    clearError,
    updateStreamingMessage,
    clearStreamingMessage,
    setConnectionStatus,
  } = useChat();

  const streamControllerRef = useRef(null);
  const currentStreamRef = useRef(null);
  const connectionCheckedRef = useRef(false);

  // Check Ollama connection on mount (only once)
  useEffect(() => {
    if (connectionCheckedRef.current) return;
    
    const checkConnection = async () => {
      try {
        setConnectionStatus('connecting');
        const connection = await ollamaAPI.checkConnection();
        if (connection.connected) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('error');
        }
      } catch (error) {
        setConnectionStatus('error');
        console.error('Connection check failed:', error);
      } finally {
        connectionCheckedRef.current = true;
      }
    };

    checkConnection();
  }, []); // Empty dependency array - only run once

  // Manual connection retry
  const retryConnection = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      const connection = await ollamaAPI.checkConnection();
      if (connection.connected) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('Connection retry failed:', error);
    }
  }, [setConnectionStatus]);

  // Stop current streaming
  const stopStreaming = useCallback(() => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
    if (currentStreamRef.current) {
      currentStreamRef.current = null;
    }
    setStreaming(false);
    setLoading(false);
  }, [setStreaming, setLoading]);

  // Send message with streaming response
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!content.trim()) return;

    const {
      model = state.currentModel,
      enableTools = state.settings.enableTools,
      temperature = state.settings.temperature,
      maxTokens = state.settings.maxTokens,
      tools = state.tools,
    } = options;

    try {
      clearError();
      setLoading(true);

      // Add user message immediately
      const userMessage = {
        role: 'user',
        content: content.trim(),
      };
      addMessage(userMessage);

      // Prepare messages for API
      const messages = [...state.messages, userMessage];

      // Prepare API options
      const apiOptions = {
        temperature,
        maxTokens,
        tools: enableTools ? tools : [],
      };

      // Create AbortController for stopping stream
      streamControllerRef.current = new AbortController();
      
      setLoading(false);
      setStreaming(true);

      // Add empty assistant message that will be updated during streaming
      const assistantMessageId = `${Date.now()}-assistant`;
      addMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      });

      let fullResponse = '';
      let toolCalls = [];
      let isThinking = false;
      let thinkingContent = '';

      // Start streaming
      const stream = ollamaAPI.streamChat(messages, model, {
        ...apiOptions,
        signal: streamControllerRef.current.signal,
      });

      currentStreamRef.current = stream;

      for await (const chunk of stream) {
        // Check if streaming was stopped
        if (!currentStreamRef.current) break;

        if (chunk.message && chunk.message.content) {
          const content = chunk.message.content;
          
          // Handle Qwen3 thinking mode
          if (content.includes('<think>')) {
            isThinking = true;
            thinkingContent += content;
          } else if (content.includes('</think>')) {
            isThinking = false;
            thinkingContent += content;
            // You could process thinking content here if needed
          } else if (isThinking) {
            thinkingContent += content;
          } else {
            // Regular content
            fullResponse += content;
            updateStreamingMessage(content);
          }
        }

        // Handle tool calls
        if (chunk.message && chunk.message.tool_calls) {
          toolCalls = [...toolCalls, ...chunk.message.tool_calls];
        }

        // Check if response is complete
        if (chunk.done) {
          // Update the assistant message with final content
          const finalContent = fullResponse;
          
          // Replace the streaming message with final message
          clearStreamingMessage();
          
          // Update the existing assistant message with final content
          updateMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: finalContent,
            isStreaming: false,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            thinking: thinkingContent || undefined,
            metadata: {
              model: chunk.model || model,
              total_duration: chunk.total_duration,
              load_duration: chunk.load_duration,
              prompt_eval_count: chunk.prompt_eval_count,
              prompt_eval_duration: chunk.prompt_eval_duration,
              eval_count: chunk.eval_count,
              eval_duration: chunk.eval_duration,
            },
          });

          break;
        }
      }

      setStreaming(false);
      currentStreamRef.current = null;
      streamControllerRef.current = null;

    } catch (error) {
      setStreaming(false);
      setLoading(false);
      clearStreamingMessage();
      
      if (error.name === 'AbortError') {
        // Stream was intentionally stopped
        return;
      }

      console.error('Streaming error:', error);
      
      if (error instanceof OllamaError) {
        setError({
          message: error.message,
          code: error.code,
          status: error.status,
        });
      } else {
        setError({
          message: 'An unexpected error occurred while sending message',
          code: 'UNKNOWN_ERROR',
        });
      }

      // Add error message to chat
      addMessage({
        role: 'assistant',
        content: `Error: ${error.message}`,
        isError: true,
      });
    }
  }, [
    state.currentModel,
    state.settings,
    state.tools,
    addMessage,
    updateMessage,
    setLoading,
    setStreaming,
    setError,
    clearError,
    updateStreamingMessage,
    clearStreamingMessage,
  ]); // Removed state.messages from dependencies

  // Send message without streaming (for tool calls)
  const sendNonStreamingMessage = useCallback(async (content, options = {}) => {
    if (!content.trim()) return;

    const {
      model = state.currentModel,
      temperature = state.settings.temperature,
      maxTokens = state.settings.maxTokens,
      tools = state.tools,
    } = options;

    try {
      clearError();
      setLoading(true);

      const userMessage = {
        role: 'user',
        content: content.trim(),
      };
      addMessage(userMessage);

      const messages = [...state.messages, userMessage];
      
      const response = await ollamaAPI.sendChat(messages, model, {
        temperature,
        maxTokens,
        tools,
      });

      if (response.message) {
        addMessage({
          role: response.message.role,
          content: response.message.content,
          toolCalls: response.message.tool_calls,
          metadata: {
            model: response.model,
            total_duration: response.total_duration,
            load_duration: response.load_duration,
            prompt_eval_count: response.prompt_eval_count,
            prompt_eval_duration: response.prompt_eval_duration,
            eval_count: response.eval_count,
            eval_duration: response.eval_duration,
          },
        });
      }

      setLoading(false);
      return response;

    } catch (error) {
      setLoading(false);
      console.error('Non-streaming error:', error);
      
      if (error instanceof OllamaError) {
        setError({
          message: error.message,
          code: error.code,
          status: error.status,
        });
      } else {
        setError({
          message: 'An unexpected error occurred',
          code: 'UNKNOWN_ERROR',
        });
      }

      throw error;
    }
  }, [
    state.currentModel,
    state.settings,
    state.tools,
    addMessage,
    setLoading,
    setError,
    clearError,
  ]); // Removed state.messages from dependencies

  // Regenerate last response
  const regenerateResponse = useCallback(async () => {
    const messages = state.messages.filter(msg => msg.role !== 'assistant' || !msg.isError);
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
    
    if (lastUserMessage) {
      // Remove the last assistant message(s)
      const filteredMessages = messages.filter((msg, index) => {
        if (msg.role === 'assistant') {
          const userMsgIndex = messages.findIndex(m => m.id === lastUserMessage.id);
          return index < userMsgIndex;
        }
        return true;
      });

      // Update messages and resend
      // You might want to update the state here
      await sendMessage(lastUserMessage.content);
    }
  }, [state.messages, sendMessage]);

  return {
    sendMessage,
    sendNonStreamingMessage,
    stopStreaming,
    regenerateResponse,
    retryConnection,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    error: state.error,
    connectionStatus: state.connectionStatus,
    streamingMessage: state.streamingMessage,
  };
};

export default useStreamingChat;