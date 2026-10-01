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

// Perfil de entorno (§10). Siempre se carga `.env` (LOCAL). Si `ENV_FILE` está
// definido (p. ej. `.env.supabase`), se superpone POR ENCIMA (override) — el gesto
// EXPLÍCITO para apuntar a un destino remoto. Sin ENV_FILE, el runner es 100% local.
loadEnv({ path: resolve(ROOT_DIR, '.env') });
if (process.env.ENV_FILE) {
  loadEnv({ path: resolve(ROOT_DIR, process.env.ENV_FILE), override: true });
}

/**
 * URL de conexión de RUNTIME (api/worker/web). En LOCAL es el superusuario del
 * contenedor (`lxp`) en :5432. En PRODUCCIÓN (Supabase) es el POOLER de transacción
 * (:6543) — por eso el cliente de runtime va con `prepare:false` (ver client.ts): el
 * pooler en modo transacción no admite prepared statements.
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

/**
 * URL de conexión DIRECTA a Postgres para DDL (migraciones/seed/tests). En Supabase
 * el DDL debe ir por la conexión directa de SESIÓN (:5432, `DIRECT_URL`), NO por el
 * pooler de transacción (:6543): el pooler no soporta bien DDL/statements de sesión.
 * En LOCAL no hay pooler, así que si `DIRECT_URL` no está definido caemos a
 * `DATABASE_URL` (que en local ya es la conexión directa :5432).
 */
export function getDirectUrl(): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Ni DIRECT_URL ni DATABASE_URL están definidos. Copia .env.example a .env (raíz del repo).',
    );
  }
  return url;
}

/**
 * Perfil de destino de las migraciones (§10). `local` (default) aplica TODO,
 * incluidos los shims solo-locales (auth mock + CORA mock). `supabase` OMITE los
 * archivos marcados `[SOLO_LOCAL]` (los provee la plataforma / los posee CORA).
 * Cualquier valor distinto de `local` se trata como destino remoto (skip de shims).
 */
export type MigrationTarget = 'local' | 'supabase';

export function getMigrationTarget(): MigrationTarget {
  const raw = (process.env.MIGRATION_TARGET ?? 'local').trim().toLowerCase();
  if (raw === 'local') return 'local';
  // `supabase` SOLO por valor EXPLÍCITO y exacto. Nunca por default, nunca por typo:
  // cualquier otro valor es un error (evita que un `MIGRATION_TARGET=prod`/`remote`
  // caiga silenciosamente en supabase y migre CORA por accidente · §10).
  if (raw === 'supabase') return 'supabase';
  throw new Error(
    `MIGRATION_TARGET inválido: "${raw}". Usa 'local' (default) o 'supabase' (explícito).`,
  );
}
