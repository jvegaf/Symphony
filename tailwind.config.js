/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  safelist: [
    'text-primary',
    'text-gray-600',
    'text-gray-500',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff8eb',
          100: '#ffecc6',
          200: '#ffd588',
          300: '#ffb94a',
          400: '#ffa020',
          500: '#fa8905',
          600: '#dd6502',
          700: '#b74506',
          800: '#94350c',
          900: '#7a2d0d',
          950: '#461502',
          DEFAULT: '#fa8905',
        },
        'background-light': '#f8f7f5',
        'background-dark': '#231a0f',
      },
      fontFamily: {
        sans: ['Spline Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
