import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { firmarLecturaImagenes } from '@/lib/media/firmar-imagenes.server';
import {
  DOMINIOS,
  type BitacoraData,
  type CasoBitacora,
  type CasoDetalleBitacora,
  type DocenteOpcion,
  type DominioIaim,
  type EstadoCaso,
  type EstudioEstado,
  type ModuloOpcion,
} from './bitacora-contrato';

/** Normaliza un jsonb que debería ser arreglo de strings a string[] seguro. */
function comoLista(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

/**
 * Lectura de Mi Bitácora. Corre con RLS vía `comoAlumno`: el alumno solo ve SUS
 * casos y solo si `acceso_activo` (policy bitacora_select · 0010). Devuelve datos
 * listos para la UI, sin lógica de dominio (§2). Ver contrato para el reparto
 * REAL vs PENDIENTE (DICOM/validación/horas).
 */

/** Primera línea (o recorte) de los hallazgos, para el título corto de la tarjeta. */
function hallazgoCorto(hallazgos: string | null): string {
  const t = (hallazgos ?? '').trim();
  if (!t) return 'Caso sin hallazgos capturados';
  const linea = t.split(/\r?\n/)[0]!.trim();
  return linea.length > 120 ? `${linea.slice(0, 117)}…` : linea;
}

/**
 * Título de la tarjeta del caso: si viene de un REPORTE, "Plantilla · Tipo de estudio" (así dos
 * casos de la misma plantilla con distinto tipo/estudio se distinguen). Si no hay plantilla (caso
 * subido a mano), cae al hallazgo corto — el título de antes.
 */
function tituloCaso(plantillaNombre: string | null, tipoEstudio: string | null, fallback: string): string {
  const p = (plantillaNombre ?? '').trim();
  if (!p) return fallback;
  const t = (tipoEstudio ?? '').trim();
  return t ? `${p} · ${t}` : p;
}

/** Expediente del estudio desde el snapshot (sección encabezado del contenido estructurado). null si no hay. */
function expedienteDe(ce: import('@campus/shared').ContenidoEstructuradoCaso | null): string | null {
  const enc = (ce?.secciones ?? []).find((s) => s.tipo === 'encabezado');
  const campo = (enc?.campos ?? []).find((c) => c.id === 'expediente' || /expediente/i.test(c.nombre ?? ''));
  if (!campo) return null;
  const v = ce?.valores?.[campo.id];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Docentes disponibles para asignar la validación (SECURITY DEFINER · mig 0025). */
export async function getDocentes(userId: string): Promise<DocenteOpcion[]> {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<{ user_id: string; nombre: string }[]>`
      select user_id, nombre from lxp.docentes_disponibles()`;
    return rows.map((d) => ({ id: d.user_id, nombre: d.nombre }));
  });
}

/** Detalle de UN caso del alumno (para la pantalla completa con visor · §4.7). */
export async function getCasoBitacora(
  userId: string,
  casoId: string,
): Promise<CasoDetalleBitacora | null> {
  return comoAlumno(userId, async (sql) => {
    const r = (
      await sql<
        {
          id: string;
          hallazgos: string | null;
          presuntivo: string | null;
          modulo: string | null;
          organo: string | null;
          patologia: string | null;
          dominio_iaim: DominioIaim | null;
          tecnica: string | null;
          equipo: string | null;
          vineta: string | null;
          etiquetas: unknown;
          docente_id: string | null;
          docente: string | null;
          created_at: Date;
          estado_validacion: EstadoCaso;
          estudio_estado: EstudioEstado;
          series: number;
          cine_loop: boolean;
          feedback: string | null;
          contenido_estructurado: import('@campus/shared').ContenidoEstructuradoCaso | null;
        }[]
      >`
        select
          c.id, c.hallazgos, c.diagnostico_presuntivo as presuntivo,
          m.nombre as modulo, c.organo, c.patologia, c.dominio_iaim,
          c.tecnica, c.equipo, c.vineta, c.etiquetas,
          c.docente_id, lxp.nombre_de(c.docente_id) as docente,
          c.contenido_estructurado,
          c.created_at, c.estado_validacion, c.estudio_estado,
          coalesce(jsonb_array_length(c.estudio_series), 0)::int as series,
          exists (
            select 1 from jsonb_array_elements(c.estudio_series) s
            where (s->>'frames')::int > 1
          ) as cine_loop,
          v.feedback
        from lxp.bitacora_casos c
        left join lxp.modulos m on m.id = c.modulo_id
        left join lateral (
          select feedback from lxp.validaciones
          where caso_id = c.id order by created_at desc limit 1
        ) v on true
        where c.id = ${casoId} and c.id_alumno = ${userId}
        limit 1`
    )[0];
    if (!r) return null;
    return {
      id: r.id,
      hallazgoCorto: hallazgoCorto(r.hallazgos),
      hallazgos: r.hallazgos,
      presuntivo: r.presuntivo,
      modulo: r.modulo,
      organo: r.organo,
      patologia: r.patologia,
      dominio: r.dominio_iaim,
      tecnica: r.tecnica,
      equipo: r.equipo,
      vineta: r.vineta,
      etiquetas: comoLista(r.etiquetas),
      docenteId: r.docente_id,
      docente: r.docente,
      fecha: r.created_at,
      expediente: expedienteDe(r.contenido_estructurado ?? null),
      tipoEstudio: r.contenido_estructurado?.fuente?.tipoEstudio ?? null,
      estado: r.estado_validacion,
      estudioEstado: r.estudio_estado,
      series: r.series,
      cineLoop: r.cine_loop,
      feedback: r.feedback,
      contenidoEstructurado: r.contenido_estructurado ?? null,
    };
  });
}

export async function getBitacora(userId: string): Promise<BitacoraData> {
  return comoAlumno(userId, async (sql) => {
    const casos = await sql<
      {
        id: string;
        hallazgos: string | null;
        modulo: string | null;
        organo: string | null;
        dominio_iaim: DominioIaim | null;
        created_at: Date;
        estado_validacion: EstadoCaso;
        estudio_estado: EstudioEstado;
        estudio_thumb_ref: string | null;
        series: number;
        cine_loop: boolean;
        horas: number;
        feedback: string | null;
        plantilla_nombre: string | null;
        tipo_estudio: string | null;
      }[]
    >`
      select
        c.id,
        c.hallazgos,
        m.nombre                         as modulo,
        c.organo,
        c.dominio_iaim,
        c.created_at,
        c.estado_validacion,
        c.estudio_estado,
        c.estudio_thumb_ref,
        c.contenido_estructurado->'fuente'->>'plantillaNombre' as plantilla_nombre,
        c.contenido_estructurado->'fuente'->>'tipoEstudio'     as tipo_estudio,
        coalesce(jsonb_array_length(c.estudio_series), 0)::int as series,
        exists (
          select 1 from jsonb_array_elements(c.estudio_series) s
          where (s->>'frames')::int > 1
        )                                as cine_loop,
        c.horas_estimadas::float8        as horas,
        v.feedback
      from lxp.bitacora_casos c
      left join lxp.modulos m on m.id = c.modulo_id
      left join lateral (
        select feedback from lxp.validaciones
        where caso_id = c.id order by created_at desc limit 1
      ) v on true
      where c.id_alumno = ${userId}
      order by c.created_at desc`;

    // Horas acreditadas = horas de la proyección de competencia (fuente de verdad).
    const comp = await sql<
      { dominio_iaim: DominioIaim; horas: number; nivel: number; decaimiento: number }[]
    >`
      select dominio_iaim, horas::float8 as horas, nivel::float8 as nivel,
             decaimiento::float8 as decaimiento
      from lxp.competencia_dominios where id_alumno = ${userId}`;

    // Módulos elegibles para el "Subir caso": de los programas publicados (RLS: read
    // true). PENDIENTE: acotar al programa del grupo del alumno (Sprint 11 · contrato).
    const modulosRows = await sql<
      { id: string; nombre: string; programa: string; horas: number }[]
    >`
      select m.id, m.nombre, pr.nombre as programa, m.horas::float8 as horas
      from lxp.modulos m
      join lxp.programas pr on pr.id = m.programa_id
      where pr.publicado
      order by pr.nombre, m.orden`;

    // ── Agregados ──
    const compByDom = new Map(comp.map((c) => [c.dominio_iaim, c]));
    const casosByDom = new Map<DominioIaim, number>();
    const casosByModulo = new Map<string, number>();
    let aprobados = 0;
    let pendientes = 0;
    let rechazados = 0;

    for (const c of casos) {
      if (c.estado_validacion === 'aprobado') aprobados++;
      else if (c.estado_validacion === 'pendiente') pendientes++;
      else rechazados++;
      if (c.dominio_iaim) casosByDom.set(c.dominio_iaim, (casosByDom.get(c.dominio_iaim) ?? 0) + 1);
      if (c.modulo) casosByModulo.set(c.modulo, (casosByModulo.get(c.modulo) ?? 0) + 1);
    }

    const porDominio = DOMINIOS.map((d) => {
      const cd = compByDom.get(d);
      return {
        dominio: d,
        casos: casosByDom.get(d) ?? 0,
        pct: cd ? Math.round(cd.nivel ?? 0) : 0,
        enRepaso: cd ? cd.decaimiento >= 15 : false,
      };
    }).filter((d) => d.casos > 0 || compByDom.has(d.dominio));

    const porModulo = [...casosByModulo.entries()]
      .map(([modulo, n]) => ({ modulo, casos: n }))
      .sort((a, b) => b.casos - a.casos);

    const horasAcreditadas = Math.round(comp.reduce((s, c) => s + c.horas, 0));

    // Thumbs estables (familia B): firma en lote las refs media/imagenes/* presentes.
    const thumbUrls = await firmarLecturaImagenes(casos.map((c) => c.estudio_thumb_ref));

    const items: CasoBitacora[] = casos.map((c) => ({
      id: c.id,
      titulo: tituloCaso(c.plantilla_nombre, c.tipo_estudio, hallazgoCorto(c.hallazgos)),
      hallazgoCorto: hallazgoCorto(c.hallazgos),
      modulo: c.modulo,
      organo: c.organo,
      dominio: c.dominio_iaim,
      fecha: c.created_at,
      estado: c.estado_validacion,
      estudioEstado: c.estudio_estado,
      piezas: c.series,
      cineLoop: c.cine_loop,
      horas: c.horas,
      feedback: c.feedback,
      thumbUrl: c.estudio_thumb_ref ? thumbUrls[c.estudio_thumb_ref] ?? null : null,
    }));

    const modulos: ModuloOpcion[] = modulosRows.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      programa: m.programa,
      horas: m.horas,
    }));

    // Docentes para asignar la validación (SECURITY DEFINER · mig 0025: la RLS de
    // perfiles no deja al alumno listar otros perfiles).
    const docentesRows = await sql<{ user_id: string; nombre: string }[]>`
      select user_id, nombre from lxp.docentes_disponibles()`;
    const docentes: DocenteOpcion[] = docentesRows.map((d) => ({ id: d.user_id, nombre: d.nombre }));

    return {
      horas: { acreditadas: horasAcreditadas, meta: 1000 },
      casos: { total: casos.length, aprobados, pendientes, rechazados },
      porDominio,
      porModulo,
      modulos,
      docentes,
      items,
    };
  });
}
