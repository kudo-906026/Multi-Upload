/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          youtube: '#FF0000',
          instagram: '#E1306C',
          purple: '#833AB4',
          dark: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          primary: '#6366F1',
          accent: '#EC4899',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
