import type { Config } from 'tailwindcss';

/**
 * Preset de Tailwind compartido — mapea los tokens del sistema de diseño (§5A)
 * a utilidades semánticas (bg-card, text-secondary, bg-sidebar…). Los valores
 * viven como variables CSS en `globals.css` (fuente de verdad visual); aquí solo
 * se referencian. NO hardcodear hex en TSX.
 */
const preset = {
  content: [],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'foreground-soft': 'var(--foreground-soft)',
        track: 'var(--track)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
          surface: 'var(--destructive-surface)',
          border: 'var(--destructive-border)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
          surface: 'var(--warning-surface)',
          border: 'var(--warning-border)',
        },
        info: {
          DEFAULT: 'var(--info)',
          foreground: 'var(--info-foreground)',
          surface: 'var(--info-surface)',
          border: 'var(--info-border)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        control: 'var(--radius-control)',
        hero: 'var(--radius-hero)',
        pill: 'var(--radius-pill)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        rest: 'var(--shadow-rest)',
      },
      maxWidth: {
        content: 'var(--content-max)',
      },
    },
  },
  plugins: [],
} satisfies Partial<Config>;

export default preset;
