import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
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
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5 rounded-full',
    md: 'text-sm px-5 py-2.5 gap-2 rounded-full',
    lg: 'text-base px-7 py-3.5 gap-2.5 rounded-full',
  }[size];

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-black shadow-sm',
    secondary: 'bg-surface-subtle text-primary hover:bg-gray-200',
    outline: 'bg-transparent text-primary border border-border-hover hover:bg-surface-subtle',
    ghost: 'bg-transparent text-accent hover:text-accent-hover hover:bg-accent-light',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
