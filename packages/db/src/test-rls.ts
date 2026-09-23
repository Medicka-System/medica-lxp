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

    // ── 6) Notas del alumno (mig 0027): grant presente + aislamiento ──────
    const leccionId =
      (await sql<{ id: string }[]>`select id from lxp.lecciones limit 1`)[0]?.id ?? null;

    // El grant base debe existir (fallo de 0020/0021): un SELECT no debe dar 500.
    check(
      'a1 SÍ puede SELECT notas (grant base presente)',
      (await fueRechazada(() =>
        como(sql, claimsA1, (tx) => tx`select 1 from lxp.notas`),
      )) === false,
    );

    let a1CreaNota = false;
    try {
      await comoRollback(sql, claimsA1, async (tx) => {
        await tx`insert into lxp.notas (alumno_id, leccion_id, tipo, contenido)
                 values (${a1}, ${leccionId}, 'nota_libre', 'nota de prueba (rollback)')`;
      });
      a1CreaNota = true;
    } catch {
      a1CreaNota = false;
    }
    check('a1 SÍ puede INSERT su propia nota', a1CreaNota);

    check(
      'a1 NO puede INSERT una nota a nombre de a2',
      await fueRechazada(() =>
        como(sql, claimsA1, (tx) =>
          tx`insert into lxp.notas (alumno_id, leccion_id, tipo, contenido)
             values (${a2}, ${leccionId}, 'nota_libre', 'ajena')`,
        ),
      ),
    );

    check(
      'anon NO puede SELECT notas',
      await fueRechazada(() => como(sql, claimsAnon, (tx) => tx`select 1 from lxp.notas`)),
    );

    // ── Sesión de intento de autoevaluación (timer persistido · mig 0029) ──
    check(
      'a1 SÍ puede SELECT autoeval_sesiones (grant base presente)',
      (await fueRechazada(() =>
        como(sql, claimsA1, (tx) => tx`select 1 from lxp.autoeval_sesiones`),
      )) === false,
    );

    let a1AbreSesion = false;
    try {
      await comoRollback(sql, claimsA1, async (tx) => {
        await tx`insert into lxp.autoeval_sesiones (leccion_id, alumno_id)
                 values (${leccionId}, ${a1})`;
      });
      a1AbreSesion = true;
    } catch {
      a1AbreSesion = false;
    }
    check('a1 SÍ puede abrir su propia sesión de autoevaluación', a1AbreSesion);

    check(
      'a1 NO puede abrir una sesión a nombre de a2',
      await fueRechazada(() =>
        como(sql, claimsA1, (tx) =>
          tx`insert into lxp.autoeval_sesiones (leccion_id, alumno_id)
             values (${leccionId}, ${a2})`,
        ),
      ),
    );

    // ── FORO: gate de desbloqueo (0030) — solo se ven posts ajenos tras publicar ──
    const foro = (
      await sql<{ act: string; grp: string; lec: string }[]>`
        select a.id as act, fm.grupo_id as grp, a.leccion_id as lec
        from lxp.actividades a
        join lxp.foro_mensajes fm on fm.actividad_id = a.id
        where a.tipo = 'foro'
        limit 1`
    )[0]!;
    // a1 (sin post) NO ve los posts de sus compañeros (RLS los oculta).
    const a1VeForo = await como(sql, claimsA1, (tx) =>
      tx<{ n: string }[]>`select count(*)::int as n from lxp.foro_mensajes where actividad_id = ${foro.act}`,
    );
    check('a1 (sin publicar) NO ve posts del foro (gate)', num(a1VeForo) === 0, `vio ${num(a1VeForo)}`);

    // a2 (que ya publicó en el seed) SÍ ve los posts del grupo.
    const a2VeForo = await como(sql, claimsA2, (tx) =>
      tx<{ n: string }[]>`select count(*)::int as n from lxp.foro_mensajes where actividad_id = ${foro.act}`,
    );
    check('a2 (ya publicó) SÍ ve el foro del grupo', num(a2VeForo) > 0, `vio ${num(a2VeForo)}`);

    // Tras publicar su post raíz, a1 SÍ ve los de los compañeros (desbloqueo · rollback).
    let a1DesbloqueaForo = false;
    try {
      await comoRollback(sql, claimsA1, async (tx) => {
        await tx`
          insert into lxp.foro_mensajes (actividad_id, leccion_id, grupo_id, autor_id, titulo, cuerpo)
          values (${foro.act}, ${foro.lec}, ${foro.grp}, ${a1}, 'Mi caso', '<p>hola</p>')`;
        const n = await tx<{ n: string }[]>`
          select count(*)::int as n from lxp.foro_mensajes where actividad_id = ${foro.act}`;
        a1DesbloqueaForo = num(n) > 1; // ve el suyo + los ajenos
      });
    } catch {
      a1DesbloqueaForo = false;
    }
    check('a1 SÍ ve el foro DESPUÉS de publicar su post (desbloqueo)', a1DesbloqueaForo);

    check(
      'a1 SÍ puede SELECT foro_reacciones (grant base presente)',
      (await fueRechazada(() =>
        como(sql, claimsA1, (tx) => tx`select 1 from lxp.foro_reacciones limit 1`),
      )) === false,
    );

    // ── ATENEO (0032): reacciones, votos de encuesta y colegas ──
    const postAteneo = (
      await sql<{ id: string }[]>`select id from lxp.posts_ateneo where tipo = 'texto' limit 1`
    )[0]!;
    const opcion = (
      await sql<{ id: string; post_id: string }[]>`select id, post_id from lxp.encuesta_opciones limit 1`
    )[0]!;

    let a1Reacciona = false;
    try {
      await comoRollback(sql, claimsA1, async (tx) => {
        await tx`insert into lxp.reacciones_ateneo (post_id, usuario_id, tipo)
                 values (${postAteneo.id}, ${a1}, 'util') on conflict (post_id, usuario_id) do update set tipo = 'ojo'`;
      });
      a1Reacciona = true;
    } catch {
      a1Reacciona = false;
    }
    check('a1 SÍ puede reaccionar a un post del Ateneo', a1Reacciona);

    check(
      'a1 NO puede reaccionar a nombre de a2',
      await fueRechazada(() =>
        como(sql, claimsA1, (tx) =>
          tx`insert into lxp.reacciones_ateneo (post_id, usuario_id, tipo) values (${postAteneo.id}, ${a2}, 'util')`,
        ),
      ),
    );

    let a1Vota = false;
    try {
      await comoRollback(sql, claimsA1, async (tx) => {
        await tx`insert into lxp.encuesta_votos (post_id, usuario_id, opcion_id)
                 values (${opcion.post_id}, ${a1}, ${opcion.id})
                 on conflict (post_id, usuario_id) do update set opcion_id = excluded.opcion_id`;
      });
      a1Vota = true;
    } catch {
      a1Vota = false;
    }
    check('a1 SÍ puede votar una encuesta del Ateneo', a1Vota);

    let a1Conecta = false;
    try {
      await comoRollback(sql, claimsA1, async (tx) => {
        await tx`delete from lxp.conexiones_ateneo where solicitante_id = ${a1} and receptor_id = ${a2}`;
        await tx`insert into lxp.conexiones_ateneo (solicitante_id, receptor_id, estado) values (${a1}, ${a2}, 'pendiente')`;
      });
      a1Conecta = true;
    } catch {
      a1Conecta = false;
    }
    check('a1 SÍ puede solicitar conexión con un colega', a1Conecta);

    check(
      'a1 NO puede solicitar conexión a nombre de a2',
      await fueRechazada(() =>
        como(sql, claimsA1, (tx) =>
          tx`insert into lxp.conexiones_ateneo (solicitante_id, receptor_id, estado) values (${a2}, ${a1}, 'pendiente')`,
        ),
      ),
    );

    // ── 7) Progreso ANCLADO A LA LECCIÓN (mig 0028): completar cualquier tipo ──
    let a1Progreso = false;
    try {
      await comoRollback(sql, claimsA1, async (tx) => {
        await tx`
          insert into lxp.reproduccion_progreso (alumno_id, leccion_id, porcentaje, completado)
          values (${a1}, ${leccionId}, 100, true)
          on conflict (alumno_id, leccion_id) where contenido_id is null and leccion_id is not null
          do update set completado = true`;
      });
      a1Progreso = true;
    } catch {
      a1Progreso = false;
    }
    check('a1 SÍ puede marcar progreso leccion-keyed (contenido_id NULL)', a1Progreso);

    check(
      'a4 suspendido NO puede marcar progreso de lección',
      await fueRechazada(() =>
        como(sql, claimsA4, (tx) =>
          tx`insert into lxp.reproduccion_progreso (alumno_id, leccion_id, porcentaje, completado)
             values (${a4}, ${leccionId}, 100, true)`,
        ),
      ),
    );

    // ── Anotaciones DICOM (mig 0035 · FASE 2) ─────────────────────────
    // Datos comprometidos: una anotación de a1 en su caso + una del "curador" en un
    // caso de biblioteca. Se prueban visibilidad y escritura; al final se limpian.
    const casoA1 = await sql<{ id: string }[]>`
      select id from lxp.bitacora_casos where id_alumno = ${a1} limit 1`;
    const casoBib = await sql<{ id: string }[]>`select id from lxp.casos_biblioteca limit 1`;
    if (casoA1[0] && casoBib[0]) {
      const cA1 = casoA1[0].id;
      const cBib = casoBib[0].id;
      const ANOT_A1 = '11111111-0000-0000-0000-0000000000a1';
      const ANOT_BIB = '11111111-0000-0000-0000-0000000000b1';
      await sql`delete from lxp.anotaciones_dicom where id in (${ANOT_A1}::uuid, ${ANOT_BIB}::uuid)`;
      await sql`
        insert into lxp.anotaciones_dicom (id, caso_id, tabla, autor_id, autor_nombre, tipo, datos, valor)
        values
          (${ANOT_A1}::uuid, ${cA1}, 'bitacora_casos', ${a1}, 'A1', 'Length', '{}'::jsonb, '12 mm'),
          (${ANOT_BIB}::uuid, ${cBib}, 'casos_biblioteca', ${a2}, 'Curador', 'Length', '{}'::jsonb, '9 mm')`;

      const a1VeSuya = await como(sql, claimsA1, (tx) =>
        tx<{ n: string }[]>`select count(*)::int as n from lxp.anotaciones_dicom where id = ${ANOT_A1}::uuid`,
      );
      check('a1 ve SU medición en su caso', num(a1VeSuya) === 1);

      const a2VeDeA1 = await como(sql, claimsA2, (tx) =>
        tx<{ n: string }[]>`select count(*)::int as n from lxp.anotaciones_dicom where id = ${ANOT_A1}::uuid`,
      );
      check('a2 NO ve la medición de a1 (caso ajeno)', num(a2VeDeA1) === 0, `vio ${num(a2VeDeA1)}`);

      const todosVenCurado = await como(sql, claimsA1, (tx) =>
        tx<{ n: string }[]>`select count(*)::int as n from lxp.anotaciones_dicom where id = ${ANOT_BIB}::uuid`,
      );
      check('curados: la medición del curador es visible a todos', num(todosVenCurado) === 1);

      check(
        'a1 NO puede INSERT medición en un curado (congelado)',
        await fueRechazada(() =>
          como(sql, claimsA1, (tx) =>
            tx`insert into lxp.anotaciones_dicom (caso_id, tabla, autor_id, autor_nombre, tipo, datos)
               values (${cBib}, 'casos_biblioteca', ${a1}, 'A1', 'Length', '{}'::jsonb)`,
          ),
        ),
      );

      const a2EditaDeA1 = await como(sql, claimsA2, (tx) =>
        tx<{ id: string }[]>`update lxp.anotaciones_dicom set valor = 'HACK' where id = ${ANOT_A1}::uuid returning id`,
      );
      check('a2 NO puede editar la medición de a1', a2EditaDeA1.length === 0);

      await sql`delete from lxp.anotaciones_dicom where id in (${ANOT_A1}::uuid, ${ANOT_BIB}::uuid)`;
    }

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
