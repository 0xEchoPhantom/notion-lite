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
        background: {
          DEFAULT: '#ffffff',
          dark: '#191919',
        },
        foreground: {
          DEFAULT: '#171717',
          dark: '#ededed',
        },
        border: {
          DEFAULT: '#e5e5e5',
          dark: '#2f2f2f',
        },
        card: {
          DEFAULT: '#ffffff',
          dark: '#202020',
        },
        hover: {
          DEFAULT: '#f7f7f7',
          dark: '#2a2a2a',
        },
        muted: {
          DEFAULT: '#6b7280',
          dark: '#9ca3af',
        },
      },
    },
  },
  plugins: [],
};

export default config;