import type { Config } from 'tailwindcss';

// Design tokens trích từ DESIGN.md (cream + coral Anthropic palette)
export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nền kem hơi sâu để card trắng nổi lên
        canvas: '#f4f1ea',
        primary: { DEFAULT: '#cc785c', active: '#a9583e', soft: '#f4e3db', disabled: '#e6dfd8' },
        // Card = trắng ngà nổi trên nền kem; sunken = chip/input lồng trong card
        'surface-card': '#fffdf9',
        'surface-sunken': '#f1ede4',
        'surface-dark': '#181715',
        hairline: '#e7e0d3',
        'hairline-strong': '#d8cfbe',
        ink: '#141413',
        muted: '#73726c',
        'on-primary': '#ffffff',
        'on-dark': '#faf9f5',
        success: { DEFAULT: '#3d8a5f', soft: '#e3f0e8' },
        warning: { DEFAULT: '#b8842a', soft: '#f6ecd6' },
        danger: { DEFAULT: '#b3402f', soft: '#f6e1dc' },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        pill: '9999px',
      },
      boxShadow: {
        // Thang elevation nhất quán cho card / nav / modal
        card: '0 1px 2px rgba(38,28,20,0.04), 0 2px 6px rgba(38,28,20,0.06)',
        'card-hover': '0 2px 6px rgba(38,28,20,0.07), 0 8px 20px rgba(38,28,20,0.09)',
        nav: '0 -1px 2px rgba(38,28,20,0.04), 0 -4px 14px rgba(38,28,20,0.06)',
        modal: '0 12px 40px rgba(38,28,20,0.22)',
        focus: '0 0 0 3px rgba(204,120,92,0.18)',
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
