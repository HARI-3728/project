import React from 'react';
import { Loader2, Stethoscope } from 'lucide-react';
import './ui.css';

export const LoadingSpinner = ({ size = 28, text = 'Loading...' }) => (
  <div className="loading-spinner-container">
    <Loader2 className="animate-spin text-primary" size={size} />
    {text && <span className="loading-text">{text}</span>}
  </div>
);

export const SkeletonCard = ({ height = '160px' }) => (
  <div className="skeleton-card" style={{ height }}>
    <div className="skeleton-line title"></div>
    <div className="skeleton-line text"></div>
    <div className="skeleton-line short"></div>
  </div>
);

export const LoadingState = ({ count = 3, type = 'card' }) => {
  return (
    <div className="loading-state-wrapper">
      {type === 'spinner' ? (
        <div className="loading-full-page">
          <div className="loading-brand-icon">
            <Stethoscope size={36} />
          </div>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary-600)' }} />
          <p>Loading MediCare+ records...</p>
        </div>
      ) : (
        <div className="skeleton-grid">
          {Array.from({ length: count }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      )}
    </div>
  );
};
