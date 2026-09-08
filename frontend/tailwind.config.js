/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          100: '#E3F3EA',
          500: '#1B7A4D',
          700: '#0B5E3B',
          800: '#08482D',
        },
        neutral: {
          50: '#F7F8F6',
          200: '#E1E4E0',
          500: '#8A8F8B',
          700: '#2A2E2B',
          900: '#141615',
        },
        gold: {
          50: '#FBF6E7',
          400: '#D4AF37',
          600: '#B8860B',
          700: '#946B08',
        },
        status: {
          warning: '#C77B2A',
          danger: '#B3261E',
          info: '#2E6F95',
          success: '#1B7A4D',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Amiri"', '"Traditional Arabic"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
