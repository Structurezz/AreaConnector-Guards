/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#F8FAFC',
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        gold: {
          DEFAULT: '#10B981',
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow':  'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':    'slideIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':     'fadeIn 0.35s ease-out',
        'fade-up':     'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':    'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        slideIn: {
          '0%':   { transform: 'translateX(-24px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        card:      '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.05)',
        'card-md': '0 4px 16px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.06)',
        'card-lg': '0 12px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.08)',
        glow:      '0 0 20px rgba(16,185,129,0.20)',
        'glow-sm': '0 0 10px rgba(16,185,129,0.12)',
      },
    },
  },
  plugins: [],
};
