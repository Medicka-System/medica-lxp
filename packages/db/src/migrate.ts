/**
 * Runner de migraciones del LXP. Aplica en orden los `.sql` de
 * `supabase/migrations` (fuente de verdad · §4) y registra los aplicados en
 * `lxp._migraciones`. Idempotente: no reaplica lo ya corrido.
 *
 * Uso:
 *   tsx src/migrate.ts up            → aplica pendientes
 *   tsx src/migrate.ts new <nombre>  → crea el siguiente 000N_<nombre>.sql
 *
 * ⚠️ Solo toca el esquema `lxp` (+ el mock local de `public` en 0009). Jamás la
 *    CORA real (§10). En este sprint apunta a la BD LOCAL del docker-compose.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MIGRATIONS_DIR, getMigrationTarget, getDirectUrl } from './env';
import { createSql } from './client';

/** Hosts que consideramos Postgres LOCAL (docker-compose / máquina de desarrollo). */
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);

function hostDe(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Candado de seguridad (§10): evita aplicar por error el perfil equivocado contra
 * la BD equivocada. Con `target=local` el runner aplica los shims SOLO_LOCAL (auth
 * mock + `public.*` de CORA); ejecutarlos contra la BD COMPARTIDA crearía mocks
 * sobre datos reales. Por eso `target=local` SOLO se permite contra un host local.
 */
function verificarDestino(target: string, url: string): void {
  const host = hostDe(url);
  const esLocal = HOSTS_LOCALES.has(host);
  if (target === 'local' && !esLocal) {
    throw new Error(
      `RECHAZADO: MIGRATION_TARGET=local pero DIRECT_URL/DATABASE_URL apunta a un host REMOTO (${host}).\n` +
        `  Los shims SOLO_LOCAL crearían mocks de auth/CORA en una BD compartida (§10).\n` +
        `  · Para un destino remoto (Supabase): usa MIGRATION_TARGET=supabase.\n` +
        `  · Para local: apunta DIRECT_URL/DATABASE_URL a Postgres local (localhost:5432).`,
    );
  }
  if (target !== 'local' && esLocal) {
    console.warn(
      `⚠️  MIGRATION_TARGET=${target} pero el host parece LOCAL (${host}). ` +
        `Se OMITIRÁN los shims SOLO_LOCAL — el entorno local podría quedar incompleto.`,
    );
  }
}

/**
 * Migraciones SOLO-LOCALES (§10): shims que en producción provee la plataforma /
 * posee CORA. Se OMITEN cuando el destino no es `local`:
 *   • 0000_local_auth_cora_shim.sql — esquema `auth` + auth.users + auth.uid/jwt/role
 *     + roles de plataforma (anon/authenticated/service_role). En Supabase ya existen.
 *   • 0009_cora_mock.sql — tablas falsas `public.*` de CORA + trigger + RLS. En la BD
 *     compartida las tablas reales de CORA ya existen; el LXP jamás las crea (§10, r.3).
 * Los PUENTES de lectura CORA→LXP (`lxp.cora_*`) viven en `0009_cora_puente_lxp.sql`,
 * que SÍ corre en ambos destinos (esquema `lxp`; lee `public` real en Supabase).
 */
const SOLO_LOCAL = new Set([
  '0000_local_auth_cora_shim.sql',
  '0009_cora_mock.sql',
]);

/**
 * Migraciones SOLO-SUPABASE: usan el esquema `realtime` (lo provee la plataforma
 * Supabase; NO existe en el Postgres local). Se OMITEN cuando el destino es `local`.
 *   • 0073_realtime_canales.sql — RLS de `realtime.messages` (gate de canal) + triggers
 *     que emiten por `realtime.send`. La LÓGICA de autorización (lxp.rt_puede_escuchar,
 *     mig 0072) sí corre en ambos destinos y se prueba en test:rls.
 */
const SOLO_SUPABASE = new Set([
  '0073_realtime_canales.sql',
]);

async function listMigrations(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

async function up(): Promise<void> {
  const target = getMigrationTarget();
  // Candado de seguridad ANTES de abrir conexión o crear el esquema de control:
  // rechaza target=local contra un host remoto (§10, evita mocks sobre CORA real).
  verificarDestino(target, getDirectUrl());
  // DDL → conexión DIRECTA de sesión (:5432). El pooler de transacción (:6543) no
  // sirve para migrar; ver client.ts / env.getDirectUrl (§11).
  const sql = createSql({ max: 1, direct: true });
  try {
    // Tabla de control en NUESTRO esquema (no en public de CORA).
    await sql.unsafe(`
      create schema if not exists lxp;
      create table if not exists lxp._migraciones (
        nombre text primary key,
        aplicada_en timestamptz not null default now()
      );
    `);

    const aplicadas = new Set(
      (await sql`select nombre from lxp._migraciones`).map(
        (r) => r.nombre as string,
      ),
    );

    const files = await listMigrations();
    const pendientes = files
      .filter((f) => !aplicadas.has(f))
      // Omite los shims solo-locales cuando el destino es remoto (§10).
      .filter((f) => {
        if (target !== 'local' && SOLO_LOCAL.has(f)) {
          console.log(`↷ omitida (SOLO_LOCAL · target=${target}): ${f}`);
          return false;
        }
        if (target === 'local' && SOLO_SUPABASE.has(f)) {
          console.log(`↷ omitida (SOLO_SUPABASE · target=${target}): ${f}`);
          return false;
        }
        return true;
      });

    console.log(`· destino de migración: ${target}`);

    if (pendientes.length === 0) {
      console.log('✓ Sin migraciones pendientes.');
      return;
    }

    for (const file of pendientes) {
      const contenido = await readFile(resolve(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`→ aplicando ${file} ... `);
      await sql.begin(async (tx) => {
        await tx.unsafe(contenido);
        await tx`insert into lxp._migraciones (nombre) values (${file})`;
      });
      console.log('ok');
    }
    console.log(`✓ ${pendientes.length} migración(es) aplicada(s).`);
  } finally {
    await sql.end();
  }
}

async function nueva(nombre: string): Promise<void> {
  if (!nombre) {
    throw new Error('Falta el nombre: tsx src/migrate.ts new <nombre>');
  }
  const files = await listMigrations();
  const ultimos = files
    .map((f) => Number.parseInt(f.slice(0, 4), 10))
    .filter((n) => !Number.isNaN(n));
  const siguiente = (ultimos.length ? Math.max(...ultimos) : 0) + 1;
  const prefijo = String(siguiente).padStart(4, '0');
  const slug = nombre.trim().replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const archivo = `${prefijo}_${slug}.sql`;
  const ruta = resolve(MIGRATIONS_DIR, archivo);
  await writeFile(
    ruta,
    `-- ${archivo}\n-- LXP · solo esquema lxp; jamás public de CORA (§10).\n\n`,
    { flag: 'wx' },
  );
  console.log(`✓ creada supabase/migrations/${archivo}`);
}

const [, , cmd, ...rest] = process.argv;
const run =
  cmd === 'new' ? nueva(rest.join(' ')) : cmd === 'up' || !cmd ? up() : null;

if (run === null) {
  console.error(`Comando desconocido: ${cmd}. Usa "up" o "new <nombre>".`);
  process.exit(1);
}

run
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✗ migración falló:', err);
    process.exit(1);
  });
