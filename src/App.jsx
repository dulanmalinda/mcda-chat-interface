// src/App.jsx
import React from 'react';
import { ChatProvider } from './context/ChatContext.jsx';
import ChatContainer from './components/ChatInterface/ChatContainer';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <ChatProvider>
        <div className="App">
          <ChatContainer />
        </div>
      </ChatProvider>
    </ErrorBoundary>
  );
}

export default App;