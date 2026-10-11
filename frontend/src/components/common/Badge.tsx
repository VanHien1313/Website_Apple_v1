import React from 'react';

export interface BadgeProps {
  label: string;
  variant?: 'new' | 'hot' | 'sale' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', className = '' }) => {
  const variantStyles = {
    new: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    hot: 'bg-rose-50 text-rose-700 border-rose-200/60',
    sale: 'bg-amber-50 text-amber-800 border-amber-200/60',
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
