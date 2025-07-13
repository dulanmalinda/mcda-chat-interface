// src/components/ModelSelector/ModelSelector.jsx
import React, { useState } from 'react';
import { formatModelSize } from '../../utils/ollamaApi';

const ModelSelector = ({ models, currentModel, onModelChange, modelInfo, disabled }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleModelChange = (e) => {
    onModelChange(e.target.value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const getModelDisplayName = (model) => {
    if (typeof model === 'string') return model;
    return model.name || model;
  };

  const getModelSize = (model) => {
    if (typeof model === 'object' && model.size) {
      return formatModelSize(model.size);
    }
    return '';
  };

  return (
    <div className="model-selector">
      <select
        value={currentModel}
        onChange={handleModelChange}
        disabled={disabled}
        className="model-dropdown"
      >
        {models.map((model) => {
          const name = getModelDisplayName(model);
          const size = getModelSize(model);
          return (
            <option key={name} value={name}>
              {name} {size && `(${size})`}
            </option>
          );
        })}
      </select>

      {modelInfo && (
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="model-info-toggle"
          title="Show/hide model details"
        >
          ℹ️
        </button>
      )}

      {showDetails && modelInfo && (
        <div className="model-details-popup">
          <div className="model-details-content">
            <div className="model-details-header">
              <h3>Model Information</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="close-details"
              >
                ✕
              </button>
            </div>
            
            <div className="model-details-body">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{currentModel}</span>
              </div>
              
              {modelInfo.details && (
                <>
                  {modelInfo.details.parameter_size && (
                    <div className="detail-item">
                      <span className="detail-label">Parameters:</span>
                      <span className="detail-value">{modelInfo.details.parameter_size}</span>
                    </div>
                  )}
                  
                  {modelInfo.details.format && (
                    <div className="detail-item">
                      <span className="detail-label">Format:</span>
                      <span className="detail-value">{modelInfo.details.format}</span>
                    </div>
                  )}
                  
                  {modelInfo.details.family && (
                    <div className="detail-item">
                      <span className="detail-label">Family:</span>
                      <span className="detail-value">{modelInfo.details.family}</span>
                    </div>
                  )}
                  
                  {modelInfo.details.quantization_level && (
                    <div className="detail-item">
                      <span className="detail-label">Quantization:</span>
                      <span className="detail-value">{modelInfo.details.quantization_level}</span>
                    </div>
                  )}
                </>
              )}
              
              {modelInfo.modelfile && (
                <div className="detail-item">
                  <span className="detail-label">Template:</span>
                  <pre className="modelfile-preview">
                    {modelInfo.template || 'Default template'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;