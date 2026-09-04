/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        stone: {
          25: '#FDFCFB',
          50: '#FAFAF9',
          75: '#F7F7F6',
          100: '#F5F5F4',
          150: '#EEEEEC',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          850: '#1C1917',
          900: '#1C1917',
          950: '#0C0A09',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'metric-hero': ['3rem', { lineHeight: '1', letterSpacing: '-0.025em', fontWeight: '800' }],
        'metric-lg': ['1.875rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '800' }],
        'metric': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'label': ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '500' }],
      },
      borderRadius: {
        'sf': '8px',
        'sf-lg': '12px',
      },
      boxShadow: {
        'sf-sm': '0 1px 2px 0 rgba(0,0,0,0.03)',
        'sf': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
