module.exports = {
 content: [
  './app/**/*.{ts,tsx,js,jsx,html}',
  './components/**/*.{ts,tsx,js,jsx,html}',
  './features/**/*.{ts,tsx,js,jsx,html}',
  './utils/**/*.{ts,tsx,js,jsx,html}',
],
  theme: {
    extend: {
      colors: {
        foreground: '#000000',
        background: '#ffffff',
        border: '#e5e7eb',
        card: '#f8fafc',
        'card-foreground': '#1f2937',
        'muted-foreground': '#6b7280',
      },
    },
  },
  plugins: [],
};