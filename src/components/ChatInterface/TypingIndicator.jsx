// src/components/ChatInterface/TypingIndicator.jsx
import React from 'react';

const TypingIndicator = ({ model }) => {
  return (
    <div className="typing-indicator">
      <div className="typing-bubble">
        <div className="typing-role">
          <span className="role-icon">🤖</span>
          <span className="role-name">{model}</span>
        </div>
        <div className="typing-animation">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;