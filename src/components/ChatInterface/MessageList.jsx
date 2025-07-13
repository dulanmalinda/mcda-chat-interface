// src/components/ChatInterface/MessageList.jsx
import React from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

const MessageList = ({ messages, streamingMessage, isStreaming, currentModel }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          currentModel={currentModel}
        />
      ))}
      
      {/* Streaming message display */}
      {isStreaming && streamingMessage && (
        <MessageBubble
          key="streaming-message"
          message={{
            role: 'assistant',
            content: streamingMessage,
            isStreaming: true,
          }}
          currentModel={currentModel}
        />
      )}
      
      {/* Typing indicator when loading but not streaming */}
      {isStreaming && !streamingMessage && (
        <TypingIndicator key="typing-indicator" model={currentModel} />
      )}
    </div>
  );
};

export default MessageList;