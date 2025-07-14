// src/components/MCPTools/MCPToolsPanel.jsx
import React, { useState } from 'react';
import { useMCDAMcp } from '../../hooks/useMCDAMcp';
import './MCPToolsPanel.css';

const MCPToolsPanel = ({ onToolSelect }) => {
  const {
    isConnected,
    isConnecting,
    isError,
    error,
    toolsByCategory,
    retry,
    formattedTools,
  } = useMCDAMcp();

  const [expandedCategories, setExpandedCategories] = useState({
    Database: true,
    PROMETHEE: true,
    AHP: true,
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleToolClick = (tool) => {
    if (onToolSelect) {
      onToolSelect(tool);
    }
  };

  if (isConnecting) {
    return (
      <div className="mcp-tools-panel">
        <div className="mcp-status connecting">
          <div className="status-indicator"></div>
          <span>Connecting to MCDA Tools...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mcp-tools-panel">
        <div className="mcp-status error">
          <div className="status-indicator"></div>
          <span>Connection Failed</span>
          {error && <p className="error-message">{error}</p>}
          <button onClick={retry} className="retry-btn">
            🔄 Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mcp-tools-panel">
        <div className="mcp-status disconnected">
          <div className="status-indicator"></div>
          <span>MCDA Tools Unavailable</span>
          <p>Start the Python MCP server to access MCDA tools</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mcp-tools-panel">
      <div className="mcp-status connected">
        <div className="status-indicator"></div>
        <span>MCDA Tools Connected</span>
        <small>{formattedTools.length} tools available</small>
      </div>

      <div className="tools-container">
        {Object.entries(toolsByCategory).map(([category, tools]) => (
          <div key={category} className="tool-category">
            <div 
              className="category-header"
              onClick={() => toggleCategory(category)}
            >
              <span className="category-icon">
                {category === 'Database' && '🗄️'}
                {category === 'PROMETHEE' && '📊'}
                {category === 'AHP' && '🔢'}
                {category === 'Other' && '🔧'}
              </span>
              <span className="category-name">{category}</span>
              <span className="category-count">({tools.length})</span>
              <span className={`expand-icon ${expandedCategories[category] ? 'expanded' : ''}`}>
                ▼
              </span>
            </div>

            {expandedCategories[category] && (
              <div className="tools-list">
                {tools.map((tool) => (
                  <div 
                    key={tool.name}
                    className="tool-item"
                    onClick={() => handleToolClick(tool)}
                  >
                    <div className="tool-name">{tool.name}</div>
                    <div className="tool-description">{tool.description}</div>
                    {Object.keys(tool.parameters).length > 0 && (
                      <div className="tool-params">
                        Parameters: {Object.keys(tool.parameters).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MCPToolsPanel;
