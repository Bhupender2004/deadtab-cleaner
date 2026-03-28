/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4fa',
          100: '#e1e8f5',
          200: '#c8d6eb',
          300: '#a3bcdd',
          400: '#799ecc',
          500: '#5a82bb',
          600: '#466aa0',
          700: '#3a5684',
          800: '#32486e',
          900: '#162036',
          950: '#0f1729', // Main bg
        },
        purple: {
          accent: '#7c3aed',
          light: '#a78bfa',
          glow: 'rgba(124, 58, 237, 0.35)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'card-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(248, 250, 252, 0.9))',
        'accent-gradient': 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(255, 255, 255, 0.8))',
      }
    },
  },
  plugins: [],
}
