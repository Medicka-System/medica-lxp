import 'server-only';
import { comoStaff } from '@/lib/db.server';
import type { ClaseProgramada, ClasesData, Grabacion, TipoSesion } from '../_components/tipos';
import { ECO_PLACEHOLDER } from '../_components/eco-placeholder';

/**
 * Datos de Clases del DOCENTE (§5B/§9 · Sprint 6 recableado). TODO web→Supabase bajo
 * RLS (`comoStaff` · Regla de Oro §2): el listado de clases y grabaciones NO pasa por
 * NestJS. Las policies (`clases_read`/`videoteca_read`) más el filtro por `docente_id`
 * acotan a SUS grupos.
 *
 * REAL:
 *  · Agenda de clases       ← `lxp.clases` (mig 0017), sus grupos.
 *  · Grabaciones pasadas     ← `lxp.videoteca` (origen zoom/stream) — las MISMAS que
 *    alimentan «Mis clases grabadas» del alumno (getGrabacionesClase · videoteca).
 *  · Roster (alumnos)        ← `lxp.cora_conteo_alumnos()` (puente CORA, mig 0037).
 *
 * SUPUESTO / PENDIENTE:
 *  · Asistencia por grabación viene del reporte de participantes de Zoom (§9) cruzado
 *    con el roster; aún NO se ingesta → se lee de `fuente_externa` si el seed la trae,
 *    si no queda `null` (la UI muestra "—").
 *  · Eco es PLACEHOLDER (§7A): `ECO_PLACEHOLDER`, sin endpoint.
 */

const TZ = 'America/Mexico_City';

const fDia = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TZ,
});
const fHora = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TZ,
});
const fFecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: TZ });
const fMes = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: TZ });

/** Etiqueta de día legible ("jue 18 sep"), sin comas ni puntos de la locale. */
function etiquetaDia(d: Date): string {
  return fDia.format(d).replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

/** Fecha corta ("11 sep"). */
function etiquetaFecha(d: Date): string {
  return fFecha.format(d).replace(/[.,]/g, '').trim();
}

/** ¿`a` cae en el mismo día calendario que `b` (en la TZ del campus)? */
function mismoDia(a: Date, b: Date): boolean {
  const f = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TZ,
  });
  return f.format(a) === f.format(b);
}

/** Cuánto falta para el inicio, legible ("2 h 40 min" · "40 min" · "ahora"). */
function faltaPara(inicio: Date, ahora: Date): string {
  const min = Math.round((inicio.getTime() - ahora.getTime()) / 60000);
  if (min <= 0) return 'ahora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Duración en segundos → "1:24:10" | "58:32". */
function duracionSeg(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** `lxp.clase_plataforma` (zoom | mico_plus) → tipo de la vista (zoom | mico). */
function tipoDesdePlataforma(plataforma: string | null): TipoSesion {
  return plataforma === 'mico_plus' ? 'mico' : 'zoom';
}

/** Clave corta de la lección ligada ("M04 · L3"), o null si no hay lección. */
function claveLeccion(moduloOrden: number | null, leccionOrden: number | null): string | undefined {
  if (moduloOrden == null || leccionOrden == null) return undefined;
  return `M${String(moduloOrden).padStart(2, '0')} · L${leccionOrden}`;
}

type ClaseRow = {
  id: string;
  plataforma: string;
  titulo: string;
  estado: string;
  inicio_programado: Date | null;
  duracion_min: number | null;
  enlace_union: string | null;
  tiene_inicio: boolean;
  grupo: string;
  cora_grupo_id: string | null;
  modulo_orden: number | null;
  leccion_orden: number | null;
};

type GrabacionRow = {
  id: string;
  titulo: string;
  estado: string;
  origen: string;
  plataforma: string | null;
  duracion_seg: number | null;
  leccion_id: string | null;
  grupo: string;
  cora_grupo_id: string | null;
  fecha: Date;
  asistieron: number | null;
  asistencia_total: number | null;
};

export async function getClasesData(userId: string): Promise<ClasesData> {
  return comoStaff(userId, async (sql) => {
    const ahora = new Date();

    // Roster real por grupo CORA (puente mig 0037, acotado a staff por la función).
    const conteo = await sql<{ cora_grupo_id: string; alumnos: number }[]>`
      select cora_grupo_id, alumnos from lxp.cora_conteo_alumnos()`;
    const alumnosPorCora = new Map(conteo.map((c) => [c.cora_grupo_id, c.alumnos]));

    // Agenda: clases de SUS grupos (RLS clases_read + filtro docente_id). No exponemos
    // el enlace_inicio del host (sensible §6); solo si EXISTE, para habilitar "Iniciar".
    const clasesRows = await sql<ClaseRow[]>`
      select c.id, c.plataforma::text as plataforma, c.titulo, c.estado::text as estado,
             c.inicio_programado, c.duracion_min, c.enlace_union,
             (c.enlace_inicio is not null) as tiene_inicio,
             g.nombre as grupo, g.cora_grupo_id,
             m.orden as modulo_orden, l.orden as leccion_orden
      from lxp.clases c
      join lxp.grupos g on g.id = c.grupo_id
      left join lxp.lecciones l on l.id = c.leccion_id
      left join lxp.modulos   m on m.id = l.modulo_id
      where g.docente_id = ${userId}
        and c.estado in ('agendada', 'en_curso')
      order by c.inicio_programado asc nulls last, c.created_at asc`;

    // Grabaciones: las mismas de la videoteca del alumno (origen zoom/stream), de sus
    // grupos. La fecha es el inicio de la clase, si la grabación quedó ligada a una.
    const grabRows = await sql<GrabacionRow[]>`
      select v.id, v.titulo, v.estado::text as estado, v.origen::text as origen,
             cl.plataforma::text as plataforma, v.duracion_seg, v.leccion_id,
             g.nombre as grupo, g.cora_grupo_id,
             coalesce(cl.inicio_programado, v.created_at) as fecha,
             nullif(v.fuente_externa->>'asistieron', '')::int as asistieron,
             nullif(v.fuente_externa->>'total', '')::int as asistencia_total
      from lxp.videoteca v
      join lxp.grupos g on g.id = v.grupo_id
      left join lxp.clases cl on cl.id = v.clase_id
      where g.docente_id = ${userId}
        and v.origen in ('zoom', 'stream')
      order by fecha desc nulls last, v.created_at desc`;

    // ── Mapear agenda ────────────────────────────────────────────────────────────
    // "Hoy" = una sola clase (la más próxima de las de hoy) para no vaciar "próximas".
    let idHoy: string | null = null;
    for (const r of clasesRows) {
      if (r.inicio_programado && mismoDia(r.inicio_programado, ahora)) {
        idHoy = r.id;
        break; // filas ya vienen ordenadas por inicio asc
      }
    }

    const clases: ClaseProgramada[] = clasesRows.map((r): ClaseProgramada => {
      const inicio = r.inicio_programado ? new Date(r.inicio_programado) : null;
      const tipo = tipoDesdePlataforma(r.plataforma);
      const esHoy = r.id === idHoy;
      return {
        id: r.id,
        tipo,
        tema: r.titulo,
        grupo: r.grupo,
        alumnos: (r.cora_grupo_id && alumnosPorCora.get(r.cora_grupo_id)) || 0,
        dia: esHoy ? 'hoy' : inicio ? etiquetaDia(inicio) : 'sin fecha',
        hora: inicio ? fHora.format(inicio) : '—',
        duracion: r.duracion_min ? `${r.duracion_min} min` : '—',
        inicioISO: inicio ? inicio.toISOString() : null,
        leccion: claveLeccion(r.modulo_orden, r.leccion_orden),
        hoy: esHoy || undefined,
        empiezaEn: esHoy && inicio ? faltaPara(inicio, ahora) : undefined,
        enlace: tipo === 'mico' ? r.enlace_union : undefined,
        puedeIniciar: tipo === 'zoom' ? r.tiene_inicio : undefined,
      };
    });

    // ── Mapear grabaciones ───────────────────────────────────────────────────────
    const grabaciones: Grabacion[] = grabRows.map((r): Grabacion => ({
      id: r.id,
      tipo: tipoDesdePlataforma(r.plataforma),
      tema: r.titulo.replace(/^Grabación · /, ''),
      grupo: r.grupo,
      fecha: etiquetaFecha(new Date(r.fecha)),
      duracion: r.duracion_seg ? duracionSeg(r.duracion_seg) : '—',
      asistieron: r.asistieron,
      total: r.asistencia_total ?? (r.cora_grupo_id ? alumnosPorCora.get(r.cora_grupo_id) ?? null : null),
      ligada: r.leccion_id != null,
      estado: r.estado as Grabacion['estado'],
      leccionId: r.leccion_id,
    }));

    // ── Filtro de grupos (para Grabaciones) ──────────────────────────────────────
    const gruposFiltro = ['Todas', ...new Set(grabaciones.map((g) => g.grupo))];

    // ── Resumen del mes (derivado de lo real; asistencia = seed/pendiente §9) ─────
    const listas = grabaciones.filter((g) => g.estado === 'listo' || g.estado === undefined);
    const ligadas = grabaciones.filter((g) => g.ligada).length;
    const conAsistencia = grabaciones.filter(
      (g) => g.asistieron != null && g.total != null && g.total > 0,
    );
    const asistenciaMedia = conAsistencia.length
      ? Math.round(
          (conAsistencia.reduce((s, g) => s + (g.asistieron! / g.total!), 0) / conAsistencia.length) *
            100,
        )
      : null;
    const horasVivo =
      listas.reduce((s, g) => {
        const partes = g.duracion.split(':').map(Number);
        const seg =
          partes.length === 3
            ? partes[0] * 3600 + partes[1] * 60 + partes[2]
            : partes.length === 2
              ? partes[0] * 60 + partes[1]
              : 0;
        return s + (Number.isFinite(seg) ? seg : 0);
      }, 0) / 3600;
    const micoVivo = listas.filter((g) => g.tipo === 'mico').length;

    const mesActual = fMes.format(ahora);
    const resumenMes: ClasesData['resumenMes'] = [
      {
        titulo: 'Clases dadas',
        valor: String(grabaciones.length),
        detalle: `${clases.length} próximas`,
      },
      {
        titulo: 'Horas en vivo',
        valor: `${horasVivo.toFixed(1)} h`,
        detalle: micoVivo ? `${micoVivo} en MiCo+` : 'este ciclo',
      },
      {
        titulo: 'Asistencia media',
        valor: asistenciaMedia != null ? `${asistenciaMedia}%` : '—',
        detalle: conAsistencia.length ? `${conAsistencia.length} con reporte` : 'sin reporte aún',
      },
      {
        titulo: 'Grabaciones ligadas',
        valor: `${ligadas} de ${grabaciones.length}`,
        detalle: grabaciones.length - ligadas ? `${grabaciones.length - ligadas} por ligar` : 'al día',
      },
    ];

    return {
      clases,
      grabaciones,
      gruposFiltro,
      resumenMes,
      eco: ECO_PLACEHOLDER,
      totalGrabaciones: grabaciones.length,
      mesActual,
    };
  });
}
