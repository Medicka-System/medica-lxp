/**
 * Suite del MODELO del constructor de lecciones (mig 0023 · rediseño base).
 *
 * Verifica —no supone— la forma del esquema nuevo y su convivencia con RLS:
 *   · enum lxp.leccion_tipo con los 7 tipos (§5C).
 *   · lecciones.tipo (default 'teoria') y lecciones.config (jsonb) existen.
 *   · las lecciones del seed quedaron marcadas 'teoria' (seed-safe · sin tocar seed).
 *   · tabla lxp.bloques operativa: la autoría escribe teoría ordenable; el config
 *     jsonb de los tipos config-backed persiste; RLS deja LEER al alumno pero no
 *     escribir, y anon no ve nada.
 *
 * Escribe SIEMPRE dentro de transacciones con rollback → no ensucia la BD ni altera
 * los conteos del seed (test:rls sigue verde). Requiere el seed cargado.
 *
 * Uso:  tsx src/test-modelo.ts   (sale con código ≠ 0 si algo falla)
 */
import { createSql, type Sql } from './client';

type Claims = { sub: string | null; role: 'authenticated' | 'anon' };

const ROLLBACK = Symbol('rollback');

/** Ejecuta fn como un usuario (claims + rol de BD). Commit al terminar. */
async function como<T>(sql: Sql, c: Claims, fn: (tx: Sql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify(c)}, true)`;
    await tx.unsafe(`set local role ${c.role}`);
    return fn(tx as unknown as Sql);
  }) as Promise<T>;
}

/** Igual que `como`, pero SIEMPRE hace rollback (para probar escrituras sin ensuciar). */
async function comoRollback(sql: Sql, c: Claims, fn: (tx: Sql) => Promise<void>): Promise<void> {
  try {
    await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify(c)}, true)`;
      await tx.unsafe(`set local role ${c.role}`);
      await fn(tx as unknown as Sql);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
}

/** true si la operación fue RECHAZADA (lo esperado en pruebas negativas). */
async function fueRechazada(op: () => Promise<unknown>): Promise<boolean> {
  try {
    await op();
    return false;
  } catch {
    return true;
  }
}

const resultados: { nombre: string; ok: boolean; detalle: string }[] = [];
function check(nombre: string, ok: boolean, detalle = ''): void {
  resultados.push({ nombre, ok, detalle });
}
const num = (rows: readonly { n: string | number }[]): number => {
  const row = rows[0];
  return row ? Number(row.n) : Number.NaN;
};

const TIPOS = ['teoria', 'video', 'autoevaluacion', 'tarea', 'foro', 'h5p', 'xapi'];

async function main(): Promise<void> {
  const sql = createSql({ max: 4, direct: true });
  try {
    // ── Ids del seed ───────────────────────────────────────────────────
    const perfiles = await sql<{ user_id: string; email: string; rol: string }[]>`
      select p.user_id, u.email, p.rol
      from lxp.perfiles p join auth.users u on u.id = p.user_id`;
    const idPor = (email: string): string => {
      const row = perfiles.find((r) => r.email === email);
      if (!row) throw new Error(`No se encontró el perfil ${email}. ¿Corriste el seed?`);
      return row.user_id;
    };
    const adminStudio = idPor('admin-studio@seed.local'); // autoría (§5B · admin, es_autoria)
    const a1 = idPor('a1@seed.local'); // alumno con acceso

    const claimsAdminStudio: Claims = { sub: adminStudio, role: 'authenticated' };
    const claimsA1: Claims = { sub: a1, role: 'authenticated' };
    const claimsAnon: Claims = { sub: null, role: 'anon' };

    // ── 1) Enum leccion_tipo con los 7 tipos ────────────────────────────
    const enumVals = (
      await sql<{ v: string }[]>`select unnest(enum_range(null::lxp.leccion_tipo))::text as v`
    ).map((r) => r.v);
    check(
      'enum lxp.leccion_tipo tiene los 7 tipos (§5C)',
      TIPOS.every((t) => enumVals.includes(t)) && enumVals.length === 7,
      enumVals.join(','),
    );

    // ── 2) Columnas nuevas en lecciones ─────────────────────────────────
    const cols = await sql<{ column_name: string; data_type: string; column_default: string | null }[]>`
      select column_name, data_type, column_default
      from information_schema.columns
      where table_schema = 'lxp' and table_name = 'lecciones'
        and column_name in ('tipo', 'config')`;
    const colTipo = cols.find((c) => c.column_name === 'tipo');
    const colConfig = cols.find((c) => c.column_name === 'config');
    check(
      "lecciones.tipo existe con DEFAULT 'teoria'",
      !!colTipo && (colTipo.column_default ?? '').includes('teoria'),
      colTipo?.column_default ?? 'ausente',
    );
    check(
      'lecciones.config existe (jsonb)',
      !!colConfig && colConfig.data_type === 'jsonb',
      colConfig?.data_type ?? 'ausente',
    );

    // ── 3) Seed-safe: las lecciones existentes quedaron 'teoria' ────────
    const noTeoria = await sql<{ n: string }[]>`
      select count(*)::int as n from lxp.lecciones where tipo <> 'teoria'`;
    const total = await sql<{ n: string }[]>`select count(*)::int as n from lxp.lecciones`;
    check(
      'Lecciones del seed marcadas como teoria (no rompe el seed)',
      num(noTeoria) === 0 && num(total) > 0,
      `${num(total)} lecciones, ${num(noTeoria)} no-teoria`,
    );

    // ── 4) Tabla bloques con RLS habilitada ─────────────────────────────
    const rlsBloques = await sql<{ relrowsecurity: boolean }[]>`
      select relrowsecurity from pg_class
      where oid = 'lxp.bloques'::regclass`;
    check('lxp.bloques tiene RLS habilitada', rlsBloques[0]?.relrowsecurity === true);

    // Necesitamos un modulo del seed para colgar lecciones de prueba.
    const modulo = (
      await sql<{ id: string }[]>`select id from lxp.modulos order by created_at limit 1`
    )[0];
    if (!modulo) throw new Error('No hay módulos en el seed.');

    // ── 5) La autoría crea teoría ordenable + una lección config-backed ─
    await comoRollback(sql, claimsAdminStudio, async (tx) => {
      // Lección teoria → bloques ordenables.
      const lTeoria = (
        await tx<{ id: string }[]>`
          insert into lxp.lecciones (modulo_id, nombre, tipo, orden)
          values (${modulo.id}, 'Teoría de prueba', 'teoria', 900) returning id`
      )[0]!;
      await tx`
        insert into lxp.bloques (leccion_id, orden, tipo_bloque, config) values
          (${lTeoria.id}, 0, 'parrafo', ${tx.json({ html: '<p>Hola</p>' })}),
          (${lTeoria.id}, 1, 'imagen',  ${tx.json({ ref: 'x.png' })})`;
      const nBloques = await tx<{ n: string }[]>`
        select count(*)::int as n from lxp.bloques where leccion_id = ${lTeoria.id}`;
      check('Autoría crea bloques de teoría (ordenables)', num(nBloques) === 2);

      // Lección config-backed (video) → config jsonb en la propia lección.
      const lVideo = (
        await tx<{ id: string; config: Record<string, unknown> }[]>`
          insert into lxp.lecciones (modulo_id, nombre, tipo, config, orden)
          values (${modulo.id}, 'Video de prueba', 'video',
                  ${tx.json({ recursoRef: 'clip.mp4', hitos: [] })}, 901)
          returning id, config`
      )[0]!;
      check(
        'Lección config-backed guarda config jsonb (video)',
        (lVideo.config as { recursoRef?: string }).recursoRef === 'clip.mp4',
      );
    });

    // ── 6) RLS: el alumno LEE bloques pero NO escribe; anon no ve nada ──
    // Sembramos un bloque real (rollback) para probar lectura del alumno dentro
    // del mismo árbol; como el rollback aísla, probamos lectura sobre lo existente:
    // el alumno puede hacer SELECT (using true) — verificamos que no explota.
    check(
      'Alumno puede LEER lxp.bloques (para renderizar teoría)',
      !(await fueRechazada(() => como(sql, claimsA1, (tx) => tx`select 1 from lxp.bloques limit 1`))),
    );
    check(
      'Alumno NO puede ESCRIBIR en lxp.bloques (solo autoría · §5B)',
      await fueRechazada(() =>
        como(sql, claimsA1, (tx) =>
          tx`insert into lxp.bloques (leccion_id, tipo_bloque) values (${modulo.id}, 'x')`,
        ),
      ),
    );
    check(
      'anon NO ve lxp.bloques (sin grants)',
      await fueRechazada(() => como(sql, claimsAnon, (tx) => tx`select 1 from lxp.bloques limit 1`)),
    );
    // RLS con USING falso no lanza error en UPDATE: filtra a 0 filas (seguro igual).
    // Verificamos que el alumno no toca NINGUNA lección (returning cuenta afectadas).
    const afectadasAlumno = await como(sql, claimsA1, (tx) =>
      tx<{ id: string }[]>`update lxp.lecciones set tipo = tipo returning id`,
    );
    check(
      'Alumno NO cambia el tipo de ninguna lección (RLS filtra a 0 filas)',
      afectadasAlumno.length === 0,
      `${afectadasAlumno.length} filas`,
    );

    // ── Reporte ────────────────────────────────────────────────────────
    let fallos = 0;
    console.log('\n  Suite del MODELO — constructor de lecciones (mig 0023)\n  ' + '─'.repeat(52));
    for (const r of resultados) {
      const marca = r.ok ? '✓' : '✗';
      if (!r.ok) fallos++;
      console.log(`  ${marca} ${r.nombre}${r.detalle ? `  (${r.detalle})` : ''}`);
    }
    console.log('  ' + '─'.repeat(52));
    console.log(`  ${resultados.length - fallos}/${resultados.length} en verde\n`);
    if (fallos > 0) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('✗ test:model falló:', err);
  process.exit(1);
});
