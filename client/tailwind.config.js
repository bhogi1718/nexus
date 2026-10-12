/** @type {import('tailwindcss').Config} */

// Semantic colours resolve to CSS custom properties defined in index.css, so a
// theme swap is a variable change rather than a `dark:` prefix on every element.
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token('--c-bg'),
        surface: token('--c-surface'),
        'surface-sunken': token('--c-surface-sunken'),
        'surface-raised': token('--c-surface-raised'),
        'surface-accent': token('--c-surface-accent'),
        'surface-inverse': token('--c-surface-inverse'),

        content: token('--c-content'),
        'content-secondary': token('--c-content-secondary'),
        'content-muted': token('--c-content-muted'),
        'content-inverse': token('--c-content-inverse'),
        'content-on-primary': token('--c-content-on-primary'),

        border: token('--c-border'),
        'border-strong': token('--c-border-strong'),
        'border-interactive': token('--c-border-interactive'),

        primary: token('--c-primary'),
        'primary-hover': token('--c-primary-hover'),
        'primary-subtle': token('--c-primary-subtle'),

        accent: token('--c-accent'),
        'accent-strong': token('--c-accent-strong'),

        success: token('--c-success'),
        'success-subtle': token('--c-success-subtle'),
        danger: token('--c-danger'),
        'danger-subtle': token('--c-danger-subtle'),
        warning: token('--c-warning'),
        'warning-subtle': token('--c-warning-subtle'),
        read: token('--c-read'),
        'read-on-bubble': token('--c-read-on-bubble'),

        // Legacy Material-3 names kept as aliases so existing components recolour
        // without edits; being migrated to the semantic names above.
        background: token('--c-bg'),
        'surface-dim': token('--c-surface-sunken'),
        'surface-bright': token('--c-surface'),
        'surface-container-lowest': token('--c-surface'),
        'surface-container-low': token('--c-surface-raised'),
        'surface-container': token('--c-bg'),
        'surface-container-high': token('--c-surface-sunken'),
        'surface-container-highest': token('--c-surface-accent'),
        'surface-variant': token('--c-surface-accent'),
        'surface-tint': token('--c-accent'),
        'on-background': token('--c-content'),
        'on-surface': token('--c-content'),
        'on-surface-variant': token('--c-content-muted'),
        outline: token('--c-border-interactive'),
        'outline-variant': token('--c-border'),
        'inverse-surface': token('--c-surface-inverse'),
        'inverse-on-surface': token('--c-content-inverse'),
        'on-primary': token('--c-content-on-primary'),
        'primary-container': token('--c-primary'),
        'on-primary-container': token('--c-content-on-primary'),
        'primary-fixed': token('--c-primary-subtle'),
        'primary-fixed-dim': token('--c-accent'),
        'on-primary-fixed': token('--c-content'),
        'on-primary-fixed-variant': token('--c-content-secondary'),
        'inverse-primary': token('--c-accent'),
        secondary: token('--c-accent-strong'),
        'on-secondary': token('--c-content-on-primary'),
        'secondary-container': token('--c-surface-accent'),
        'on-secondary-container': token('--c-content'),
        'secondary-fixed': token('--c-surface-accent'),
        'secondary-fixed-dim': token('--c-accent'),
        'on-secondary-fixed': token('--c-content'),
        'on-secondary-fixed-variant': token('--c-content-secondary'),
        tertiary: token('--c-accent'),
        'on-tertiary': token('--c-content'),
        'tertiary-container': token('--c-surface-accent'),
        'on-tertiary-container': token('--c-content'),
        'tertiary-fixed': token('--c-surface-accent'),
        'tertiary-fixed-dim': token('--c-accent'),
        'on-tertiary-fixed': token('--c-content'),
        'on-tertiary-fixed-variant': token('--c-content-secondary'),
        error: token('--c-danger'),
        'on-error': token('--c-content-on-primary'),
        'error-container': token('--c-danger-subtle'),
        'on-error-container': token('--c-danger'),
      },

      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.375rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        full: '9999px',
      },

      spacing: {
        base: '4px',
        xs: '4px',
        sm: '8px',
        'gutter-mobile': '12px',
        md: '16px',
        'margin-mobile': '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
      },

      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'headline-md': ['Inter'],
        'headline-lg': ['Inter'],
        'headline-lg-mobile': ['Inter'],
        'body-sm': ['Inter'],
        'body-lg': ['Inter'],
        'label-caps': ['Inter'],
      },

      fontSize: {
        'display-xl': ['clamp(2.75rem, 6vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '600' }],
        'display-lg': ['clamp(2rem, 4.5vw, 3rem)', { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '600' }],
        'title-lg': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title-md': ['1rem', { lineHeight: '1.4', fontWeight: '600' }],
        'title-sm': ['0.9375rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['0.9375rem', { lineHeight: '1.55', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1.35', fontWeight: '500' }],
        'label-caps': ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '600' }],
        'headline-md': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-lg': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg-mobile': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
      },

      // Mauve-tinted shadows: a light theme needs real elevation where the old
      // dark theme leaned on glow.
      boxShadow: {
        xs: '0 1px 2px 0 rgb(62 42 58 / 0.05)',
        sm: '0 1px 3px 0 rgb(62 42 58 / 0.07), 0 1px 2px -1px rgb(62 42 58 / 0.06)',
        DEFAULT: '0 4px 12px -2px rgb(62 42 58 / 0.08), 0 2px 4px -2px rgb(62 42 58 / 0.05)',
        md: '0 8px 20px -4px rgb(62 42 58 / 0.10), 0 4px 8px -4px rgb(62 42 58 / 0.06)',
        lg: '0 16px 32px -8px rgb(62 42 58 / 0.12), 0 6px 12px -6px rgb(62 42 58 / 0.07)',
        xl: '0 28px 56px -12px rgb(62 42 58 / 0.18), 0 10px 20px -10px rgb(62 42 58 / 0.10)',
        '2xl': '0 40px 80px -20px rgb(62 42 58 / 0.22)',
        focus: '0 0 0 3px rgb(var(--c-accent) / 0.35)',
      },

      transitionTimingFunction: {
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
      },

      maxWidth: {
        reading: '48rem',
        content: '72rem',
      },
    },
  },
  plugins: [],
}
