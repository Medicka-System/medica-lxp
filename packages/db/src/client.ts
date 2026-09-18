/**
 * Cliente de datos del LXP: driver postgres.js + Drizzle ORM.
 *
 * ORM elegido en el Sprint 1: **Drizzle** (SQL-first, multi-esquema `lxp`/`public`/
 * `auth`, pgvector y RLS/SECURITY DEFINER sin fricción · §3). No se mezcla con Prisma.
 *
 * Las MIGRACIONES son SQL versionado en `supabase/migrations` (fuente de verdad).
 * Este cliente da acceso TIPADO para `api`/`worker`; el schema Drizzle crece por
 * sprint conforme cada dominio necesita queries tipadas (hoy: identidad · §6).
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseUrl } from './env';
import * as schema from './schema/index';

export type Sql = ReturnType<typeof postgres>;

/** Crea una conexión postgres.js cruda (para migraciones/seed/tests). */
export function createSql(opts?: { max?: number }): Sql {
  return postgres(getDatabaseUrl(), {
    max: opts?.max ?? 10,
    onnotice: () => {}, // silencia los NOTICE de CREATE ... IF NOT EXISTS
  });
}

/** Cliente Drizzle tipado para `api`/`worker`. */
export function createDb(sql?: Sql) {
  const conn = sql ?? createSql();
  return drizzle(conn, { schema });
}

export { schema };
