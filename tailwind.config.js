/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Monochrome Palette (Lightened)
        'bg-primary': '#111111',      // Main background (slightly lighter)
        'bg-secondary': '#1a1a1a',    // Card background
        'bg-elevated': '#222222',     // Elevated surfaces
        'bg-hover': '#282828',        // Hover states
        
        'text-primary': '#ffffff',       // Primary text (pure white)
        'text-secondary': '#a3a3a3',     // Secondary text (neutral-400)
        'text-tertiary': '#737373',      // Tertiary text (neutral-500)
        'text-disabled': '#525252',      // Disabled text (neutral-600)
        
        'border-primary': '#2a2a2a',       // Borders (slightly lighter)
        'border-secondary': '#242424',     // Dividers
        'border-focus': '#404040',         // Focus rings (neutral-700)
        'border-highlight': '#303030',     // Subtle highlights
        
        'accent-white': '#ffffff',         // Pure white accents
        'accent-subtle': '#1f1f1f',        // Subtle white overlay (solid color)
        'accent-glow': 'rgba(255,255,255,0.1)',    // Glow effects
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
        'sm': ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.6' }],
        'lg': ['18px', { lineHeight: '1.6' }],
        'xl': ['20px', { lineHeight: '1.5' }],
        '2xl': ['24px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        '3xl': ['32px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        'micro': ['10px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
        'caption': ['12px', { lineHeight: '1.5' }],
      },
      spacing: {
        // 8px grid system
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '1.5': '0.375rem',  // 6px
        '2': '0.5rem',      // 8px
        '2.5': '0.625rem',  // 10px
        '3': '0.75rem',     // 12px
        '3.5': '0.875rem',  // 14px
        '4': '1rem',        // 16px
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px
        '7': '1.75rem',     // 28px
        '8': '2rem',        // 32px
        '9': '2.25rem',     // 36px
        '10': '2.5rem',     // 40px
        '11': '2.75rem',    // 44px
        '12': '3rem',       // 48px
        '14': '3.5rem',     // 56px
        '16': '4rem',       // 64px
        '18': '4.5rem',     // 72px
        '20': '5rem',       // 80px
        '22': '5.5rem',     // 88px
        '24': '6rem',       // 96px
        '26': '6.5rem',     // 104px
        '28': '7rem',       // 112px
        '30': '7.5rem',     // 120px
        '32': '8rem',       // 128px
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'premium': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'premium-lg': '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
        'premium-xl': '0 8px 24px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4)',
        'glow': '0 0 20px rgba(255,255,255,0.15)',
        'glow-lg': '0 0 40px rgba(255,255,255,0.25)',
        'message': '0 2px 8px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
        'input-focus': '0 0 0 4px rgba(255,255,255,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'scale-hover': 'scaleHover 0.2s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'bounce-sequence': 'bounceSequence 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        scaleHover: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.02)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(255,255,255,0.1)' },
          '100%': { boxShadow: '0 0 40px rgba(255,255,255,0.2)' },
        },
        bounceSequence: {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-6px)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
