import 'server-only';
import { comoStaff } from '@/lib/db.server';
import type { EstudioDicom, SerieDicom } from '@/components/dicom';
import type {
  CabeceraDocente,
  CasoValidacion,
  ClaseAgenda,
  ClasificacionEco,
  ConsultaDetalle,
  ConsultaHilo,
  DocenteDashboard,
  DominioIaim,
  EntregaRevision,
  EstadoEntrega,
  GrupoSeguimiento,
  MensajeConsulta,
  PostAteneoResumen,
  PropuestaEcoResumen,
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

// ── Eco: fila de `lxp.eco_propuestas` → resumen para la UI (§7A) ─────────────────
/** Columnas que traemos de `lxp.eco_propuestas` en los joins de la bandeja. */
type FilaEco = {
  eco_id: string | null;
  eco_nota: number | null;
  eco_feedback: string | null;
  eco_confianza: number | null;
  eco_clasificacion: string | null;
  eco_detalle: unknown;
};

/**
 * Arma el `PropuestaEcoResumen` a partir del LEFT JOIN a `eco_propuestas`. Devuelve
 * `null` si el objeto no tiene propuesta vigente. `criterios`/`omisiones`/`modelo`
 * salen del jsonb `detalle` (la traza del pipeline · §7A) de forma defensiva.
 */
function mapearEco(f: FilaEco): PropuestaEcoResumen | null {
  if (!f.eco_id) return null;
  const d = (f.eco_detalle ?? {}) as Record<string, unknown>;
  const criteriosRaw = Array.isArray(d.criterios) ? (d.criterios as unknown[]) : [];
  const criterios = criteriosRaw
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return {
        criterio: typeof o.criterio === 'string' ? o.criterio : '',
        puntaje: typeof o.puntaje === 'number' ? o.puntaje : 0,
        comentario: typeof o.comentario === 'string' ? o.comentario : undefined,
      };
    })
    .filter((c) => c.criterio);
  const omisiones = Array.isArray(d.omisiones)
    ? (d.omisiones as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  return {
    propuestaId: f.eco_id,
    notaSugerida: f.eco_nota,
    feedbackBorrador: f.eco_feedback,
    confianza: f.eco_confianza ?? 0,
    clasificacion: (f.eco_clasificacion as ClasificacionEco) ?? 'requiere_criterio',
    criterios,
    omisiones,
    modelo: typeof d.modelo === 'string' ? d.modelo : null,
  };
}

/**
 * Mapea las series anonimizadas del caso (`bitacora_casos.estudio_series`, jsonb
 * `[{ series_uid, modalidad, frames, instancias, ref }]` · migración 0014) al
 * contrato `EstudioDicom` que consume el visor real (Cornerstone3D · §4.7). El visor
 * NO parsea binario: recibe `imageId`s opacos que el motor sabe cargar. Convención
 * (ver `components/dicom/types.ts`): un `imageId` por frame; multi-frame = cine-loop.
 *
 * Solo devuelve un estudio si está `anonimizado` (§10: nunca montar PII). `null` si el
 * caso aún no tiene estudio procesado — el pipeline `procesar-dicom` lo llena (§8).
 */
function mapearEstudio(casoId: string, seriesJson: unknown, estado: string | null): EstudioDicom | null {
  if (estado && estado !== 'anonimizado') return null;
  if (!Array.isArray(seriesJson) || seriesJson.length === 0) return null;

  const series: SerieDicom[] = seriesJson.flatMap((raw, i): SerieDicom[] => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const ref = typeof s.ref === 'string' && s.ref.trim() ? s.ref.trim() : null;
    if (!ref) return []; // sin referencia en object storage no hay nada que cargar
    const nFrames = typeof s.frames === 'number' && s.frames > 0 ? Math.floor(s.frames) : 1;
    const serieId = typeof s.series_uid === 'string' && s.series_uid ? s.series_uid : `serie-${i + 1}`;
    const modalidad = typeof s.modalidad === 'string' && s.modalidad ? s.modalidad : 'US';
    // Multi-frame → un imageId por frame (`?frame=N`); estática → un único frame.
    const frames = Array.from({ length: nFrames }, (_, f) => ({
      imageId: nFrames > 1 ? `wadouri:${ref}?frame=${f}` : `wadouri:${ref}`,
      indice: f,
    }));
    return [{ id: serieId, descripcion: `${modalidad} · ${serieId}`, modalidad, frames }];
  });

  if (series.length === 0) return null;
  return { id: casoId, series };
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
      ({
        id: string;
        grupo_id: string | null;
        organo: string | null;
        dominio_iaim: DominioIaim | null;
        hallazgos: string | null;
        diagnostico_presuntivo: string | null;
        horas: number;
        created_at: Date;
        alumno: string;
        modulo: string | null;
        dicom_ref: string | null;
        estudio_series: unknown;
        estudio_estado: string | null;
        series: number;
        cine_loop: boolean;
      } & FilaEco)[]
    >`
      select c.id, c.grupo_id, c.organo, c.dominio_iaim, c.hallazgos, c.diagnostico_presuntivo,
             c.horas_estimadas::float8 as horas, c.created_at,
             a.nombre as alumno, m.nombre as modulo, c.estudio_dicom_ref as dicom_ref,
             c.estudio_series, c.estudio_estado::text as estudio_estado,
             coalesce(jsonb_array_length(c.estudio_series), 0)::int as series,
             exists (
               select 1 from jsonb_array_elements(c.estudio_series) s
               where (s->>'frames')::int > 1
             ) as cine_loop,
             -- Bandeja de Eco (§7A): propuesta VIGENTE para este caso (RLS es_docente_o_mas).
             ep.id as eco_id, ep.nota_sugerida::float8 as eco_nota, ep.feedback_borrador as eco_feedback,
             ep.confianza_score::float8 as eco_confianza, ep.clasificacion::text as eco_clasificacion,
             ep.detalle as eco_detalle
      from lxp.bitacora_casos c
      join lxp.perfiles a on a.user_id = c.id_alumno
      left join lxp.modulos m on m.id = c.modulo_id
      left join lxp.eco_propuestas ep
        on ep.objeto_tipo = 'caso' and ep.objeto_id = c.id and ep.estado = 'propuesta'
      where c.estado_validacion = 'pendiente'
      order by c.created_at asc`;

    const ahora = Date.now();
    return rows.map((r) => ({
      id: r.id,
      grupoId: r.grupo_id,
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
      estudio: mapearEstudio(r.id, r.estudio_series, r.estudio_estado),
      eco: mapearEco(r),
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

/** Mapea el enum de 7 tipos de lección (mig 0023) al union de la consola (tarea/autoeval/foro). */
function tipoLeccionAActividad(tipo: string | null): TipoActividad {
  return tipo === 'tarea' || tipo === 'autoevaluacion' || tipo === 'foro' ? tipo : 'tarea';
}

export async function getEntregas(userId: string): Promise<EntregaRevision[]> {
  return comoStaff(userId, async (sql) => {
    // Anclaje por LECCIÓN (modelo nuevo · mig 0023/0026) con fallback a la actividad
    // (modelo viejo, aún vivo): la lección da nombre/tipo/módulo cuando existe; si la
    // entrega no tiene leccion_id (contenido previo) se cae al join por actividad.
    const rows = await sql<
      ({
        id: string;
        grupo_id: string | null;
        estado: EstadoEntrega;
        nota: number | null;
        eco_sugerida: boolean;
        contenido: unknown;
        created_at: Date;
        alumno: string;
        leccion_id: string | null;
        actividad_id: string | null;
        titulo_leccion: string | null;
        titulo_actividad: string | null;
        tipo_leccion: string | null;
        tipo_actividad: TipoActividad | null;
        leccion: string | null;
        modulo: string | null;
      } & FilaEco)[]
    >`
      select e.id, e.grupo_id, e.estado, e.nota::float8 as nota, e.eco_sugerida, e.contenido, e.created_at,
             al.nombre as alumno,
             e.leccion_id, e.actividad_id,
             ln.nombre as titulo_leccion, ac.titulo as titulo_actividad,
             ln.tipo::text as tipo_leccion, ac.tipo as tipo_actividad,
             coalesce(ln.nombre, la.nombre) as leccion,
             coalesce(mn.nombre, ma.nombre) as modulo,
             -- Bandeja de Eco (§7A): propuesta VIGENTE para esta entrega (RLS es_docente_o_mas).
             ep.id as eco_id, ep.nota_sugerida::float8 as eco_nota, ep.feedback_borrador as eco_feedback,
             ep.confianza_score::float8 as eco_confianza, ep.clasificacion::text as eco_clasificacion,
             ep.detalle as eco_detalle
      from lxp.entregas e
      join lxp.perfiles al on al.user_id = e.id_alumno
      -- Nuevo: lección anclada directo (mig 0026).
      left join lxp.lecciones ln on ln.id = e.leccion_id
      left join lxp.modulos mn on mn.id = ln.modulo_id
      -- Viejo: actividad → lección (compat).
      left join lxp.actividades ac on ac.id = e.actividad_id
      left join lxp.lecciones la on la.id = ac.leccion_id
      left join lxp.modulos ma on ma.id = la.modulo_id
      left join lxp.eco_propuestas ep
        on ep.objeto_tipo = 'entrega' and ep.objeto_id = e.id and ep.estado = 'propuesta'
      order by
        case e.estado when 'enviada' then 0 when 'pendiente' then 1 else 2 end,
        e.created_at asc`;

    return rows.map((r) => {
      // Preferimos el modelo nuevo (lección) para título/tipo/id; caemos a la actividad.
      const porLeccion = r.leccion_id !== null;
      return {
        id: r.id,
        grupoId: r.grupo_id,
        alumno: r.alumno,
        iniciales: iniciales(r.alumno),
        actividad: (porLeccion ? r.titulo_leccion : r.titulo_actividad) ?? r.leccion ?? 'Entrega',
        // Ancla que Eco usa para acotar el lote: la lección (nuevo) o la actividad (viejo).
        actividadId: r.actividad_id ?? '',
        leccionId: r.leccion_id,
        tipoActividad: porLeccion
          ? tipoLeccionAActividad(r.tipo_leccion)
          : (r.tipo_actividad ?? 'tarea'),
        leccion: r.leccion,
        modulo: r.modulo,
        estado: r.estado,
        nota: r.nota,
        ecoSugerida: r.eco_sugerida,
        notaAlumno: notaAlumnoDe(r.contenido),
        creadoEn: r.created_at,
        eco: mapearEco(r),
      };
    });
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

/** Seguimiento de un grupo: cabecera + temario del programa (referencia). El avance
 *  por alumno es PENDIENTE (worker de competencia + inscripción de CORA · §8/Sprint 11). */
export type ModuloTemario = { id: string; clave: string; titulo: string; horas: number; lecciones: number };
export type GrupoSeguimientoDetalle = {
  id: string;
  nombre: string;
  programa: string;
  modalidad: 'sincrono' | 'asincrono';
  fechaInicio: Date | null;
  fechaFin: Date | null;
  totales: { modulos: number; horas: number; lecciones: number };
  temario: ModuloTemario[];
};

export async function getGrupoSeguimiento(
  userId: string,
  grupoId: string,
): Promise<GrupoSeguimientoDetalle | null> {
  return comoStaff(userId, async (sql) => {
    const g = (
      await sql<
        {
          id: string;
          nombre: string;
          modalidad: 'sincrono' | 'asincrono';
          fecha_inicio: Date | null;
          fecha_fin: Date | null;
          programa_id: string;
          programa: string;
        }[]
      >`
        select g.id, g.nombre, g.modalidad, g.fecha_inicio, g.fecha_fin,
               p.id as programa_id, p.nombre as programa
        from lxp.grupos g
        join lxp.programas p on p.id = g.programa_id
        where g.id = ${grupoId} and g.docente_id = ${userId}
        limit 1`
    )[0];
    if (!g) return null;

    const modulos = await sql<{ id: string; nombre: string; orden: number; horas: number }[]>`
      select id, nombre, orden, horas::float8 as horas
      from lxp.modulos where programa_id = ${g.programa_id} order by orden, created_at`;
    const moduloIds = modulos.map((m) => m.id);
    const lecciones = moduloIds.length
      ? await sql<{ modulo_id: string; n: number }[]>`
          select modulo_id, count(*)::int as n from lxp.lecciones
          where modulo_id in ${sql(moduloIds)} group by modulo_id`
      : [];
    const leccionesPorModulo = new Map(lecciones.map((l) => [l.modulo_id, l.n]));

    return {
      id: g.id,
      nombre: g.nombre,
      programa: g.programa,
      modalidad: g.modalidad,
      fechaInicio: g.fecha_inicio,
      fechaFin: g.fecha_fin,
      totales: {
        modulos: modulos.length,
        horas: Math.round(modulos.reduce((s, m) => s + m.horas, 0)),
        lecciones: lecciones.reduce((s, l) => s + l.n, 0),
      },
      temario: modulos.map((m, i) => ({
        id: m.id,
        clave: String(i + 1).padStart(2, '0'),
        titulo: m.nombre,
        horas: Math.round(m.horas),
        lecciones: leccionesPorModulo.get(m.id) ?? 0,
      })),
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
