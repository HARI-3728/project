import React from 'react';
import { Loader2 } from 'lucide-react';
import './ui.css';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const combinedClasses = [baseClass, variantClass, sizeClass, className].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={combinedClasses}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="btn-spinner animate-spin" size={18} />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="btn-icon" size={size === 'sm' ? 16 : 18} />}
          {children && <span>{children}</span>}
          {Icon && iconPosition === 'right' && <Icon className="btn-icon" size={size === 'sm' ? 16 : 18} />}
        </>
      )}
    </button>
  );
};
