// src/components/ChatInterface/MessageBubble.jsx
import React, { useState } from 'react';

const MessageBubble = ({ message, currentModel }) => {
  const [showThinking, setShowThinking] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const isError = message.isError;
  const isStreaming = message.isStreaming;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (nanoseconds) => {
    if (!nanoseconds) return '';
    const ms = nanoseconds / 1000000;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const calculateTokensPerSecond = (tokens, duration) => {
    if (!tokens || !duration) return '';
    const seconds = duration / 1000000000; // Convert nanoseconds to seconds
    return (tokens / seconds).toFixed(1);
  };

  const formatCode = (content) => {
    // Simple code formatting without external library
    const lines = content.split('\n');
    return lines.map((line, index) => (
      <div key={index} className="code-line">
        {line}
      </div>
    ));
  };

  const formatContent = (content) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, index) => (
        <div key={index}>
          {line.startsWith('```') ? (
            <pre className="code-block">
              {line.replace(/```\w*/, '')}
            </pre>
          ) : line.startsWith('`') && line.endsWith('`') ? (
            <code className="inline-code">
              {line.slice(1, -1)}
            </code>
          ) : (
            line
          )}
        </div>
      ));
  };

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'} ${isError ? 'error' : ''} ${isStreaming ? 'streaming' : ''}`}>
      <div className="message-header">
        <div className="message-role">
          <span className="role-icon">
            {isUser ? '👤' : (isError ? '❌' : '🤖')}
          </span>
          <span className="role-name">
            {isUser ? 'You' : (isError ? 'Error' : currentModel)}
          </span>
        </div>
        
        <div className="message-actions">
          {message.timestamp && (
            <span className="message-time">
              {formatTimestamp(message.timestamp)}
            </span>
          )}
          
          {/* Thinking toggle for Qwen3 */}
          {message.thinking && (
            <button
              className="thinking-toggle"
              onClick={() => setShowThinking(!showThinking)}
              title="Show/hide thinking process"
            >
              🧠 {showThinking ? 'Hide' : 'Show'} Thinking
            </button>
          )}
          
          {/* Metadata toggle */}
          {message.metadata && (
            <button
              className="metadata-toggle"
              onClick={() => setShowMetadata(!showMetadata)}
              title="Show/hide metadata"
            >
              📊 {showMetadata ? 'Hide' : 'Show'} Stats
            </button>
          )}
          
          {/* Copy button */}
          <button
            className="copy-button"
            onClick={handleCopy}
            title="Copy message"
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>
      </div>

      {/* Thinking content (Qwen3 specific) */}
      {showThinking && message.thinking && (
        <div className="thinking-content">
          <div className="thinking-header">
            <span>🧠 Thinking Process:</span>
          </div>
          <div className="thinking-text">
            {formatContent(message.thinking)}
          </div>
        </div>
      )}

      {/* Tool calls display */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="tool-calls">
          <div className="tool-calls-header">
            <span>🛠️ Tool Calls:</span>
          </div>
          {message.toolCalls.map((toolCall, index) => (
            <div key={index} className="tool-call">
              <div className="tool-name">
                {toolCall.function?.name || toolCall.name}
              </div>
              <div className="tool-params">
                <pre className="tool-params-code">
                  {JSON.stringify(toolCall.function?.arguments || toolCall.parameters, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main message content */}
      <div className="message-content">
        {isStreaming ? (
          <div className="streaming-content">
            {formatContent(message.content)}
            <span className="streaming-cursor">▊</span>
          </div>
        ) : (
          formatContent(message.content)
        )}
      </div>

      {/* Metadata display */}
      {showMetadata && message.metadata && (
        <div className="message-metadata">
          <div className="metadata-grid">
            {message.metadata.eval_count && message.metadata.eval_duration && (
              <div className="metadata-item">
                <span className="metadata-label">Speed:</span>
                <span className="metadata-value">
                  {calculateTokensPerSecond(message.metadata.eval_count, message.metadata.eval_duration)} tokens/s
                </span>
              </div>
            )}
            
            {message.metadata.eval_count && (
              <div className="metadata-item">
                <span className="metadata-label">Tokens:</span>
                <span className="metadata-value">{message.metadata.eval_count}</span>
              </div>
            )}
            
            {message.metadata.total_duration && (
              <div className="metadata-item">
                <span className="metadata-label">Total Time:</span>
                <span className="metadata-value">
                  {formatDuration(message.metadata.total_duration)}
                </span>
              </div>
            )}
            
            {message.metadata.load_duration && (
              <div className="metadata-item">
                <span className="metadata-label">Load Time:</span>
                <span className="metadata-value">
                  {formatDuration(message.metadata.load_duration)}
                </span>
              </div>
            )}
            
            {message.metadata.prompt_eval_count && (
              <div className="metadata-item">
                <span className="metadata-label">Prompt Tokens:</span>
                <span className="metadata-value">{message.metadata.prompt_eval_count}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;