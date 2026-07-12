/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Playful Enterprise" — Odoo-inspired white & plum
        bg: '#FFFFFF',
        'bg-alt': '#F4F2F8',
        surface: '#FFFFFF',
        elevated: '#F3F4F6',
        border: '#EBEBF0',
        primary: { DEFAULT: '#714B67', hover: '#5D3E55' },
        tint: '#F3EDF1',
        highlight: '#FBB945', // marker yellow
        // Semantic status colors
        success: '#21B799', // teal — available / verified / resolved
        info: '#5B9BD5', // blue — allocated / booking / info
        warning: '#E9A93D', // ochre — pending / under-maintenance
        danger: '#E4585B', // red — overdue / blocked / missing / rejected
        neutral: '#8F8F9F', // warm gray — retired / disposed / inactive
        audit: '#714B67', // (kept for back-compat; maps to plum)
        txt: { DEFAULT: '#1F2937', muted: '#6B7280' },
      },
      fontFamily: {
        // Caveat is decorative — only for designated headlines. Inter for all data.
        script: ['Caveat', 'ui-rounded', 'cursive'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(31,41,55,0.06)',
        hover: '0 6px 24px rgba(31,41,55,0.08)',
        elevated: '0 12px 40px rgba(31,41,55,0.12)',
        'primary-btn': '0 2px 8px rgba(113,75,103,0.28)',
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
