/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0D0F',
        surface: '#121518',
        elevated: '#1A1E23',
        border: 'rgba(255,255,255,0.08)',
        primary: { DEFAULT: '#10B981', hover: '#34D399' },
        danger: '#F87171',
        warning: '#FBBF24',
        info: '#60A5FA',
        audit: '#A78BFA',
        txt: { DEFAULT: '#F4F5F6', muted: '#9CA3AF' },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 20px rgba(0,0,0,0.35)',
        glow: '0 0 0 1px rgba(16,185,129,0.4), 0 8px 30px rgba(16,185,129,0.15)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'slide-in': { '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'slide-in': 'slide-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
