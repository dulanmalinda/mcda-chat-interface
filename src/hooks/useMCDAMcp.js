// src/hooks/useMCDAMcp.js
import { useMcp } from 'use-mcp/react';
import { useCallback, useEffect } from 'react';

/**
 * Custom hook for MCDA MCP server integration
 * Manages connection to Python MCP server and tool calling
 */
export const useMCDAMcp = () => {
  const {
    state,
    tools,
    callTool,
    error: mcpError,
    retry,
    authenticate,
    clearStorage,
  } = useMcp({
    url: 'http://localhost:8000/sse',  // Direct SSE endpoint URL - must include the /sse path
    clientName: 'MCDA Chat Interface',
    autoReconnect: true,
    transportType: 'sse',  // Explicitly use SSE transport for maximum compatibility
    debug: true,  // Enable debug logging for troubleshooting
  });

  // Format tools for better UI display
  const formatToolsForDisplay = useCallback(() => {
    if (!tools || tools.length === 0) return [];
    
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      category: getToolCategory(tool.name),
      parameters: tool.inputSchema?.properties || {},
    }));
  }, [tools]);

  // Categorize tools for better organization
  const getToolCategory = (toolName) => {
    if (toolName.includes('promethee')) return 'PROMETHEE';
    if (toolName === 'ahp') return 'AHP';
    if (toolName.includes('data')) return 'Database';
    return 'Other';
  };

  // Execute MCP tool with error handling
  const executeTool = useCallback(async (toolName, parameters) => {
    try {
      console.log(`🔧 Executing MCP tool: ${toolName}`, parameters);
      
      const result = await callTool(toolName, parameters);
      
      console.log(`✅ Tool execution successful:`, result);
      return {
        success: true,
        data: result,
        toolName,
        parameters,
      };
    } catch (error) {
      console.error(`❌ Tool execution failed:`, error);
      return {
        success: false,
        error: error.message,
        toolName,
        parameters,
      };
    }
  }, [callTool]);

  // Get tools by category
  const getToolsByCategory = useCallback(() => {
    const formattedTools = formatToolsForDisplay();
    const categories = {};
    
    formattedTools.forEach(tool => {
      const category = tool.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(tool);
    });
    
    return categories;
  }, [formatToolsForDisplay]);

  // Check if specific tool is available
  const isToolAvailable = useCallback((toolName) => {
    return tools && tools.some(tool => tool.name === toolName);
  }, [tools]);

  // Connection status helpers
  const isConnected = state === 'ready';
  const isConnecting = state === 'connecting' || state === 'loading';
  const isError = state === 'failed';
  const isPendingAuth = state === 'pending_auth' || state === 'authenticating';

  // Log connection state changes
  useEffect(() => {
    console.log(`🔗 MCP Connection State: ${state}`);
    if (isConnected && tools) {
      console.log(`🛠️  Available MCP tools: ${tools.map(t => t.name).join(', ')}`);
    }
    if (mcpError) {
      console.error('🚨 MCP Error:', mcpError);
    }
  }, [state, tools, mcpError, isConnected]);

  return {
    // Connection state
    state,
    isConnected,
    isConnecting,
    isError,
    isPendingAuth,
    error: mcpError,
    
    // Tools
    tools,
    formattedTools: formatToolsForDisplay(),
    toolsByCategory: getToolsByCategory(),
    
    // Actions
    executeTool,
    isToolAvailable,
    retry,
    authenticate,
    clearStorage,
    
    // Tool categories for UI
    categories: ['Database', 'PROMETHEE', 'AHP', 'Other'],
  };
};

export default useMCDAMcp;
