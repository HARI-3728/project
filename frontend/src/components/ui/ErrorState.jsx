import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import './ui.css';

export const ErrorState = ({
  title = 'Something Went Wrong',
  message = 'We encountered an error while loading this data. Please try again.',
  onRetry
}) => {
  return (
    <div className="error-state-container fade-in">
      <div className="error-state-icon">
        <AlertCircle size={40} />
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-msg">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          icon={RefreshCw}
          onClick={onRetry}
          className="error-state-btn"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
