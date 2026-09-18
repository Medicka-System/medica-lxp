/**
 * Schema Drizzle · identidad (§6). Espejo TIPADO de `lxp.perfiles` para queries
 * en api/worker. La estructura definitiva vive en las migraciones SQL
 * (`supabase/migrations/0001_*`); esto NO genera DDL, solo tipa el acceso.
 *
 * El schema Drizzle crece por sprint: aquí solo identidad, que es lo que el
 * Sprint 1 necesita tipar. Las demás tablas de §6 se agregan cuando su sprint
 * las consuma con queries tipadas.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  pgSchema,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const lxp = pgSchema('lxp');

/** enum lxp.rol (§5B). Mismo orden que la migración 0001. */
export const rolEnum = lxp.enum('rol', [
  'super_admin',
  'admin',
  'docente',
  'disenador_instruccional',
  'alumno',
]);

export const perfiles = lxp.table('perfiles', {
  userId: uuid('user_id').primaryKey(),
  rol: rolEnum('rol').notNull(),
  nombre: text('nombre').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  accesoActivo: boolean('acceso_activo').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Perfil = typeof perfiles.$inferSelect;
export type NuevoPerfil = typeof perfiles.$inferInsert;
