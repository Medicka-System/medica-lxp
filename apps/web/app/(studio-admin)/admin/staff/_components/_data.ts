import 'server-only';
import { comoStaff } from '@/lib/db.server';
import { iniciales } from '@/components/avatar';
import type { StaffData, MiembroStaff, RolStaff, DetalleStaff, CifraCarga } from './contrato';

/**
 * Lecturas de Staff CON RLS (`comoStaff` → `lxp.es_staff()`). La carga se deriva de
 * datos reales: grupos que lleva el docente, casos en cola (pendientes en sus
 * grupos), validaciones recientes y casos curados a la Biblioteca. El alta/rol se
 * gestiona en Configuración (frontera §5B): aquí es placeholder.
 */

const SOBRECARGA = 8; // casos en cola a partir de los cuales se marca sobrecarga

function fecha(d: Date): string {
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

function cargoDe(rol: RolStaff, grupos: number, curados: number): string {
  if (rol === 'docente') return grupos > 0 ? `${grupos} grupo${grupos === 1 ? '' : 's'}` : 'sin grupos asignados';
  if (rol === 'disenador_instruccional') return curados > 0 ? `${curados} casos curados` : 'contenido y casos';
  if (rol === 'admin') return 'Experiencia global';
  return 'Toda la plataforma';
}

function actividadDe(rol: RolStaff, validaciones7d: number, curados: number): string {
  if (rol === 'docente') return validaciones7d > 0 ? `${validaciones7d} validaciones esta semana` : 'sin validaciones recientes';
  if (rol === 'disenador_instruccional') return curados > 0 ? `${curados} casos en la Biblioteca` : 'sin curaciones';
  return 'gobierno de la plataforma';
}

export async function getStaff(userId: string): Promise<StaffData> {
  return comoStaff(userId, async (sql) => {
    const [perfiles, gruposPorDoc, colaPorDoc, valPorDoc, curadosPorCurador] = await Promise.all([
      sql<{ user_id: string; nombre: string; email: string | null; rol: RolStaff; created_at: Date }[]>`
        select user_id, nombre, email, rol::text as rol, created_at
        from lxp.perfiles where rol <> 'alumno' order by nombre`,
      sql<{ docente_id: string; n: number }[]>`
        select docente_id, count(*)::int as n from lxp.grupos
        where docente_id is not null group by docente_id`,
      sql<{ docente_id: string; n: number }[]>`
        select g.docente_id, count(*)::int as n
        from lxp.bitacora_casos c join lxp.grupos g on g.id = c.grupo_id
        where c.estado_validacion = 'pendiente' and g.docente_id is not null
        group by g.docente_id`,
      sql<{ id_docente: string; n: number }[]>`
        select id_docente, count(*)::int as n from lxp.validaciones
        where created_at >= now() - interval '7 days' group by id_docente`,
      sql<{ curador_id: string; n: number }[]>`
        select curador_id, count(*)::int as n from lxp.casos_biblioteca
        where curador_id is not null group by curador_id`,
    ]);

    const grupos = new Map(gruposPorDoc.map((r) => [r.docente_id, r.n]));
    const cola = new Map(colaPorDoc.map((r) => [r.docente_id, r.n]));
    const val7d = new Map(valPorDoc.map((r) => [r.id_docente, r.n]));
    const curados = new Map(curadosPorCurador.map((r) => [r.curador_id, r.n]));

    const staff: MiembroStaff[] = perfiles.map((p) => {
      const g = grupos.get(p.user_id) ?? 0;
      const q = cola.get(p.user_id) ?? 0;
      const c = curados.get(p.user_id) ?? 0;
      const v = val7d.get(p.user_id) ?? 0;
      return {
        id: p.user_id,
        ini: iniciales(p.nombre),
        nombre: p.nombre,
        rol: p.rol,
        email: p.email,
        cargo: cargoDe(p.rol, g, c),
        actividad: actividadDe(p.rol, v, c),
        desde: fecha(p.created_at),
        senal: p.rol === 'docente' && q >= SOBRECARGA ? `sobrecarga: ${q} casos en cola` : undefined,
      };
    });

    const validadosSemana = valPorDoc.reduce((s, r) => s + r.n, 0);
    const conSobrecarga = staff.filter((s) => s.senal).length;
    const conteos = {
      todos: staff.length,
      docentes: staff.filter((s) => s.rol === 'docente').length,
      disenadores: staff.filter((s) => s.rol === 'disenador_instruccional').length,
      admins: staff.filter((s) => s.rol === 'admin' || s.rol === 'super_admin').length,
    };

    return { totales: { total: staff.length, conSobrecarga, validadosSemana, conteos }, staff };
  });
}

const ETIQUETA_ROL: Record<RolStaff, string> = {
  super_admin: 'Súper admin · toda la plataforma',
  admin: 'Admin · experiencia global',
  docente: 'Docente · solo sus grupos',
  disenador_instruccional: 'Diseñador · autoría de contenido',
};

export async function getDetalleStaff(userId: string, staffId: string): Promise<DetalleStaff | null> {
  return comoStaff(userId, async (sql) => {
    const p = (
      await sql<{ user_id: string; nombre: string; email: string | null; rol: RolStaff; created_at: Date }[]>`
        select user_id, nombre, email, rol::text as rol, created_at
        from lxp.perfiles where user_id = ${staffId} and rol <> 'alumno' limit 1`
    )[0];
    if (!p) return null;

    const [grupos, valSemana, valMes, curados] = await Promise.all([
      sql<{ id: string; nombre: string; cola: number }[]>`
        select g.id, g.nombre,
          count(c.*) filter (where c.estado_validacion = 'pendiente')::int as cola
        from lxp.grupos g
        left join lxp.bitacora_casos c on c.grupo_id = g.id
        where g.docente_id = ${staffId}
        group by g.id, g.nombre order by g.created_at desc`,
      sql<{ n: number }[]>`select count(*)::int as n from lxp.validaciones where id_docente = ${staffId} and created_at >= now() - interval '7 days'`,
      sql<{ n: number }[]>`select count(*)::int as n from lxp.validaciones where id_docente = ${staffId} and created_at >= now() - interval '30 days'`,
      sql<{ n: number }[]>`select count(*)::int as n from lxp.casos_biblioteca where curador_id = ${staffId}`,
    ]);

    const colaTotal = grupos.reduce((s, g) => s + g.cola, 0);
    const cifras: CifraCarga[] = [];
    if (p.rol === 'docente') {
      cifras.push(
        { etiqueta: 'grupos que imparte', valor: String(grupos.length), icono: 'grupos' },
        { etiqueta: 'casos en cola de validación', valor: String(colaTotal), icono: 'cola', alerta: colaTotal >= SOBRECARGA },
        { etiqueta: 'validaciones (7 días)', valor: String(valSemana[0]?.n ?? 0), icono: 'validaciones' },
        { etiqueta: 'validaciones (30 días)', valor: String(valMes[0]?.n ?? 0), icono: 'validaciones' },
      );
    }
    if (curados[0]?.n) {
      cifras.push({ etiqueta: 'casos curados a la Biblioteca', valor: String(curados[0].n), icono: 'curados' });
    }
    if (cifras.length === 0) {
      cifras.push({ etiqueta: 'rol de gobierno', valor: '—', icono: 'grupos' });
    }

    return {
      id: p.user_id,
      ini: iniciales(p.nombre),
      nombre: p.nombre,
      rol: p.rol,
      email: p.email,
      desde: p.created_at.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
      senal: p.rol === 'docente' && colaTotal >= SOBRECARGA ? `Sobrecarga · ${colaTotal} casos en cola` : undefined,
      cifras,
      grupos,
      permisos: [
        { etiqueta: 'Rol', valor: ETIQUETA_ROL[p.rol] },
        { etiqueta: 'Correo', valor: p.email ?? '—' },
        { etiqueta: 'En la escuela desde', valor: p.created_at.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) },
      ],
    };
  });
}
