/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        surface: {
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          3: 'hsl(var(--surface-3))',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
        softDark: '0 1px 2px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.25)',
        lift: '0 10px 30px rgba(0,0,0,0.08)',
      },
      keyframes: {
        fade: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        pop: { '0%': { transform: 'scale(.98)' }, '100%': { transform: 'scale(1)' } },
        underline: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        fade: 'fade 250ms ease-out',
        pop: 'pop 160ms ease-out',
      },
    },
  },
  // tailwind.config.js (add inside extend)
colors: {
  neon: {
    50: '#f5f7ff',
    400: '#8b5cf6',
    500: '#7c3aed',
    600: '#6d28d9'
  }
},
backgroundImage: {
  'futuristic-sm': 'radial-gradient(circle at 10% 10%, rgba(124,58,237,0.12), transparent 10%), radial-gradient(circle at 90% 90%, rgba(59,130,246,0.06), transparent 8%)'
},
boxShadow: {
  'neon-soft': '0 10px 30px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.02)'
},
transformOrigin: { '3d-top': '50% 10%' },

  plugins: [],
};