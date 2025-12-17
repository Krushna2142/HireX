/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'], // required for shadcn
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './features/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};