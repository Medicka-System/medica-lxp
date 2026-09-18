import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import preset from '@campus/config/tailwind-preset';

// Preset compartido (§5A) — tokens semánticos. El content y los plugins locales
// se declaran aquí; los colores/geometría/tipografía vienen del preset.
export default {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  plugins: [animate],
} satisfies Config;
