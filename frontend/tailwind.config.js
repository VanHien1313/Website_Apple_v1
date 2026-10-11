/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        muted: 'var(--color-muted)',
        background: 'var(--color-background)',
        surface: {
          subtle: 'var(--color-surface-subtle)',
          elevated: 'var(--color-surface-elevated)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          hover: 'var(--color-border-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          light: 'var(--color-accent-light)',
        },
        promo: {
          DEFAULT: '#D97706',
          bg: '#FEF3C7',
        },
        apple: {
          dark: '#1D1D1F',
          gray: '#86868B',
          light: '#F5F5F7',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.04), 0 1px 4px -1px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 12px 24px -6px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03)',
        'dropdown': '0 16px 32px -8px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
        'xl': '24px',
      },
      maxWidth: {
        '7xl': '80rem',
      }
    },
  },
  plugins: [],
};
