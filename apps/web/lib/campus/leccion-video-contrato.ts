/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Lección tipo VIDEO — render del alumno (modelo NUEVO · mig 0023).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La lección ES un video (mono-tipo): su contenido vive en `lxp.lecciones.config`
 * (no en `lxp.contenidos` ni `lxp.bloques`). El diseñador la arma con `EditorVideo`
 * (studio) y el alumno la consume aquí. Este módulo es PURO (sin React ni server-only)
 * para poder testear el normalizador; lo importan las lecturas de servidor y el
 * componente cliente.
 *
 * CONFIG en la vida real (dos formas, ambas soportadas):
 *   · Editor del diseñador (`EditorVideo`):
 *       { videotecaId, recursoRef, estado, duracionSeg,
 *         hitos: HitoVideo[], transcripcion: CueTranscripcion[] }
 *   · Seed / material legado:
 *       { ref, titulo, transcripcion: string, highlights: [{ t, titulo }] }
 * El normalizador reconcilia ambas a una sola forma de render.
 *
 * REAL (web → Supabase con RLS `comoAlumno`): metadatos de la lección + config.
 * PENDIENTE DE API (se consume por contrato · §2/§3/§6):
 *   · URL firmada de reproducción → POST /media/videos/:id/reproducir (necesita
 *     `videotecaId`; el material seed con solo `ref` degrada a "media pendiente").
 *   · xAPI `experimentó`/`completó` → POST /xapi/statements (cola `envio-xapi` · §7).
 */

import type { CueTranscripcion, HitoVideo } from '@/components/bloques/contratos';
import type { LeccionContexto, LeccionVecina } from './leccion-contrato';

/** Config de una lección VIDEO ya normalizada, lista para render. */
export type ConfigVideoRender = {
  /** Id de la videoteca (mig 0017) — habilita la URL firmada de reproducción. */
  videotecaId: string | null;
  /**
   * URL DIRECTA del video (enlace pegado por el diseñador · §5C). Se reproduce tal cual,
   * sin firmar (Stream / CDN / origen externo). Alterna con `videotecaId` (subida).
   */
  urlDirecta: string | null;
  /** Referencia en object storage (para display/diagnóstico; el seed solo trae esto). */
  recursoRef: string | null;
  /** Duración en segundos (metadata del confirmado; opcional). */
  duracionSeg: number | null;
  /** Hitos de consulta rápida, ordenados por tiempo. */
  hitos: HitoVideo[];
  /** Cues de transcripción, ordenados por inicio. */
  transcripcion: CueTranscripcion[];
  /** Hay una fuente reproducible firmable (videotecaId presente). */
  reproducible: boolean;
};

/** Todo lo que la pantalla de lección VIDEO necesita. */
export type LeccionVideo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  contexto: LeccionContexto;
  video: ConfigVideoRender;
  anterior: LeccionVecina | null;
  siguiente: LeccionVecina | null;
  /** El alumno ya marcó la lección como vista (progreso local · reproduccion_progreso). */
  completada: boolean;
};

/* ─────────────────────────── Normalizador (puro) ─────────────────────────── */

function esCadena(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function esNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Normaliza los HITOS desde la config. Acepta la forma del editor (`hitos` con
 * `{ id, tiempo, titulo }`) o la del seed (`highlights` con `{ t, titulo }`).
 */
function normalizarHitos(config: Record<string, unknown>): HitoVideo[] {
  const salida: HitoVideo[] = [];

  const hitos = config.hitos;
  if (Array.isArray(hitos)) {
    hitos.forEach((h, i) => {
      if (!h || typeof h !== 'object') return;
      const o = h as Record<string, unknown>;
      if (!esNumero(o.tiempo)) return;
      salida.push({
        id: esCadena(o.id) ? o.id : `hito-${i}`,
        tiempo: o.tiempo,
        titulo: esCadena(o.titulo) ? o.titulo : `Hito ${i + 1}`,
        ...(esCadena(o.nota) ? { nota: o.nota } : {}),
      });
    });
  }

  // Forma legada/seed: highlights [{ t, titulo }]. Solo si no hubo `hitos`.
  const highlights = config.highlights;
  if (salida.length === 0 && Array.isArray(highlights)) {
    highlights.forEach((h, i) => {
      if (!h || typeof h !== 'object') return;
      const o = h as Record<string, unknown>;
      if (!esNumero(o.t)) return;
      salida.push({
        id: `hito-${i}`,
        tiempo: o.t,
        titulo: esCadena(o.titulo) ? o.titulo : `Hito ${i + 1}`,
      });
    });
  }

  return salida.sort((a, b) => a.tiempo - b.tiempo);
}

/**
 * Normaliza la TRANSCRIPCIÓN. Acepta cues sincronizados (`{ inicio, fin, texto }`,
 * del editor) o un texto plano (seed) que se expone como un único segmento en 0:00.
 */
function normalizarTranscripcion(
  config: Record<string, unknown>,
  duracionSeg: number | null,
): CueTranscripcion[] {
  const t = config.transcripcion;

  if (Array.isArray(t)) {
    const cues: CueTranscripcion[] = [];
    for (const c of t) {
      if (!c || typeof c !== 'object') continue;
      const o = c as Record<string, unknown>;
      if (!esNumero(o.inicio) || !esCadena(o.texto)) continue;
      cues.push({
        inicio: o.inicio,
        fin: esNumero(o.fin) ? o.fin : o.inicio,
        texto: o.texto,
        ...(esCadena(o.locutor) ? { locutor: o.locutor } : {}),
      });
    }
    return cues.sort((a, b) => a.inicio - b.inicio);
  }

  // Texto plano (seed / material legado): un único cue no sincronizado.
  if (esCadena(t)) {
    return [{ inicio: 0, fin: duracionSeg ?? 0, texto: t }];
  }

  return [];
}

/** Reconcilia el jsonb crudo de `lecciones.config` a la forma de render del video. */
export function normalizarConfigVideo(
  config: Record<string, unknown> | null | undefined,
): ConfigVideoRender {
  const c = config ?? {};
  const videotecaId = esCadena(c.videotecaId) ? c.videotecaId : null;
  // Enlace directo (el diseñador puede pegar una URL en vez de subir · §5C).
  const urlDirecta = esCadena(c.url) ? c.url : esCadena(c.enlace) ? c.enlace : null;
  // El editor guarda `recursoRef`; el seed guarda `ref`.
  const recursoRef = esCadena(c.recursoRef)
    ? c.recursoRef
    : esCadena(c.ref)
      ? c.ref
      : null;
  const duracionSeg = esNumero(c.duracionSeg) ? c.duracionSeg : null;

  return {
    videotecaId,
    urlDirecta,
    recursoRef,
    duracionSeg,
    hitos: normalizarHitos(c),
    transcripcion: normalizarTranscripcion(c, duracionSeg),
    // Reproducible por subida (videoteca, se firma) o por enlace directo.
    reproducible: videotecaId !== null || urlDirecta !== null,
  };
}
