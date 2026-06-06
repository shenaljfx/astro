/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#9333EA',
          gold: '#FBBF24',
          deep: '#04030C',
        },
        cosmic: {
          dark: '#0a0a1a',
          card: '#1a1a2e',
          border: '#2a2a4e',
        },
      },
    },
  },
  plugins: [],
};
