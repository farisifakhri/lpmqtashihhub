/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0F7F4',
          100: '#DDF0E7',
          200: '#BCE1D0',
          300: '#8ECBB1',
          400: '#5BAE8F',
          500: '#167A58',
          600: '#116447',
          700: '#0E5139',
          800: '#0B3F2D',
          900: '#083224',
          950: '#031C13',
        },
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        gold: {
          50: '#FDF9EE',
          100: '#F9F0D3',
          200: '#F2DEA5',
          300: '#E9C772',
          400: '#DFB045',
          500: '#C99320',
          600: '#A97516',
          700: '#865714',
          800: '#6E4515',
          900: '#5C3814',
        },
        status: {
          warning: '#D97706',
          danger: '#E11D48',
          info: '#0284C7',
          success: '#0E5139',
        },
        // Modern Civic Workspace tokens
        canvas: 'var(--canvas)',
        surface: {
          DEFAULT: 'var(--surface)',
          subtle: 'var(--surface-subtle)',
          strong: 'var(--surface-strong)',
        },
        brand: {
          950: 'var(--brand-950)',
          900: 'var(--brand-900)',
          800: 'var(--brand-800)',
          700: 'var(--brand-700)',
          100: 'var(--brand-100)',
          50: 'var(--brand-50)',
        },
        civicGold: {
          700: 'var(--gold-700)',
          500: 'var(--gold-500)',
          100: 'var(--gold-100)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        civic: {
          info: 'var(--info)',
          warning: 'var(--warning)',
          danger: 'var(--danger)',
          success: 'var(--success)',
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
