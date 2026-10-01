/**
 * @campus/db — dueño del esquema `lxp` (migraciones SQL, cliente Drizzle, seed).
 *
 * ORM del proyecto (decidido en Sprint 1): **Drizzle** — SQL-first, multi-esquema
 * y compatible con RLS/pgvector/SECURITY DEFINER (§3). No se mezcla con Prisma.
 *
 * Las migraciones del LXP tocan SOLO el esquema `lxp` (+ el mock local de `public`
 * en 0009); jamás la CORA real (§4/§10).
 */
export const DB_SCHEMA_OWNER = 'lxp' as const;

export { createSql, createDb, schema, type Sql } from './client';
export {
  getDatabaseUrl,
  getDirectUrl,
  getMigrationTarget,
  type MigrationTarget,
  ROOT_DIR,
  MIGRATIONS_DIR,
} from './env';
export * from './schema/index';
