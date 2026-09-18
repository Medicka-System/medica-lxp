/**
 * Config de Drizzle Kit. La FUENTE DE VERDAD de las migraciones es el SQL
 * versionado en `supabase/migrations` (aplicado por `src/migrate.ts`). Este
 * archivo habilita `drizzle-kit` para INTROSPECCIÓN/generación de tipos contra
 * la BD local cuando haga falta; NO se usa para migrar (§4: SQL versionado).
 */
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  schemaFilter: ['lxp'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
