// src/components/ChatInterface/MessageInput.jsx
import React, { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSendMessage, onStopGeneration, disabled, isLoading, isStreaming, placeholder }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isStreaming) {
      // Stop generation if streaming
      onStopGeneration();
    } else if (message.trim() && !disabled && !isLoading) {
      // Send message if not streaming
      onSendMessage(message.trim());
      setMessage('');
      resetTextareaHeight();
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
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  const resetTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className="message-input-container">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="message-input"
        rows={1}
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