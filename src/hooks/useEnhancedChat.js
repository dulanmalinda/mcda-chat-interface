// src/hooks/useEnhancedChat.js
import { useCallback, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import { ollamaAPI, OllamaError } from '../utils/ollamaApi';
import { useMCDAMcp } from './useMCDAMcp';

/**
 * Enhanced chat hook that combines Ollama streaming with MCP tool calling
 */
export const useEnhancedChat = () => {
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

  const {
    isConnected: mcpConnected,
    formattedTools: mcpTools,
    executeTool,
  } = useMCDAMcp();

  const streamControllerRef = useRef(null);
  const currentStreamRef = useRef(null);
  const connectionCheckedRef = useRef(false);

  // Check Ollama connection on mount
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
  }, [setConnectionStatus]);

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

  // Convert MCP tools to Ollama tool format
  const formatToolsForOllama = useCallback(() => {
    if (!mcpConnected || !mcpTools || mcpTools.length === 0) {
      return [];
    }

    return mcpTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: Object.keys(tool.parameters).filter(
            key => tool.parameters[key].required !== false
          ),
        },
      },
    }));
  }, [mcpConnected, mcpTools]);

  // Execute tool calls and return results
  const executeToolCalls = useCallback(async (toolCalls) => {
    const results = [];
    
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;
      
      console.log(`🔧 Executing tool: ${name}`, args);
      
      try {
        const result = await executeTool(name, args);
        
        results.push({
          toolCall,
          result: result.success ? result.data : { error: result.error },
          success: result.success,
        });
        
        // Add tool execution message to chat
        addMessage({
          role: 'tool',
          content: result.success 
            ? `✅ Tool "${name}" executed successfully`
            : `❌ Tool "${name}" failed: ${result.error}`,
          toolName: name,
          toolArgs: args,
          toolResult: result,
          timestamp: new Date().toISOString(),
        });
        
      } catch (error) {
        console.error(`❌ Tool execution failed:`, error);
        results.push({
          toolCall,
          result: { error: error.message },
          success: false,
        });
        
        addMessage({
          role: 'tool',
          content: `❌ Tool "${name}" failed: ${error.message}`,
          toolName: name,
          toolArgs: args,
          isError: true,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    return results;
  }, [executeTool, addMessage]);

  // Enhanced send message with MCP tool support
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!content.trim()) return;

    const {
      model = state.currentModel,
      enableTools = state.settings.enableTools && mcpConnected,
      temperature = state.settings.temperature,
      maxTokens = state.settings.maxTokens,
    } = options;

    try {
      clearError();
      setLoading(true);

      // Add user message
      const userMessage = {
        role: 'user',
        content: content.trim(),
      };
      addMessage(userMessage);

      // Prepare messages for API
      const messages = [...state.messages, userMessage];

      // Get available tools
      const availableTools = enableTools ? formatToolsForOllama() : [];
      
      console.log(`🛠️  Available tools: ${availableTools.length}`);
      if (availableTools.length > 0) {
        console.log('🔧 Tool names:', availableTools.map(t => t.function.name));
      }

      // API options
      const apiOptions = {
        temperature,
        maxTokens,
        tools: availableTools,
      };

      // Create AbortController
      streamControllerRef.current = new AbortController();
      
      setLoading(false);
      setStreaming(true);

      // Add empty assistant message
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
        if (!currentStreamRef.current) break;

        if (chunk.message && chunk.message.content) {
          const content = chunk.message.content;
          
          // Handle thinking mode
          if (content.includes('<think>')) {
            isThinking = true;
            thinkingContent += content;
          } else if (content.includes('</think>')) {
            isThinking = false;
            thinkingContent += content;
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
          console.log('🔧 Tool calls detected:', chunk.message.tool_calls);
        }

        // Check if response is complete
        if (chunk.done) {
          clearStreamingMessage();
          
          // Update the assistant message with final content
          updateMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: fullResponse,
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

          // Execute tool calls if any
          if (toolCalls.length > 0 && enableTools) {
            console.log(`🚀 Executing ${toolCalls.length} tool calls...`);
            
            const toolResults = await executeToolCalls(toolCalls);
            
            // Add tool results to the assistant message
            updateMessage({
              id: assistantMessageId,
              toolResults,
              hasToolResults: true,
            });
            
            console.log('✅ Tool execution completed');
          }

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
        return;
      }

      console.error('Enhanced chat error:', error);
      
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

      addMessage({
        role: 'assistant',
        content: `Error: ${error.message}`,
        isError: true,
      });
    }
  }, [
    state.currentModel,
    state.settings,
    state.messages,
    mcpConnected,
    addMessage,
    updateMessage,
    setLoading,
    setStreaming,
    setError,
    clearError,
    updateStreamingMessage,
    clearStreamingMessage,
    formatToolsForOllama,
    executeToolCalls,
  ]);

  return {
    sendMessage,
    stopStreaming,
    retryConnection,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    error: state.error,
    connectionStatus: state.connectionStatus,
    streamingMessage: state.streamingMessage,
    
    // MCP-specific status
    mcpConnected,
    mcpTools,
    availableToolsCount: mcpTools?.length || 0,
  };
};

export default useEnhancedChat;
