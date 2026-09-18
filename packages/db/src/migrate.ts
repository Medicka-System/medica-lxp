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
import { MIGRATIONS_DIR } from './env';
import { createSql } from './client';

async function listMigrations(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

async function up(): Promise<void> {
  const sql = createSql({ max: 1 });
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
    const pendientes = files.filter((f) => !aplicadas.has(f));

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
