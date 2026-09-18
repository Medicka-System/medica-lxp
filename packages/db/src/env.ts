/**
 * Carga el entorno desde el `.env` de la RAÍZ del monorepo (no el de packages/db)
 * y resuelve rutas compartidas por los scripts de datos.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

// CommonJS: __dirname es packages/db/src (tsx) o packages/db/dist (compilado);
// en ambos casos, ../../.. es la raíz del monorepo.
export const ROOT_DIR = resolve(__dirname, '../../..');
export const MIGRATIONS_DIR = resolve(ROOT_DIR, 'supabase/migrations');

loadEnv({ path: resolve(ROOT_DIR, '.env') });

/**
 * URL de conexión a Postgres. En LOCAL es el superusuario del contenedor (`lxp`),
 * usado para migrar/sembrar. api/worker usarán la service_role key vía Supabase.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL no está definido. Copia .env.example a .env (raíz del repo).',
    );
  }
  return url;
}
