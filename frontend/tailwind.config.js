/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — medical blue
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Neutral — black/white/grey scale
        neutral: {
          0:   '#ffffff',
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
          1000: '#000000',
        },
        // Semantic status colors
        success: {
          50:  '#f0fdf4',
          500: '#22c55e',
          700: '#15803d',
        },
        warning: {
          50:  '#fffbeb',
          500: '#f59e0b',
          700: '#b45309',
        },
        danger: {
          50:  '#fef2f2',
          500: '#ef4444',
          700: '#b91c1c',
        },
        info: {
          50:  '#eff6ff',
          500: '#3b82f6',
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Typographic scale
        'display': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'h1':      ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'h2':      ['1.5rem',   { lineHeight: '2rem',    fontWeight: '600' }],
        'h3':      ['1.25rem',  { lineHeight: '1.75rem', fontWeight: '600' }],
        'body':    ['1rem',     { lineHeight: '1.5rem',  fontWeight: '400' }],
        'sm':      ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'xs':      ['0.75rem',  { lineHeight: '1rem',    fontWeight: '400' }],
        'label':   ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'caption': ['0.75rem',  { lineHeight: '1rem',    fontWeight: '400' }],
      },
      spacing: {
        // 8px base grid — all spacing is a multiple of 8px (0.5rem)
        '0':  '0px',
        '1':  '0.25rem',  // 4px
        '2':  '0.5rem',   // 8px  ← base unit
        '3':  '0.75rem',  // 12px
        '4':  '1rem',     // 16px
        '5':  '1.25rem',  // 20px
        '6':  '1.5rem',   // 24px
        '8':  '2rem',     // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '20': '5rem',     // 80px
        '24': '6rem',     // 96px
        '32': '8rem',     // 128px
      },
      borderRadius: {
        'none': '0',
        'sm':   '0.25rem',
        DEFAULT: '0.375rem',
        'md':   '0.5rem',
        'lg':   '0.75rem',
        'xl':   '1rem',
        '2xl':  '1.5rem',
        'full': '9999px',
      },
      boxShadow: {
        'sm':  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md':  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg':  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl':  '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'card': '0 2px 8px 0 rgb(0 0 0 / 0.08)',
        'modal': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
