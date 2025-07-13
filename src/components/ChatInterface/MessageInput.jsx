// src/components/ChatInterface/MessageInput.jsx
import React, { useState } from 'react';

const MessageInput = ({ onSendMessage, onStopGeneration, disabled, isLoading, isStreaming, placeholder }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isStreaming) {
      // Stop generation if streaming
      onStopGeneration();
    } else if (message.trim() && !disabled && !isLoading) {
      // Send message if not streaming
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e) => {
    setMessage(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="message-input-container">
      <textarea
        value={message}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="message-input"
        rows={3}
      />
      <button
        type="submit"
        disabled={isStreaming ? false : (!message.trim() || disabled || isLoading)}
        className={`send-button ${isStreaming ? 'stop-button' : ''}`}
      >
        {isStreaming ? (
          <>
            ⏹️ Stop
          </>
        ) : isLoading ? (
          <>
            <div className="loading-spinner" />
            Sending...
          </>
        ) : (
          <>
            📤 Send
          </>
        )}
      </button>
    </form>
  );
};

export default MessageInput;