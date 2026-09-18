/**
 * Suite de RLS del Sprint 1 (verificado, no supuesto · DoD).
 *
 * Emula a Supabase: cada consulta corre con `request.jwt.claims` puesto y el rol
 * de BD conmutado (`set local role authenticated` / `anon`), de modo que las MISMAS
 * policies se ejercitan igual que en producción. Requiere el seed cargado.
 *
 * Uso:  tsx src/test-rls.ts   (sale con código ≠ 0 si algo falla)
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

/** Igual que `como`, pero SIEMPRE hace rollback (para probar escrituras permitidas). */
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

async function main(): Promise<void> {
  const sql = createSql({ max: 4 });
  try {
    // Ids del seed.
    const perfiles = await sql<{ user_id: string; email: string }[]>`
      select p.user_id, u.email
      from lxp.perfiles p join auth.users u on u.id = p.user_id`;
    const idPor = (email: string): string => {
      const row = perfiles.find((r) => r.email === email);
      if (!row) throw new Error(`No se encontró el perfil ${email}. ¿Corriste el seed?`);
      return row.user_id;
    };
    const a1 = idPor('a1@seed.local');
    const a2 = idPor('a2@seed.local');
    const a4 = idPor('a4@seed.local'); // suspendido (pago vencido)

    const claimsA1: Claims = { sub: a1, role: 'authenticated' };
    const claimsA2: Claims = { sub: a2, role: 'authenticated' };
    const claimsA4: Claims = { sub: a4, role: 'authenticated' };
    const claimsAnon: Claims = { sub: null, role: 'anon' };

    // ── 1) Aislamiento de bitácora ─────────────────────────────────────
    const a1Ve = await como(sql, claimsA1, (tx) =>
      tx<{ n: string }[]>`select count(*)::int as n from lxp.bitacora_casos`,
    );
    check('a1 ve solo SUS casos (2)', num(a1Ve) === 2, `vio ${num(a1Ve)}`);

    const a1VeDeA2 = await como(sql, claimsA1, (tx) =>
      tx<{ n: string }[]>`select count(*)::int as n from lxp.bitacora_casos where id_alumno = ${a2}`,
    );
    check('a1 NO ve casos de a2', num(a1VeDeA2) === 0, `vio ${num(a1VeDeA2)}`);

    const a2Ve = await como(sql, claimsA2, (tx) =>
      tx<{ n: string }[]>`select count(*)::int as n from lxp.bitacora_casos`,
    );
    check('a2 ve solo SUS casos (1)', num(a2Ve) === 1, `vio ${num(a2Ve)}`);

    // ── 2) Suspendido (acceso_activo=false) no accede ──────────────────
    const a4Ve = await como(sql, claimsA4, (tx) =>
      tx<{ n: string }[]>`select count(*)::int as n from lxp.bitacora_casos`,
    );
    check('a4 suspendido NO ve NINGÚN caso (ni el suyo)', num(a4Ve) === 0, `vio ${num(a4Ve)}`);

    // ── 3) Proyección competencia_dominios = read-only desde web ───────
    const a1VeComp = await como(sql, claimsA1, (tx) =>
      tx<{ n: string }[]>`select count(*)::int as n from lxp.competencia_dominios`,
    );
    check('a1 SÍ lee su competencia', num(a1VeComp) >= 1, `vio ${num(a1VeComp)}`);

    check(
      'a1 NO puede INSERT en competencia_dominios',
      await fueRechazada(() =>
        como(sql, claimsA1, (tx) =>
          tx`insert into lxp.competencia_dominios (id_alumno, dominio_iaim, horas)
             values (${a1}, ${'indicacion'}::lxp.dominio_iaim, 1)`,
        ),
      ),
    );
    check(
      'a1 NO puede UPDATE competencia_dominios',
      await fueRechazada(() =>
        como(sql, claimsA1, (tx) => tx`update lxp.competencia_dominios set nivel = 99`),
      ),
    );
    check(
      'anon NO puede SELECT competencia_dominios',
      await fueRechazada(() =>
        como(sql, claimsAnon, (tx) => tx`select 1 from lxp.competencia_dominios`),
      ),
    );

    // ── 4) Gating por acceso_activo en escritura de bitácora ───────────
    check(
      'a4 suspendido NO puede INSERT su propio caso',
      await fueRechazada(() =>
        como(sql, claimsA4, (tx) =>
          tx`insert into lxp.bitacora_casos (id_alumno, hallazgos)
             values (${a4}, 'intento')`,
        ),
      ),
    );
    let a1Inserta = false;
    try {
      await comoRollback(sql, claimsA1, async (tx) => {
        await tx`insert into lxp.bitacora_casos (id_alumno, hallazgos)
                 values (${a1}, 'caso de prueba (rollback)')`;
      });
      a1Inserta = true;
    } catch {
      a1Inserta = false;
    }
    check('a1 con acceso SÍ puede INSERT su propio caso', a1Inserta);

    // ── 5) Puente CORA→LXP: lectura por función, NUNCA acople directo ──
    const grupos = await como(sql, claimsA1, (tx) =>
      tx<{ n: string }[]>`select count(*)::int as n from lxp.cora_grupos_de(${a1})`,
    );
    check('a1 lee sus grupos de CORA vía función puente', num(grupos) === 1, `vio ${num(grupos)}`);

    const acceso = await como(sql, claimsA1, (tx) =>
      tx<{ ok: boolean }[]>`select lxp.cora_acceso_activo(${a1}) as ok`,
    );
    check('cora_acceso_activo(a1) = true', acceso[0]?.ok === true);

    check(
      'a1 NO puede leer public.grupos DIRECTO (sin acople)',
      await fueRechazada(() =>
        como(sql, claimsA1, (tx) => tx`select 1 from public.grupos`),
      ),
    );
    check(
      'a1 NO puede ESCRIBIR en public (CORA es solo lectura)',
      await fueRechazada(() =>
        como(sql, claimsA1, (tx) => tx`insert into public.grupos (nombre) values ('x')`),
      ),
    );

    const policiesCora = await sql<{ n: string }[]>`
      select count(*)::int as n from pg_policies where schemaname = 'public'`;
    check(
      'Policies de CORA (public) intactas tras migraciones del LXP',
      num(policiesCora) >= 5,
      `${num(policiesCora)} policies`,
    );

    // ── Reporte ────────────────────────────────────────────────────────
    let fallos = 0;
    console.log('\n  Suite de RLS — Sprint 1\n  ' + '─'.repeat(52));
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
  console.error('✗ test:rls falló:', err);
  process.exit(1);
});
