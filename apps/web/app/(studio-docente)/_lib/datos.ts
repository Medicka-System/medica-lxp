import 'server-only';
import { comoStaff } from '@/lib/db.server';
import type {
  CabeceraDocente,
  CasoValidacion,
  ClaseAgenda,
  ConsultaDetalle,
  ConsultaHilo,
  DocenteDashboard,
  DominioIaim,
  EntregaRevision,
  EstadoEntrega,
  GrupoSeguimiento,
  MensajeConsulta,
  PostAteneoResumen,
  RecursoDocente,
  TipoActividad,
} from './contrato';

/**
 * Lecturas de la consola del DOCENTE (§5B). TODAS corren con RLS vía `comoStaff`: las
 * policies (`lxp.es_docente_o_mas()` / `lxp.es_staff()`) deciden qué ve el docente,
 * igual que en producción. NO usa `service_role` (§2/§10). Devuelven datos listos
 * para la UI, sin lógica de dominio (§2). Ver contrato para REAL vs PENDIENTE.
 */

const HORA_MS = 60 * 60 * 1000;

/** Iniciales de un nombre para el avatar (mismo criterio que el resto del Studio). */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter((p) => !/^(dr|dra|dr\.|dra\.)$/i.test(p));
  const base = partes.length ? partes : nombre.trim().split(/\s+/);
  return (base.slice(0, 2).map((p) => p[0] ?? '').join('') || nombre.slice(0, 2)).toUpperCase();
}

/** Primera línea (o recorte) de un texto, para títulos cortos de tarjeta. */
function corto(texto: string | null, max = 120): string | null {
  const t = (texto ?? '').trim();
  if (!t) return null;
  const linea = t.split(/\r?\n/)[0]!.trim();
  return linea.length > max ? `${linea.slice(0, max - 1)}…` : linea;
}

// ── Cabecera (badge de la cola que define su día) ───────────────────────────────
export async function getCabecera(userId: string): Promise<CabeceraDocente> {
  return comoStaff(userId, async (sql) => {
    const nombreRow = await sql<{ nombre: string }[]>`
      select nombre from lxp.perfiles where user_id = ${userId} limit 1`;
    const cola = await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.bitacora_casos where estado_validacion = 'pendiente'`;
    return { nombre: nombreRow[0]?.nombre ?? 'Docente', casosEnCola: cola[0]?.n ?? 0 };
  });
}

// ── Dashboard (bandeja) ─────────────────────────────────────────────────────────
export async function getDashboard(userId: string): Promise<DocenteDashboard> {
  return comoStaff(userId, async (sql) => {
    const casos = await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.bitacora_casos where estado_validacion = 'pendiente'`;
    const entregas = await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.entregas where estado = 'enviada'`;
    // Foros con actividad = PENDIENTE (hilos sin respuesta del docente exigen cruzar
    // membresía del grupo · Sprint 9). Por ahora 0 real hasta modelarlo bien.
    const foros = 0;

    const grupos = await getGruposDocente(userId, sql);
    const ateneo = await getAteneoResumen(userId, sql);

    return {
      pendientes: { casos: casos[0]?.n ?? 0, entregas: entregas[0]?.n ?? 0, foros },
      totalGrupos: grupos.length,
      grupos,
      ateneo,
    };
  });
}

// ── Grupos del docente (seguimiento) ────────────────────────────────────────────
/** Reutilizable: acepta un `sql` ya abierto (evita anidar transacciones). */
async function getGruposDocente(
  userId: string,
  sql: Parameters<Parameters<typeof comoStaff>[1]>[0],
): Promise<GrupoSeguimiento[]> {
  const rows = await sql<
    {
      id: string;
      nombre: string;
      modalidad: 'sincrono' | 'asincrono';
      fecha_inicio: Date | null;
      fecha_fin: Date | null;
      programa: string;
    }[]
  >`
    select g.id, g.nombre, g.modalidad, g.fecha_inicio, g.fecha_fin, p.nombre as programa
    from lxp.grupos g
    join lxp.programas p on p.id = g.programa_id
    where g.docente_id = ${userId}
    order by g.fecha_inicio desc nulls last, g.created_at desc`;

  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    programa: r.programa,
    modalidad: r.modalidad,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    // PENDIENTE: inscritos (CORA · Sprint 11) y avance (worker de competencia · §8).
    alumnos: null,
    avance: null,
  }));
}

export async function getGrupos(userId: string): Promise<GrupoSeguimiento[]> {
  return comoStaff(userId, (sql) => getGruposDocente(userId, sql));
}

// ── Ateneo de sus grupos (vistazo accionable) ───────────────────────────────────
async function getAteneoResumen(
  userId: string,
  sql: Parameters<Parameters<typeof comoStaff>[1]>[0],
): Promise<PostAteneoResumen[]> {
  const rows = await sql<
    {
      id: string;
      tipo: 'caso' | 'encuesta' | 'anuncio_comunidad';
      titulo: string;
      cuerpo: string | null;
      vineta: string | null;
      estado: 'pendiente' | 'aprobado' | 'rechazado';
      created_at: Date;
      autor: string;
      comentarios: number;
    }[]
  >`
    select po.id, po.tipo, po.titulo, po.cuerpo, po.vineta, po.estado, po.created_at,
           pe.nombre as autor,
           coalesce((select count(*) from lxp.comentarios_ateneo c where c.post_id = po.id), 0)::int as comentarios
    from lxp.posts_ateneo po
    join lxp.perfiles pe on pe.user_id = po.autor_id
    order by po.created_at desc
    limit 6`;

  return rows.map((r) => ({
    id: r.id,
    autor: r.autor,
    iniciales: iniciales(r.autor),
    tipo: r.tipo,
    titulo: r.titulo,
    extracto: corto(r.cuerpo ?? r.vineta, 96),
    estado: r.estado,
    comentarios: r.comentarios,
    creadoEn: r.created_at,
  }));
}

// ── Validación de casos (la cola clínica) ───────────────────────────────────────
export async function getCasosPorValidar(userId: string): Promise<CasoValidacion[]> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        organo: string | null;
        dominio_iaim: DominioIaim | null;
        hallazgos: string | null;
        diagnostico_presuntivo: string | null;
        horas: number;
        created_at: Date;
        alumno: string;
        modulo: string | null;
        dicom_ref: string | null;
        series: number;
        cine_loop: boolean;
      }[]
    >`
      select c.id, c.organo, c.dominio_iaim, c.hallazgos, c.diagnostico_presuntivo,
             c.horas_estimadas::float8 as horas, c.created_at,
             a.nombre as alumno, m.nombre as modulo, c.estudio_dicom_ref as dicom_ref,
             coalesce(jsonb_array_length(c.estudio_series), 0)::int as series,
             exists (
               select 1 from jsonb_array_elements(c.estudio_series) s
               where (s->>'frames')::int > 1
             ) as cine_loop
      from lxp.bitacora_casos c
      join lxp.perfiles a on a.user_id = c.id_alumno
      left join lxp.modulos m on m.id = c.modulo_id
      where c.estado_validacion = 'pendiente'
      order by c.created_at asc`;

    const ahora = Date.now();
    return rows.map((r) => ({
      id: r.id,
      alumno: r.alumno,
      iniciales: iniciales(r.alumno),
      organo: r.organo,
      dominio: r.dominio_iaim,
      modulo: r.modulo,
      hallazgos: r.hallazgos,
      presuntivo: r.diagnostico_presuntivo,
      horas: r.horas,
      creadoEn: r.created_at,
      horasEnCola: Math.max(0, Math.floor((ahora - r.created_at.getTime()) / HORA_MS)),
      tieneDicom: !!r.dicom_ref,
      series: r.series,
      cineLoop: r.cine_loop,
    }));
  });
}

// ── Entregas por revisar ────────────────────────────────────────────────────────
/** Extrae la nota escrita del alumno del jsonb `contenido` (campo libre del seed). */
function notaAlumnoDe(contenido: unknown): string | null {
  if (!contenido || typeof contenido !== 'object') return null;
  const o = contenido as Record<string, unknown>;
  const val = o.nota_alumno ?? o.texto ?? o.respuesta;
  return typeof val === 'string' && val.trim() ? val.trim() : null;
}

export async function getEntregas(userId: string): Promise<EntregaRevision[]> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        estado: EstadoEntrega;
        nota: number | null;
        eco_sugerida: boolean;
        contenido: unknown;
        created_at: Date;
        alumno: string;
        actividad: string;
        tipo: TipoActividad;
        leccion: string | null;
        modulo: string | null;
      }[]
    >`
      select e.id, e.estado, e.nota::float8 as nota, e.eco_sugerida, e.contenido, e.created_at,
             al.nombre as alumno, ac.titulo as actividad, ac.tipo,
             l.nombre as leccion, m.nombre as modulo
      from lxp.entregas e
      join lxp.perfiles al on al.user_id = e.id_alumno
      join lxp.actividades ac on ac.id = e.actividad_id
      left join lxp.lecciones l on l.id = ac.leccion_id
      left join lxp.modulos m on m.id = l.modulo_id
      order by
        case e.estado when 'enviada' then 0 when 'pendiente' then 1 else 2 end,
        e.created_at asc`;

    return rows.map((r) => ({
      id: r.id,
      alumno: r.alumno,
      iniciales: iniciales(r.alumno),
      actividad: r.actividad,
      tipoActividad: r.tipo,
      leccion: r.leccion,
      modulo: r.modulo,
      estado: r.estado,
      nota: r.nota,
      ecoSugerida: r.eco_sugerida,
      notaAlumno: notaAlumnoDe(r.contenido),
      creadoEn: r.created_at,
    }));
  });
}

// ── Consultas 1:1 ───────────────────────────────────────────────────────────────
export async function getConsultas(userId: string): Promise<ConsultaHilo[]> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        asunto: string;
        estado: 'abierta' | 'cerrada';
        updated_at: Date;
        alumno: string;
        mensajes: number;
        ultimo: string | null;
      }[]
    >`
      select q.id, q.asunto, q.estado, q.updated_at, al.nombre as alumno,
             coalesce((select count(*) from lxp.consulta_mensajes cm where cm.consulta_id = q.id), 0)::int as mensajes,
             (select cm.cuerpo from lxp.consulta_mensajes cm
              where cm.consulta_id = q.id order by cm.created_at desc limit 1) as ultimo
      from lxp.consultas q
      join lxp.perfiles al on al.user_id = q.id_alumno
      order by case q.estado when 'abierta' then 0 else 1 end, q.updated_at desc`;

    return rows.map((r) => ({
      id: r.id,
      alumno: r.alumno,
      iniciales: iniciales(r.alumno),
      asunto: r.asunto,
      estado: r.estado,
      actualizado: r.updated_at,
      ultimoMensaje: corto(r.ultimo, 90),
      mensajes: r.mensajes,
    }));
  });
}

export async function getConsultaDetalle(
  userId: string,
  consultaId: string,
): Promise<ConsultaDetalle | null> {
  return comoStaff(userId, async (sql) => {
    const q = (
      await sql<
        { id: string; asunto: string; estado: 'abierta' | 'cerrada'; id_alumno: string; alumno: string }[]
      >`
        select q.id, q.asunto, q.estado, q.id_alumno, al.nombre as alumno
        from lxp.consultas q
        join lxp.perfiles al on al.user_id = q.id_alumno
        where q.id = ${consultaId} limit 1`
    )[0];
    if (!q) return null;

    const mensajes = await sql<
      { id: string; autor_id: string; cuerpo: string; created_at: Date; autor: string }[]
    >`
      select cm.id, cm.autor_id, cm.cuerpo, cm.created_at, pe.nombre as autor
      from lxp.consulta_mensajes cm
      join lxp.perfiles pe on pe.user_id = cm.autor_id
      where cm.consulta_id = ${consultaId}
      order by cm.created_at asc`;

    return {
      id: q.id,
      alumno: q.alumno,
      iniciales: iniciales(q.alumno),
      asunto: q.asunto,
      estado: q.estado,
      mensajes: mensajes.map(
        (m): MensajeConsulta => ({
          id: m.id,
          autor: m.autor_id === q.id_alumno ? 'alumno' : 'docente',
          autorNombre: m.autor,
          cuerpo: m.cuerpo,
          creadoEn: m.created_at,
        }),
      ),
    };
  });
}

// ── Mis recursos (almacén personal) ─────────────────────────────────────────────
export async function getRecursos(userId: string): Promise<RecursoDocente[]> {
  return comoStaff(userId, async (sql) => {
    const rows = await sql<
      { id: string; titulo: string; tipo: string | null; recurso_ref: string | null; created_at: Date }[]
    >`
      select id, titulo, tipo, recurso_ref, created_at
      from lxp.recursos_docente
      where id_docente = ${userId}
      order by created_at desc`;
    return rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      ref: r.recurso_ref,
      creadoEn: r.created_at,
    }));
  });
}

// ── Clases (agenda base · Zoom PENDIENTE Sprint 6) ──────────────────────────────
export async function getClases(userId: string): Promise<ClaseAgenda[]> {
  return comoStaff(userId, async (sql) => {
    const grupos = await getGruposDocente(userId, sql);
    return grupos.map(
      (g): ClaseAgenda => ({
        grupoId: g.id,
        grupo: g.nombre,
        programa: g.programa,
        modalidad: g.modalidad,
      }),
    );
  });
}
