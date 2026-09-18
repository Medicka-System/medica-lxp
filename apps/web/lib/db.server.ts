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

type Sql = ReturnType<typeof postgres>;

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
