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

  // Convert MCP tools to Ollama tool format with enhanced descriptions
  const formatToolsForOllama = useCallback(() => {
    if (!mcpConnected || !mcpTools || mcpTools.length === 0) {
      return [];
    }

    return mcpTools.map(tool => {
      // Base tool definition
      const baseTool = {
        type: 'function',
        function: {
          name: tool.name,
          parameters: {
            type: 'object',
            properties: tool.parameters,
            required: Object.keys(tool.parameters).filter(
              key => tool.parameters[key].required !== false
            ),
          },
        }
      };
      
      // Enhance description based on tool name
      if (tool.name === 'get_process_data') {
        baseTool.function.description = 
          `Retrieves data for a particular process. IMPORTANT: You must provide the "process" parameter as a string value. ` +
          `Example correct usage: {"process": "mulching"} NOT {"input_data": "mulching"} or just "mulching".`;
      } 
      else if (tool.name === 'check_data_availability') {
        baseTool.function.description = 
          `Checks the DB whether particular process data are available or not. ` +
          `This tool doesn't require any parameters, so use empty arguments object {}.`;
      } 
      else if (tool.name.startsWith('promethee_')) {
        baseTool.function.description = 
          `${tool.description} IMPORTANT: The PrometheeInput model requires specific fields. ` +
          `All fields must be provided with exact names: alternatives (string[]), criteria (string[]), ` +
          `weights (number[]), evaluations (number[][]), and optionally maximize, preference_functions, thresholds, alpha, constraints.`;
      } 
      else if (tool.name === 'ahp') {
        baseTool.function.description = 
          `${tool.description} IMPORTANT: The AHPInput model requires specific fields. ` +
          `All fields must be provided with exact names: alternatives (string[]), criteria (string[]), ` +
          `criteria_matrix (number[][]), alternatives_matrices (number[][][]), and optionally check_consistency, consistency_threshold.`;
      } 
      else {
        // Default description for other tools
        baseTool.function.description = tool.description;
      }
      
      return baseTool;
    });
  }, [mcpConnected, mcpTools]);

  // Helper function to get expected format for tools (what will be sent to server)
  const getExpectedFormat = useCallback((toolName) => {
    if (toolName === 'get_process_data') {
      return { 
        input_data: { 
          process: "example_process_name" 
        } 
      };
    } else if (toolName === 'check_data_availability') {
      return {}; // No parameters needed
    } else if (toolName.startsWith('promethee_')) {
      return {
        input_data: {
          alternatives: ["Alternative A", "Alternative B"],
          criteria: ["Criterion 1", "Criterion 2"],
          weights: [0.6, 0.4],
          evaluations: [[90, 80], [70, 95]],
          // Optional parameters
          maximize: [true, false],
          preference_functions: ["usual", "linear"],
          thresholds: [[0, 10, 20], [5, 15, 25]],
          alpha: 0.1,
          constraints: [true, false]
        }
      };
    } else if (toolName === 'ahp') {
      return {
        input_data: {
          alternatives: ["Alternative A", "Alternative B"],
          criteria: ["Criterion 1", "Criterion 2"],
          criteria_matrix: [[1, 3], [0.33, 1]],
          alternatives_matrices: [[[1, 2], [0.5, 1]], [[1, 0.5], [2, 1]]],
          check_consistency: true,
          consistency_threshold: 0.1
        }
      };
    }
    return {}; // Default empty object
  }, []);

  // Execute tool calls and return results
  const executeToolCalls = useCallback(async (toolCalls, assistantMessage) => {
    const results = [];
    
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;
      
      console.log(`🔧 Executing tool: ${name}`, args);
      console.log(`📄 Expected format for ${name}:`, getExpectedFormat(name));
      
      // Transform arguments based on what the MCP server expects
      let processedArgs = args;
      
      if (name === 'get_process_data') {
        // Simple database tool: wrap parameters in input_data object
        processedArgs = { input_data: args };
        console.log(`🔄 Transformed args for ${name}:`, processedArgs);
      } else if (name.startsWith('promethee_')) {
        // PROMETHEE algorithms: wrap parameters in input_data object
        processedArgs = { input_data: args };
        console.log(`🔄 Transformed args for ${name}:`, processedArgs);
      } else if (name === 'ahp') {
        // AHP algorithm: wrap parameters in input_data object
        processedArgs = { input_data: args };
        console.log(`🔄 Transformed args for ${name}:`, processedArgs);
      } else if (name === 'check_data_availability') {
        // This tool takes no parameters, keep as-is
        processedArgs = args;
      } else {
        // For any other tools, use arguments as-is
        processedArgs = args;
      }
      
      try {
        const result = await executeTool(name, processedArgs);
        
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
          toolArgs: processedArgs,  // Use processed args for consistency
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
          toolArgs: processedArgs,  // Use processed args for consistency
          isError: true,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    // Update the assistant message with tool results
    updateMessage({
      id: assistantMessage.id,
      toolResults: results,
      hasToolResults: true,
    });
    
    console.log('✅ Tool execution completed');
    
    // Continue the conversation with tool results
    await continueConversationAfterToolCalls(results, assistantMessage);
    
    return results;
  }, [executeTool, addMessage, updateMessage, getExpectedFormat]);
  
  // Continue conversation after tool calls by sending tool results back to LLM
  const continueConversationAfterToolCalls = useCallback(async (toolResults, assistantMessage) => {
    try {
      setLoading(true);
      
      // Prepare messages for the API, including all previous messages and tool results
      const currentMessages = [...state.messages];
      
      // Find all messages up to and including the assistant message that initiated the tool call
      // This ensures we have the complete conversation context
      let messagesForLLM = [];
      
      // If we have the assistant message, use it and all previous messages
      if (assistantMessage) {
        // Find the message in the current state (it should be there)
        const assistantMessageIndex = currentMessages.findIndex(msg => msg.id === assistantMessage.id);
        
        if (assistantMessageIndex !== -1) {
          // Use all messages up to and including the assistant message
          messagesForLLM = currentMessages.slice(0, assistantMessageIndex + 1);
        } else {
          // Fallback: Use all messages and add the assistant message
          console.warn('Assistant message not found in state, using all messages');
          messagesForLLM = [...currentMessages];
          
          // If the assistant message isn't in state yet, add it manually to ensure context
          if (!messagesForLLM.some(msg => msg.id === assistantMessage.id)) {
            messagesForLLM.push(assistantMessage);
          }
        }
      } else {
        // If we don't have the assistant message, use all current messages
        console.warn('No assistant message provided, using all messages');
        messagesForLLM = [...currentMessages];
        
        // Clear loading state to prevent UI from being stuck
        if (toolResults.length > 0) {
          addMessage({
            role: 'assistant',
            content: 'I received the tool results but couldn\'t continue the conversation properly. Please try again or start a new conversation.',
            isError: true,
          });
          setLoading(false);
          setStreaming(false);
          return; // Exit early to prevent further processing
        }
      }
      
      // Add tool result messages
      toolResults.forEach(result => {
        const toolName = result.toolCall.function.name;
        const toolResult = result.success ? result.result : { error: result.result.error };
        
        messagesForLLM.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
          name: toolName,
          tool_call_id: result.toolCall.id || `tool-${Date.now()}-${toolName}`,
        });
      });
      
      console.log('🔄 Continuing conversation with tool results:', messagesForLLM);
      
      // Create a new assistant message for the response
      const newAssistantMessageId = `${Date.now()}-assistant-tool-response`;
      addMessage({
        id: newAssistantMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        isToolResponse: true,
      });
      
      setLoading(false);
      setStreaming(true);
      
      // Get available tools (in case the LLM wants to make further tool calls)
      const availableTools = state.settings.enableTools && mcpConnected ? formatToolsForOllama() : [];
      
      // API options
      const apiOptions = {
        temperature: state.settings.temperature,
        maxTokens: state.settings.maxTokens,
        tools: availableTools,
      };
      
      // Create AbortController
      streamControllerRef.current = new AbortController();
      
      let fullResponse = '';
      let newToolCalls = [];
      let isThinking = false;
      let thinkingContent = '';
      
      // Start streaming response to tool results
      const stream = ollamaAPI.streamChat(messagesForLLM, state.currentModel, {
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
        
        // Handle new tool calls (in case the LLM wants to make additional tool calls)
        if (chunk.message && chunk.message.tool_calls) {
          newToolCalls = [...newToolCalls, ...chunk.message.tool_calls];
          console.log('🔧 New tool calls detected:', chunk.message.tool_calls);
        }
        
        // Check if response is complete
        if (chunk.done) {
          clearStreamingMessage();
          
          // Update the assistant message with final content
          const newAssistantMessage = {
            id: newAssistantMessageId,
            role: 'assistant',
            content: fullResponse,
            isStreaming: false,
            toolCalls: newToolCalls.length > 0 ? newToolCalls : undefined,
            thinking: thinkingContent || undefined,
            isToolResponse: true,
            metadata: {
              model: chunk.model || state.currentModel,
              total_duration: chunk.total_duration,
              load_duration: chunk.load_duration,
              prompt_eval_count: chunk.prompt_eval_count,
              prompt_eval_duration: chunk.prompt_eval_duration,
              eval_count: chunk.eval_count,
              eval_duration: chunk.eval_duration,
            },
          };
          
          // Update message in state
          updateMessage(newAssistantMessage);
          
          // If there are new tool calls, execute them too (recursively continue the tool calling loop)
          if (newToolCalls.length > 0 && state.settings.enableTools) {
            console.log(`🚀 Executing ${newToolCalls.length} new tool calls...`);
            await executeToolCalls(newToolCalls, newAssistantMessage);
          }
          
          break;
        }
      }
      
      setLoading(false);
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
      
      console.error('Error continuing conversation after tool calls:', error);
      
      addMessage({
        role: 'assistant',
        content: `Error processing tool results: ${error.message}`,
        isError: true,
      });
    }
  }, [
    state.messages,
    state.currentModel,
    state.settings,
    mcpConnected,
    addMessage,
    updateMessage,
    setLoading,
    setStreaming,
    clearStreamingMessage,
    updateStreamingMessage,
    formatToolsForOllama,
  ]);

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
          const assistantMessage = {
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
          };
          
          // Update message in state
          updateMessage(assistantMessage);

          // Execute tool calls if any
          if (toolCalls.length > 0 && enableTools) {
            console.log(`🚀 Executing ${toolCalls.length} tool calls...`);
            
            await executeToolCalls(toolCalls, assistantMessage);
            
            console.log('✅ Tool execution complete and conversation continued');
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
