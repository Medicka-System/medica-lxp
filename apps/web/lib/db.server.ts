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
    globalThis.__lxpSql = postgres(url, { max: 5, onnotice: () => {} });
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
 * Bootstrap de sesión de DEV para el staff (hasta el auth real del Sprint 11):
 * resuelve al miembro del staff por email con una consulta directa (sin rol),
 * simulando lo que en producción vendría del JWT. Solo roles de plataforma LXP
 * distintos de `alumno` (§10: roles por plataforma).
 */
export async function resolverStaffDev(email: string): Promise<{
  userId: string;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'admin' | 'docente' | 'disenador_instruccional';
} | null> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      nombre: string;
      email: string;
      rol: 'super_admin' | 'admin' | 'docente' | 'disenador_instruccional';
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
 * Bootstrap de sesión de DEV (hasta el auth real del Sprint 11): resuelve el alumno
 * por email con una consulta directa (sin rol), simulando lo que en producción
 * vendría del JWT. Devuelve la identidad + datos de CORA (matrícula/programa).
 */
export async function resolverAlumnoDev(email: string): Promise<{
  userId: string;
  nombre: string;
  email: string;
  matricula: string;
  programa: string;
  accesoActivo: boolean;
} | null> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      nombre: string;
      email: string;
      matricula: string | null;
      acceso_activo: boolean;
    }[]
  >`
    select p.user_id, p.nombre, coalesce(p.email, u.email) as email,
           e.matricula, p.acceso_activo
    from lxp.perfiles p
    join auth.users u on u.id = p.user_id
    left join public.estudiantes e on e.supabase_auth_id = p.user_id
    where u.email = ${email} and p.rol = 'alumno'
    limit 1`;
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    nombre: row.nombre,
    email: row.email,
    matricula: row.matricula ?? 'MC-—',
    programa: 'Ultrasonografía Médica · 1000 h',
    accesoActivo: row.acceso_activo,
  };
}
