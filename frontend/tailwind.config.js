/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './app/_hooks/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'hsl(var(--color-brand))',
          foreground: 'hsl(var(--color-brand-foreground))'
        },
        bg: 'hsl(var(--color-bg))',
        text: 'hsl(var(--color-text))'
      }
    }
  },
  plugins: []
};