import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  disabled,
  loading = false,
  type = 'button',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'min-h-9 text-xs px-3.5 py-2 gap-1.5 rounded-md',
    md: 'min-h-11 text-sm px-5 py-2.5 gap-2 rounded-md',
    lg: 'min-h-12 text-base px-7 py-3.5 gap-2.5 rounded-md',
  }[size];

  const variantClasses = {
    primary: 'bg-accent text-on-accent hover:bg-accent-hover shadow-sm',
    secondary: 'bg-surface-subtle text-primary hover:bg-accent-light',
    outline: 'bg-transparent text-primary border border-border-hover hover:bg-surface-subtle',
    ghost: 'bg-transparent text-accent hover:text-accent-hover hover:bg-accent-light',
    danger: 'bg-danger text-on-danger hover:opacity-90',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" /> : icon && <span aria-hidden="true" className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
