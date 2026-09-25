/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas-rgb) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
          subtle: 'rgb(var(--surface-subtle-rgb) / <alpha-value>)',
          strong: 'rgb(var(--surface-strong-rgb) / <alpha-value>)',
        },
        brand: {
          950: 'rgb(var(--brand-950-rgb) / <alpha-value>)',
          900: 'rgb(var(--brand-900-rgb) / <alpha-value>)',
          800: 'rgb(var(--brand-800-rgb) / <alpha-value>)',
          700: 'rgb(var(--brand-700-rgb) / <alpha-value>)',
          100: 'rgb(var(--brand-100-rgb) / <alpha-value>)',
          50: 'rgb(var(--brand-50-rgb) / <alpha-value>)',
        },
        civicGold: {
          700: 'rgb(var(--gold-700-rgb) / <alpha-value>)',
          500: 'rgb(var(--gold-500-rgb) / <alpha-value>)',
          100: 'rgb(var(--gold-100-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted-rgb) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line-rgb) / <alpha-value>)',
          strong: 'rgb(var(--line-strong-rgb) / <alpha-value>)',
        },
        civic: {
          info: 'rgb(var(--info-rgb) / <alpha-value>)',
          infoSoft: 'rgb(var(--info-soft-rgb) / <alpha-value>)',
          infoLine: 'rgb(var(--info-line-rgb) / <alpha-value>)',
          warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
          warningSoft: 'rgb(var(--warning-soft-rgb) / <alpha-value>)',
          warningLine: 'rgb(var(--warning-line-rgb) / <alpha-value>)',
          danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
          dangerSoft: 'rgb(var(--danger-soft-rgb) / <alpha-value>)',
          dangerLine: 'rgb(var(--danger-line-rgb) / <alpha-value>)',
          success: 'rgb(var(--success-rgb) / <alpha-value>)',
          successSoft: 'rgb(var(--success-soft-rgb) / <alpha-value>)',
          successLine: 'rgb(var(--success-line-rgb) / <alpha-value>)',
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
