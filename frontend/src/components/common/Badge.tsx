import React from 'react';

export interface BadgeProps {
  label: string;
  variant?: 'new' | 'hot' | 'sale' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', className = '' }) => {
  const variantStyles = {
    new: 'bg-success-soft text-success border-transparent',
    hot: 'bg-danger-soft text-danger border-transparent',
    sale: 'bg-warning-soft text-warning border-transparent',
    neutral: 'bg-surface-subtle text-secondary border-border-subtle',
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wide rounded-full border ${variantStyles} ${className}`}
    >
      {label}
    </span>
  );
};
