/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm dark palette — cribbed from Taiwan.md main site notebook aesthetic.
        bg: {
          base: '#1a1a1f',
          surface: '#22222a',
          raised: '#2a2a32',
          input: '#1f1f26',
        },
        line: '#2f2f38',
        text: {
          primary: '#e8e6e1',
          secondary: '#a0a0a8',
          muted: '#6e6e78',
        },
        accent: {
          green: '#10b981',
          'green-soft': '#34d399',
          amber: '#f59e0b',
          red: '#ef4444',
          blue: '#3b82f6',
          purple: '#a78bfa',
          orange: '#f97316',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang TC',
          'Noto Sans TC',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.02), 0 8px 24px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
