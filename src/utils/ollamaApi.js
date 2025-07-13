// src/utils/ollamaApi.js

const OLLAMA_BASE_URL = 'http://localhost:11434';

// Error types for better error handling
export class OllamaError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'OllamaError';
    this.status = status;
    this.code = code;
  }
}

class OllamaAPI {
  constructor(baseUrl = OLLAMA_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Check if Ollama is running and accessible
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new OllamaError(`Connection failed: ${response.status}`, response.status);
      }
      
      const data = await response.json();
      return { connected: true, version: data.version };
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError('Failed to connect to Ollama. Please ensure Ollama is running.', 0, 'CONNECTION_ERROR');
    }
  }

  // Get list of available models
  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new OllamaError(`Failed to fetch models: ${response.status}`, response.status);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError('Failed to fetch available models', 0, 'FETCH_MODELS_ERROR');
    }
  }

  // Get model information
  async getModelInfo(modelName) {
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelName }),
      });
      
      if (!response.ok) {
        throw new OllamaError(`Failed to get model info: ${response.status}`, response.status);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(`Failed to get info for model: ${modelName}`, 0, 'MODEL_INFO_ERROR');
    }
  }

  // Get currently running models
  async getRunningModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/ps`);
      
      if (!response.ok) {
        throw new OllamaError(`Failed to fetch running models: ${response.status}`, response.status);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError('Failed to fetch running models', 0, 'RUNNING_MODELS_ERROR');
    }
  }

  // Send chat message (streaming)
  async *streamChat(messages, modelName = 'qwen3:latest', options = {}) {
    const payload = {
      model: modelName,
      messages: messages,
      stream: true,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9,
        num_predict: options.maxTokens || 2048,
        num_ctx: options.contextLength || 4096,
      },
      // Enable tool support for Qwen3
      tools: options.tools || [],
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OllamaError(
          errorData.error?.message || `Chat request failed: ${response.status}`,
          response.status,
          'CHAT_ERROR'
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              
              if (data.error) {
                throw new OllamaError(data.error, 0, 'STREAM_ERROR');
              }

              yield data;
            } catch (parseError) {
              console.warn('Failed to parse chunk:', line, parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError('Streaming chat failed', 0, 'STREAM_CHAT_ERROR');
    }
  }

  // Send non-streaming chat message
  async sendChat(messages, modelName = 'qwen3:latest', options = {}) {
    const payload = {
      model: modelName,
      messages: messages,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9,
        num_predict: options.maxTokens || 2048,
        num_ctx: options.contextLength || 4096,
      },
      tools: options.tools || [],
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OllamaError(
          errorData.error?.message || `Chat request failed: ${response.status}`,
          response.status,
          'CHAT_ERROR'
        );
      }

      const data = await response.json();
      
      if (data.error) {
        throw new OllamaError(data.error, 0, 'RESPONSE_ERROR');
      }

      return data;
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError('Chat request failed', 0, 'SEND_CHAT_ERROR');
    }
  }

  // Load model into memory
  async loadModel(modelName) {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: '', // Empty prompt just loads the model
        }),
      });

      if (!response.ok) {
        throw new OllamaError(`Failed to load model: ${response.status}`, response.status);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(`Failed to load model: ${modelName}`, 0, 'LOAD_MODEL_ERROR');
    }
  }

  // Tool calling support for Qwen3
  async callTool(toolName, parameters, modelName = 'qwen3:latest') {
    const messages = [
      {
        role: 'user',
        content: `Use the ${toolName} tool with these parameters: ${JSON.stringify(parameters)}`,
      },
    ];

    try {
      const response = await this.sendChat(messages, modelName, {
        tools: [{ name: toolName, parameters }],
      });

      return response;
    } catch (error) {
      throw new OllamaError(`Tool call failed: ${error.message}`, 0, 'TOOL_CALL_ERROR');
    }
  }
}

// Create and export a singleton instance
export const ollamaAPI = new OllamaAPI();

// Export utility functions
export const formatModelSize = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const isModelLoaded = async (modelName) => {
  try {
    const runningModels = await ollamaAPI.getRunningModels();
    return runningModels.some(model => model.name === modelName);
  } catch (error) {
    return false;
  }
};

export default ollamaAPI;