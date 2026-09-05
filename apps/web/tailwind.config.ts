import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0E14',
        surface: {
          DEFAULT: '#121824',
          subtle: '#182030',
          elevated: '#1F293D',
          hover: '#2A364F',
        },
        border: {
          subtle: '#1E293B',
          DEFAULT: '#273549',
          strong: '#3B4D66',
        },
        brand: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          muted: 'rgba(59, 130, 246, 0.15)',
        },
        bullish: {
          DEFAULT: '#10B981',
          hover: '#059669',
          muted: 'rgba(16, 185, 129, 0.15)',
          glow: 'rgba(16, 185, 129, 0.3)',
        },
        bearish: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          muted: 'rgba(239, 68, 68, 0.15)',
          glow: 'rgba(239, 68, 68, 0.3)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
