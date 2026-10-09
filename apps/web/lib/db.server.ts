import 'server-only';
import postgres from 'postgres';

/**
 * Acceso a datos del alumno CON RLS (§2/§10). Faithful local: no hay Supabase en
 * local (solo Postgres del compose), así que el server component abre una conexión
 * y, por request, fija `request.jwt.claims` + `set local role authenticated` — de
 * modo que las MISMAS policies filtran igual que en producción. NO usa service_role.
 *
 * En el Sprint 11 esto se reemplaza por el cliente Supabase con el JWT del usuario;
 * la superficie (`comoAlumno` / funciones de `datos.ts`) no cambia.
 */

export type Sql = ReturnType<typeof postgres>;

declare global {
  // Reusa la conexión entre recargas de HMR en dev.
  // eslint-disable-next-line no-var
  var __lxpSql: Sql | undefined;
}

function getSql(): Sql {
  if (!globalThis.__lxpSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL no definido para web.');
    // En producción DATABASE_URL es el pooler de transacción de Supabase (:6543),
    // que NO admite prepared statements → prepare:false. En local (:5432) es inocuo.
    globalThis.__lxpSql = postgres(url, {
      max: 5,
      prepare: false,
      onnotice: () => {},
    });
  }
  return globalThis.__lxpSql;
}

/** Ejecuta consultas como el alumno `userId` (rol authenticated + claims → RLS). */
export async function comoAlumno<T>(
  userId: string,
  fn: (sql: Sql) => Promise<T>,
): Promise<T> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx.unsafe('set local role authenticated');
    return fn(tx as unknown as Sql);
  }) as Promise<T>;
}

/**
 * Igual que `comoAlumno` pero para el staff (Studio · §5B). Mismo mecanismo: rol
 * de BD `authenticated` + claims con el `sub` del usuario, de modo que las MISMAS
 * policies (`lxp.es_autoria()` / `lxp.es_staff()` vía `lxp.rol_actual()`) filtran
 * igual que en producción. NO usa `service_role` — la autoría cae bajo RLS (§2/§10).
 */
export async function comoStaff<T>(
  userId: string,
  fn: (sql: Sql) => Promise<T>,
): Promise<T> {
  return comoAlumno(userId, fn);
}

/**
 * Ejecuta como el rol PÚBLICO `anon` (sin sesión). Para lecturas públicas de terceros
 * vía funciones SECURITY DEFINER granted a `anon` (p. ej. `verificar_folio_publico` ·
 * mig 0060). Fija `set local role anon` para ser fiel a producción: la función es el
 * límite de seguridad, no la sesión. NO usa `service_role`.
 */
export async function comoAnon<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe('set local role anon');
    return fn(tx as unknown as Sql);
  }) as Promise<T>;
}

/**
 * Flags de privacidad de un perfil (`preferencias.privacidad` · Bloque 4). Se leen vía la
 * función SECURITY DEFINER `lxp.perfil_publico_de` (mig 0059), que expone SOLO los campos
 * públicos del perfil respetando `perfilVisible` — cierra el atajo §10 que hacía esta helper
 * (leer `preferencias` de un perfil ajeno con la conexión OWNER, saltándose la RLS
 * `perfiles_select` own-or-staff). El definer es el límite de seguridad: la conexión ya no
 * ejecuta una query arbitraria sobre `lxp.perfiles`, solo llama a la función acotada.
 *
 * El definer devuelve `perfil_visible`/`acepta_colegas` (los ÚNICOS flags que consumen los
 * gates del web); `casosABiblioteca`/`mostrarEnLinea` NO son campos de perfil público (el
 * primero es consentimiento server-side en el `api`, el segundo es presencia y aún no se
 * cablea), así que se dejan en su DEFAULT. Aplica los DEFAULTS del Bloque 4 cuando el perfil
 * aún no guardó preferencias.
 */
export type PrivacidadFlags = {
  perfilVisible: boolean;
  aceptarColegas: boolean;
  casosABiblioteca: boolean;
  mostrarEnLinea: boolean;
};

const PRIVACIDAD_DEFAULT: PrivacidadFlags = {
  perfilVisible: true,
  aceptarColegas: true,
  casosABiblioteca: false,
  mostrarEnLinea: true,
};

export async function privacidadDeVarios(userIds: string[]): Promise<Map<string, PrivacidadFlags>> {
  const m = new Map<string, PrivacidadFlags>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return m;
  // Lee vía la función SECURITY DEFINER (§10): solo expone los flags públicos del perfil,
  // ya no una query arbitraria sobre lxp.perfiles.
  const sql = getSql();
  const rows = await sql<{ id: string; perfil_visible: boolean; acepta_colegas: boolean }[]>`
    select id, perfil_visible, acepta_colegas
    from lxp.perfil_publico_de(${ids}::uuid[])`;
  for (const r of rows)
    m.set(r.id, {
      ...PRIVACIDAD_DEFAULT,
      perfilVisible: r.perfil_visible,
      aceptarColegas: r.acepta_colegas,
    });
  return m;
}

export async function privacidadDe(userId: string): Promise<PrivacidadFlags> {
  return (await privacidadDeVarios([userId])).get(userId) ?? { ...PRIVACIDAD_DEFAULT };
}

/**
 * Perfiles MENCIONABLES (alumno/docente) por nombre, para el autocomplete de @menciones (mig
 * 0076). Usa la conexión OWNER (como `nombre_de`/`colegasEnComun`) porque la RLS de `lxp.perfiles`
 * es own-or-staff: un alumno NO puede leer perfiles ajenos bajo RLS. El ACOTAMIENTO a la audiencia
 * del post lo hace quien llama (pasando `ids` del scope: roster de grupo / colegas en común); para
 * 'inscritos' (`ids = null`) cualquier inscrito es mencionable. Devuelve solo id + nombre (datos
 * que `nombre_de` ya expone); el gate de privacidad (perfilVisible) se aplica aparte.
 */
export async function perfilesMencionables(
  query: string,
  ids: string[] | null,
  limit = 16,
): Promise<{ id: string; nombre: string | null }[]> {
  const sql = getSql();
  const q = query.trim();
  const like = `%${q}%`;
  if (ids !== null) {
    if (ids.length === 0) return [];
    return sql<{ id: string; nombre: string | null }[]>`
      select user_id as id, nombre from lxp.perfiles
      where user_id = any(${ids}) and rol in ('alumno', 'docente')
        and (${q === ''} or nombre ilike ${like})
      order by nombre limit ${limit}`;
  }
  return sql<{ id: string; nombre: string | null }[]>`
    select user_id as id, nombre from lxp.perfiles
    where rol in ('alumno', 'docente') and (${q === ''} or nombre ilike ${like})
    order by nombre limit ${limit}`;
}

/**
 * Colegas EN COMÚN entre `viewerId` y `otroId` (conexiones aceptadas que ambos comparten).
 *
 * Privacidad (§10): la RLS de `conexiones_ateneo` hace que una conexión sea visible SOLO a sus
 * dos partes — un tercero no puede listar las conexiones ajenas. Por eso NO exponemos la lista
 * de colegas de `otroId`: solo la INTERSECCIÓN con la red del propio `viewerId`. El resultado es
 * SIEMPRE ⊆ los colegas del viewer (personas que el viewer ya tiene derecho a ver); nunca
 * revela una conexión de `otroId` fuera de ese círculo. Es el patrón "amigos en común".
 *
 * Usa la conexión OWNER (`getSql`, sin `set role`) porque la intersección no se puede computar
 * bajo la RLS del viewer (las filas de `otroId` le son invisibles). El acotamiento al círculo del
 * viewer es el límite de privacidad, no la sesión. Nombres vía `lxp.nombre_de` (no datos privados).
 *
 * `viewerId === otroId` ("ver como me ven"): la intersección consigo mismo = TODAS mis conexiones.
 */
export async function colegasEnComun(
  viewerId: string,
  otroId: string,
): Promise<{ id: string; nombre: string | null }[]> {
  const sql = getSql();
  if (viewerId === otroId) {
    return sql<{ id: string; nombre: string | null }[]>`
      select x as id, lxp.nombre_de(x) as nombre
      from (
        select case when solicitante_id = ${viewerId} then receptor_id else solicitante_id end as x
        from lxp.conexiones_ateneo
        where estado = 'colegas' and (solicitante_id = ${viewerId} or receptor_id = ${viewerId})
      ) mios
      order by nombre`;
  }
  return sql<{ id: string; nombre: string | null }[]>`
    select vc.x as id, lxp.nombre_de(vc.x) as nombre
    from (
      select case when solicitante_id = ${viewerId} then receptor_id else solicitante_id end as x
      from lxp.conexiones_ateneo
      where estado = 'colegas' and (solicitante_id = ${viewerId} or receptor_id = ${viewerId})
    ) vc
    where exists (
      select 1 from lxp.conexiones_ateneo c2
      where c2.estado = 'colegas'
        and ((c2.solicitante_id = ${otroId} and c2.receptor_id = vc.x)
          or (c2.receptor_id = ${otroId} and c2.solicitante_id = vc.x))
    )
    order by nombre`;
}

/**
 * Bootstrap de sesión de DEV para el staff (hasta el auth real del Sprint 11):
 * resuelve al miembro del staff por email con una consulta directa (sin rol),
 * simulando lo que en producción vendría del JWT. Solo roles de plataforma LXP
 * distintos de `alumno` (§10: roles por plataforma).
 */
export async function resolverStaffDev(email: string): Promise<{
  userId: string;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'admin' | 'docente';
} | null> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      nombre: string;
      email: string;
      rol: 'super_admin' | 'admin' | 'docente';
    }[]
  >`
    select p.user_id, p.nombre, coalesce(p.email, u.email) as email, p.rol::text as rol
    from lxp.perfiles p
    join auth.users u on u.id = p.user_id
    where u.email = ${email} and p.rol <> 'alumno'
    limit 1`;
  const row = rows[0];
  if (!row) return null;
  return { userId: row.user_id, nombre: row.nombre, email: row.email, rol: row.rol };
}

/**
 * Resuelve al staff por su `user_id` (el `sub` del JWT real · camino de PROD), con el
 * rol desde `lxp.perfiles.rol`. Mismo shape que `resolverStaffDev` para no tocar guards
 * ni consumidores; solo cambia DE DÓNDE sale la identidad (JWT en vez de env). Filtra
 * `rol <> 'alumno'`: un alumno NO es staff (devuelve null → el guard lo manda a su lugar).
 */
export async function resolverStaffPorId(userId: string): Promise<{
  userId: string;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'admin' | 'docente';
} | null> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      nombre: string;
      email: string;
      rol: 'super_admin' | 'admin' | 'docente';
    }[]
  >`
    select p.user_id, p.nombre, coalesce(p.email, u.email) as email, p.rol::text as rol
    from lxp.perfiles p
    join auth.users u on u.id = p.user_id
    where p.user_id = ${userId} and p.rol <> 'alumno'
    limit 1`;
  const row = rows[0];
  if (!row) return null;
  return { userId: row.user_id, nombre: row.nombre, email: row.email, rol: row.rol };
}

export type AlumnoResuelto = {
  userId: string;
  nombre: string;
  email: string;
  matricula: string;
  programa: string;
  accesoActivo: boolean;
};

function mapearAlumno(
  row: {
    user_id: string;
    nombre: string;
    email: string;
    matricula: string | null;
  },
  accesoActivo: boolean,
): AlumnoResuelto {
  return {
    userId: row.user_id,
    nombre: row.nombre,
    email: row.email,
    matricula: row.matricula ?? 'MC-—',
    programa: 'Ultrasonografía Médica · 1000 h',
    accesoActivo,
  };
}

/**
 * Acceso del alumno EN VIVO desde CORA (§1/§10) — fuente única de los campos derivados
 * de CORA. El `lxp.perfiles.acceso_activo` persistido quedó obsoleto como fuente de
 * verdad: se sembró en la auto-provisión (mig 0063) y NO se refresca cuando CORA cambia
 * la inscripción. El gate ((campus)/layout.tsx) debe reflejar el estado real, así que
 * se lee del puente `lxp.cora_acceso_activo` vía `comoAlumno` (rol authenticated + claims
 * → fiel a producción). La columna persistida puede quedar, pero ya NO se lee para el gate.
 */
async function accesoActivoEnVivo(userId: string): Promise<boolean> {
  const rows = await comoAlumno(userId, (sql) =>
    sql<{ acceso: boolean }[]>`select lxp.cora_acceso_activo(${userId}) as acceso`,
  );
  return rows[0]?.acceso ?? false;
}

/**
 * Bootstrap de sesión de DEV (flag `AUTH_MODE` distinto de `supabase`): resuelve el
 * alumno por email con una consulta directa (sin rol), simulando lo que en producción
 * vendría del JWT. Devuelve la identidad + datos de CORA (matrícula/programa).
 */
export async function resolverAlumnoDev(email: string): Promise<AlumnoResuelto | null> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      nombre: string;
      email: string;
      matricula: string | null;
    }[]
  >`
    select p.user_id, p.nombre, coalesce(p.email, u.email) as email,
           e.matricula
    from lxp.perfiles p
    join auth.users u on u.id = p.user_id
    left join public.estudiantes e on e.supabase_auth_id = p.user_id
    where u.email = ${email} and p.rol = 'alumno'
    limit 1`;
  const row = rows[0];
  // accesoActivo EN VIVO desde CORA (no el persistido, que queda stale) — ver nota arriba.
  return row ? mapearAlumno(row, await accesoActivoEnVivo(row.user_id)) : null;
}

/**
 * Resuelve el alumno por su `user_id` (sub del JWT de Supabase, camino de PROD).
 * Mismo shape que `resolverAlumnoDev` para no tocar `comoAlumno` ni los consumidores.
 * Lectura de bootstrap de sesión (conexión owner): el camino de datos sigue bajo RLS.
 */
export async function resolverAlumnoPorId(userId: string): Promise<AlumnoResuelto | null> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      nombre: string;
      email: string;
      matricula: string | null;
    }[]
  >`
    select p.user_id, p.nombre, coalesce(p.email, u.email) as email,
           e.matricula
    from lxp.perfiles p
    join auth.users u on u.id = p.user_id
    left join public.estudiantes e on e.supabase_auth_id = p.user_id
    where p.user_id = ${userId} and p.rol = 'alumno'
    limit 1`;
  const row = rows[0];
  // accesoActivo EN VIVO desde CORA (no el persistido, que queda stale) — ver nota arriba.
  return row ? mapearAlumno(row, await accesoActivoEnVivo(userId)) : null;
}

/**
 * ÚNICO punto de auto-provisión de `lxp.perfiles` desde CORA (§1/§10 · fix P9). Lo invocan
 * los TRES resolvers de sesión (alumno/staff/docente) ARRIBA, antes de cualquier RBAC, para
 * que un usuario que CORA ya creó tenga su perfil la primera vez que entra —por cualquier
 * puerta, no solo el Campus—. Llama al wrapper `lxp.provisionar_perfil()` (mig 0077), que
 * delega en `lxp.provisionar_perfil_de(auth.uid())` donde vive el ÚNICO mapeo. SECURITY
 * DEFINER + idempotente. Se impersona al usuario (claims sub) para que `auth.uid()` resuelva
 * dentro de la función — mismo mecanismo que `comoAlumno` (no se toca public/auth).
 */
export async function asegurarPerfilProvisionado(userId: string): Promise<void> {
  await comoAlumno(userId, async (sql) => {
    await sql`select lxp.provisionar_perfil()`;
  });
}

/**
 * Rol en `lxp.perfiles` del usuario, o `null` si NO tiene perfil. Lo usan los resolvers de
 * sesión para distinguir (tras provisionar) "sin perfil / sin acceso LXP" (asesor/desconocido)
 * de "tiene perfil pero de otro rol" (p. ej. alumno en una puerta de staff) → negación/ruteo
 * EXPLÍCITO, no un rebote mudo (fix P9 · req 4). Lectura de bootstrap (conexión owner).
 */
export async function rolDePerfil(userId: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql<{ rol: string }[]>`
    select rol::text as rol from lxp.perfiles where user_id = ${userId} limit 1`;
  return rows[0]?.rol ?? null;
}

/**
 * INVARIANTE de writes de autoría del Studio (fix P9): un `UPDATE`/`DELETE` bajo RLS que no
 * ve la fila (sin permiso de autoría o id inexistente) afecta 0 filas SIN error → la UI
 * optimista "miente". Este helper TRUENA con un error claro si el write no afectó filas.
 * `res.count` es el nº de filas afectadas en postgres.js (para UPDATE/DELETE sin RETURNING).
 */
export function afirmarFilas(res: { count: number }, contexto: string): void {
  if (res.count === 0) {
    throw new Error(
      `No se pudo guardar (${contexto}): el write afectó 0 filas — sin permiso de autoría o el registro no existe.`,
    );
  }
}
