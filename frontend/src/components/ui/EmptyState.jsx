import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';
import './ui.css';

export const EmptyState = ({
  icon: Icon = FolderOpen,
  title = 'No Records Found',
  description = 'There are no items to display right now.',
  actionText,
  onAction,
  actionIcon
}) => {
  return (
    <div className="empty-state-container fade-in">
      <div className="empty-state-icon">
        <Icon size={40} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionText && onAction && (
        <Button
          variant="primary"
          icon={actionIcon}
          onClick={onAction}
          className="empty-state-btn"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
};
