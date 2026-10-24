import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import './ui.css';

export const Card = ({
  children,
  className = '',
  hoverable = false,
  padding = 'normal',
  onClick,
  ...props
}) => {
  const classes = [
    'card',
    hoverable ? 'card-hoverable' : '',
    `card-padding-${padding}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

export const StatCard = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  iconBgColor = 'var(--primary-100)',
  iconColor = 'var(--primary-700)',
  trend,
  trendValue,
  badgeText,
  badgeType = 'success',
  className = ''
}) => {
  return (
    <Card className={`stat-card ${className}`} hoverable>
      <div className="stat-card-header">
        <div className="stat-card-info">
          <span className="stat-card-title">{title}</span>
          {badgeText && (
            <span className={`badge badge-${badgeType}`}>{badgeText}</span>
          )}
        </div>
        {Icon && (
          <div className="stat-card-icon" style={{ backgroundColor: iconBgColor, color: iconColor }}>
            <Icon size={22} />
          </div>
        )}
      </div>

      <div className="stat-card-body">
        <div className="stat-card-val-group">
          <span className="stat-card-value">{value}</span>
          {unit && <span className="stat-card-unit">{unit}</span>}
        </div>

        {trend && (
          <div className={`stat-card-trend trend-${trend}`}>
            {trend === 'up' && <ArrowUpRight size={16} />}
            {trend === 'down' && <ArrowDownRight size={16} />}
            {trend === 'stable' && <Minus size={16} />}
            <span>{trendValue || (trend === 'up' ? '+3.2%' : trend === 'down' ? '-1.8%' : 'Optimal')}</span>
          </div>
        )}

        {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
      </div>
    </Card>
  );
};
