/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        brand: {
          50: '#f4f6fe',
          100: '#ebf0fe',
          200: '#dce5fe',
          300: '#c3d0fd',
          400: '#a3b4fc',
          500: '#7f93fa',
          600: '#5e6ff5',
          700: '#4c57e2',
          800: '#3f46ba',
          900: '#373f95',
          950: '#212457',
        },
      },
    },
  },
  plugins: [],
}
