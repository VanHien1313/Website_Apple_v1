import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../store/ThemeContext';

interface ThemeToggleProps {
  id?: string;
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  id,
  className = '',
  showLabel = false,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id={id}
      type="button"
      onClick={toggleTheme}
      className={`relative min-h-11 min-w-11 p-3 rounded-full text-secondary hover:text-primary hover:bg-surface-subtle transition-colors flex items-center justify-center gap-2 group cursor-pointer ${className}`}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon (Visible in Dark Mode) */}
        <Sun
          className={`w-4 h-4 text-amber-400 absolute transition-[color,background-color,transform,opacity] duration-300 transform ${
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0'
          }`}
        />
        {/* Moon Icon (Visible in Light Mode) */}
        <Moon
          className={`w-4 h-4 text-secondary group-hover:text-primary absolute transition-[color,background-color,transform,opacity] duration-300 transform ${
            isDark
              ? 'rotate-90 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100'
          }`}
        />
      </div>

      {showLabel && (
        <span className="text-xs font-medium text-primary">
          {isDark ? 'Giao diện sáng' : 'Giao diện tối'}
        </span>
      )}
    </button>
  );
};
