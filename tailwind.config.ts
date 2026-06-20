import type { Config } from 'tailwindcss';

// Design tokens trích từ DESIGN.md (cream + coral Anthropic palette)
export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#faf9f5',
        primary: { DEFAULT: '#cc785c', active: '#a9583e', disabled: '#e6dfd8' },
        'surface-card': '#efe9de',
        'surface-dark': '#181715',
        hairline: '#e6dfd8',
        ink: '#141413',
        muted: '#73726c',
        'on-primary': '#ffffff',
        'on-dark': '#faf9f5',
        success: '#3d8a5f',
        warning: '#b8842a',
        danger: '#b3402f',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      spacing: {
        section: '96px',
      },
      fontFamily: {
        display: ['"Tiempos Headline"', '"Cormorant Garamond"', 'Garamond', '"Times New Roman"', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
