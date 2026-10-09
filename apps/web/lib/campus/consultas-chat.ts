import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import type { Sql } from '@/lib/db.server';
import type {
  Contacto,
  ConsultasData,
  Conversacion,
  EstadoConsulta,
  Mensaje,
  TipoContacto,
} from '@/app/(campus)/consultas/_components/tipos';

/**
 * CONSULTAS — data layer del alumno (§ Sprint 5.5 · mock alumno/consultas). Recablea el
 * motor bidireccional (consultas/consulta_mensajes · 0007/0034) a la forma del mock, con
 * RLS (`comoAlumno`): el alumno solo ve SUS consultas y los contactos permitidos.
 *
 * SIN Eco / SIN realtime aquí. La presencia (enLinea/ultimaConexion) NO es real: no hay
 * tracking de sesión → queda como PENDIENTE DE REALTIME (fase 2). Se muestra `enLinea`
 * false y una pista por rol.
 */

const STAFF_ROLES = new Set(['admin', 'super_admin']);
const DOC_ROLES = new Set(['docente']);

function iniDe(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter((x) => !/^(dr|dra)\.?$/i.test(x));
  const base = p.length ? p : nombre.trim().split(/\s+/);
  return (base.slice(0, 2).map((x) => x[0] ?? '').join('') || nombre.slice(0, 2)).toUpperCase();
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function mismoDia(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}
/** "10:42" hoy · "ayer" · "lun" (misma semana) · "22 sep" (más viejo). */
function horaRel(d: Date): string {
  const now = new Date();
  if (mismoDia(d, now)) return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  const ayer = new Date(now.getTime() - 86_400_000);
  if (mismoDia(d, ayer)) return 'ayer';
  const dif = (now.getTime() - d.getTime()) / 86_400_000;
  if (dif < 7) return DIAS[d.getUTCDay()] ?? '';
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()] ?? ''}`;
}
/** Etiqueta de día para el separador del hilo. */
function diaMensaje(d: Date): string {
  const now = new Date();
  if (mismoDia(d, now)) return 'hoy';
  if (mismoDia(d, new Date(now.getTime() - 86_400_000))) return 'ayer';
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()] ?? ''}`;
}
function hhmm(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function tipoDeRol(rol: string | null): TipoContacto {
  if (rol && DOC_ROLES.has(rol)) return 'docente';
  if (rol && STAFF_ROLES.has(rol)) return 'staff';
  return 'colega';
}

type FilaPerfil = { user_id: string; nombre: string; rol: string; especialidad: string | null; sede: string | null };

function aContacto(p: FilaPerfil, tipo: TipoContacto, contextoExtra?: string): Contacto {
  const contextoTipo = tipo === 'docente' ? 'Docente' : tipo === 'staff' ? 'Staff' : 'Colega';
  const detalle = contextoExtra || p.especialidad || (tipo === 'colega' ? 'Ateneo' : 'Campus');
  return {
    id: p.user_id,
    ini: iniDe(p.nombre),
    nombre: p.nombre,
    tipo,
    contexto: `${contextoTipo} · ${detalle}`,
    descripcion: [p.especialidad, p.sede].filter(Boolean).join(' · ') || undefined,
    enLinea: false, // presencia real: PENDIENTE DE REALTIME (fase 2)
    ultimaConexion: tipo === 'staff' ? 'Atiende en horario de oficina' : undefined,
    tiempoRespuesta: tipo === 'docente' ? 'suele responder en el día' : undefined,
  };
}

/** Contactos permitidos: docentes de sus grupos + staff del campus + colegas del Ateneo. */
export async function contactosPermitidos(sql: Sql, userId: string): Promise<Contacto[]> {
  // Fix "modal vacío" (mig 0052): bajo RLS el alumno solo ve su propio perfil, así que
  // armar los contactos con SELECT directo devolvía 0. La función SECURITY DEFINER lee
  // docentes de sus grupos + staff + colegas (acotada a que el llamador sea el alumno).
  const filas = await sql<(FilaPerfil & { tipo: string })[]>`
    select user_id, nombre, rol, especialidad, sede, tipo
    from lxp.contactos_consulta_alumno(${userId})`;
  const vistos = new Set<string>([userId]);
  const out: Contacto[] = [];
  for (const f of filas) {
    if (vistos.has(f.user_id)) continue;
    vistos.add(f.user_id);
    const tipo = (['docente', 'staff', 'colega'].includes(f.tipo) ? f.tipo : tipoDeRol(f.rol)) as TipoContacto;
    out.push(aContacto(f, tipo, tipo === 'colega' ? 'Ateneo' : undefined));
  }
  return out;
}

/**
 * Temas para el PASO 2 del modal (solo docente/staff): las lecciones de los cursos en que
 * el alumno está inscrito (CORA → lxp.grupos → programa → módulos → lecciones). El alumno
 * lee lecciones/módulos/programas bajo RLS (`using true`); sus grupos vía cora_grupos_de.
 */
export async function temasConsulta(sql: Sql, userId: string): Promise<{ id: string; etiqueta: string }[]> {
  const filas = await sql<{ id: string; mod_orden: number; lec_orden: number; nombre: string }[]>`
    select lec.id, mo.orden as mod_orden, lec.orden as lec_orden, lec.nombre
    from lxp.cora_grupos_de(${userId}) cg
    join lxp.grupos g on g.cora_grupo_id = cg.grupo_id
    join lxp.modulos mo on mo.programa_id = g.programa_id
    join lxp.lecciones lec on lec.modulo_id = mo.id
    order by mo.orden, lec.orden`;
  return filas.map((f) => ({ id: f.id, etiqueta: `M${f.mod_orden}·L${f.lec_orden} · ${f.nombre}` }));
}

export async function getConsultasChat(userId: string): Promise<ConsultasData> {
  return comoAlumno(userId, async (sql) => {
    const yoFila = (await sql<{ nombre: string | null }[]>`select nombre from lxp.perfiles where user_id = ${userId}`)[0];
    const yoNombre = yoFila?.nombre ?? 'Usted';

    const filas = await sql<
      {
        id: string;
        tipo_contacto: string;
        contacto_id: string | null;
        contacto: string | null;
        contacto_rol: string | null;
        contacto_esp: string | null;
        contacto_sede: string | null;
        estado: string;
        cerrada_el: Date | null;
        alumno_leido_en: Date | null;
        origen_nombre: string | null;
        origen_id: string | null;
        origen_creada: Date;
        ultimo_texto: string | null;
        ultimo_de_mi: boolean;
        ultimo_en: Date | null;
        no_leidos: number;
      }[]
    >`
      select q.id, q.tipo_contacto::text as tipo_contacto,
             coalesce(q.contacto_id, q.id_docente) as contacto_id,
             lxp.nombre_de(coalesce(q.contacto_id, q.id_docente)) as contacto,
             (select rol::text from lxp.perfiles pf where pf.user_id = coalesce(q.contacto_id, q.id_docente)) as contacto_rol,
             (select especialidad from lxp.perfiles pf where pf.user_id = coalesce(q.contacto_id, q.id_docente)) as contacto_esp,
             (select sede from lxp.perfiles pf where pf.user_id = coalesce(q.contacto_id, q.id_docente)) as contacto_sede,
             q.estado, q.cerrada_el, q.alumno_leido_en,
             lec.nombre as origen_nombre, q.origen_leccion_id as origen_id, q.created_at as origen_creada,
             (select cuerpo from lxp.consulta_mensajes cm where cm.consulta_id = q.id order by cm.created_at desc limit 1) as ultimo_texto,
             (select (cm.autor_id = ${userId}) from lxp.consulta_mensajes cm where cm.consulta_id = q.id order by cm.created_at desc limit 1) as ultimo_de_mi,
             (select cm.created_at from lxp.consulta_mensajes cm where cm.consulta_id = q.id order by cm.created_at desc limit 1) as ultimo_en,
             (select count(*)::int from lxp.consulta_mensajes cm
                where cm.consulta_id = q.id and cm.autor_id <> ${userId}
                  and cm.leido_en is null) as no_leidos
      from lxp.consultas q
      left join lxp.lecciones lec on lec.id = q.origen_leccion_id
      where q.id_alumno = ${userId}
      order by (select max(cm.created_at) from lxp.consulta_mensajes cm where cm.consulta_id = q.id) desc nulls last`;

    const conversaciones: Conversacion[] = filas
      .filter((f) => f.contacto_id)
      .map((f) => {
        const tipo = (['docente', 'staff', 'colega'].includes(f.tipo_contacto) ? f.tipo_contacto : tipoDeRol(f.contacto_rol)) as TipoContacto;
        const contacto = aContacto(
          { user_id: f.contacto_id!, nombre: f.contacto ?? 'Contacto', rol: f.contacto_rol ?? '', especialidad: f.contacto_esp, sede: f.contacto_sede },
          tipo,
        );
        // estado: null para colegas; 'cerrada' si lo está; si no, deriva por dirección del último mensaje.
        let estado: EstadoConsulta | null;
        if (tipo === 'colega') estado = null;
        else if (f.estado === 'cerrada') estado = 'cerrada';
        else estado = f.ultimo_de_mi ? 'abierta' : 'respondida';
        return {
          id: f.id,
          contacto,
          ultimoMensaje: { texto: f.ultimo_texto ?? 'Conversación nueva', deMi: f.ultimo_de_mi === true },
          hora: f.ultimo_en ? horaRel(f.ultimo_en) : horaRel(f.origen_creada),
          noLeidos: f.no_leidos,
          estado,
          origen: f.origen_id
            ? { etiqueta: f.origen_nombre ?? 'la lección', href: `/leccion/${f.origen_id}`, abierta: `${f.origen_creada.getUTCDate()} ${MESES[f.origen_creada.getUTCMonth()] ?? ''}` }
            : undefined,
          cerradaEl: f.cerrada_el ? diaMensaje(f.cerrada_el) : undefined,
        };
      });

    const [contactos, temas] = await Promise.all([
      contactosPermitidos(sql, userId),
      temasConsulta(sql, userId),
    ]);

    return {
      yo: { id: userId, ini: iniDe(yoNombre), nombre: yoNombre },
      conversaciones,
      contactos,
      temas,
    };
  });
}

/** Nº de consultas con mensajes sin leer (para el badge del menú). */
export async function contarConsultasNoLeidas(userId: string): Promise<number> {
  return comoAlumno(userId, async (sql) => {
    const r = await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.consultas q
      where q.id_alumno = ${userId}
        and exists (
          select 1 from lxp.consulta_mensajes cm
          where cm.consulta_id = q.id and cm.autor_id <> ${userId}
            and cm.leido_en is null
        )`;
    return r[0]?.n ?? 0;
  });
}

/** Mensajes de una consulta (para cargar el hilo al abrir · bajo RLS). */
export async function mensajesDeConsulta(sql: Sql, userId: string, consultaId: string): Promise<Mensaje[]> {
  const filas = await sql<{ id: string; autor_id: string; cuerpo: string; adjuntos: unknown; created_at: Date; leido_en: Date | null }[]>`
    select cm.id, cm.autor_id, cm.cuerpo, cm.adjuntos, cm.created_at, cm.leido_en
    from lxp.consulta_mensajes cm
    where cm.consulta_id = ${consultaId}
    order by cm.created_at asc`;
  return filas.map((m) => {
    const deMi = m.autor_id === userId;
    const adjuntos = Array.isArray(m.adjuntos)
      ? (m.adjuntos as { id?: string; tipo?: string; nombre?: string; meta?: string; url?: string }[]).map((a, i) => ({
          id: a.id ?? `adj-${i}`,
          tipo: (['imagen', 'video', 'loop', 'archivo'].includes(a.tipo ?? '') ? a.tipo : 'archivo') as 'imagen' | 'video' | 'loop' | 'archivo',
          nombre: a.nombre ?? 'archivo',
          meta: a.meta ?? '',
          url: a.url,
        }))
      : undefined;
    // Read-receipt REAL per-mensaje (mig 0051): el mensaje propio muestra ✓✓ "leído"
    // cuando la contraparte lo abrió (leido_en seteado), ✓ "enviado" si aún no.
    return {
      id: m.id,
      deMi,
      texto: m.cuerpo || undefined,
      adjuntos: adjuntos && adjuntos.length ? adjuntos : undefined,
      hora: hhmm(m.created_at),
      dia: diaMensaje(m.created_at),
      estado: deMi ? (m.leido_en ? 'leido' : 'enviado') : undefined,
    };
  });
}
