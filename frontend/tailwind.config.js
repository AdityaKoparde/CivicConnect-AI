/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        civic: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8ec6ff',
          400: '#59a5ff',
          500: '#3381ff',
          600: '#1b5ff5',
          700: '#144ae1',
          800: '#173db6',
          900: '#19388f',
          950: '#142356',
        },
        saffron: {
          400: '#ff9933',
          500: '#f97316',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16, 42, 94, 0.08), 0 8px 24px rgba(16, 42, 94, 0.06)',
      },
    },
  },
  plugins: [],
};
