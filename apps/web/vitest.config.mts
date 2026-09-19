import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Config de tests de `apps/web`. Cubre componentes (`components/**`) y la lógica
// pura de `lib/**` (p. ej. fórmulas de calculadoras); su alcance puede crecer.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['components/**/*.test.{ts,tsx}', 'lib/**/*.test.{ts,tsx}'],
    testTimeout: 15000,
  },
});
