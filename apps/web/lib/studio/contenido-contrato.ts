/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Biblioteca de Contenido reutilizable (§5B/§5C) — CONTRATO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El acervo: un recurso se sube UNA vez y N lecciones lo REFERENCIAN (no lo copian),
 * con "dónde se usa" real y versionado del archivo. Ya construido:
 *
 * ── DB (mig 0041 · lxp.recursos) ──
 *   tipo (enum recurso_tipo: video|h5p|scorm|xapi|pdf|word|ppt|imagen), nombre,
 *   storage_key, meta jsonb, reproduccion, etiquetas text[], version, procesando,
 *   progreso, created_by. RLS: select authenticated · write lxp.es_autoria().
 *   "Dónde se usa" = lecciones que referencian el recurso desde
 *   `lxp.bloques.config->>'recursoId'` (el "Insertar recurso" del constructor de
 *   teoría · selector-recurso.tsx). El conteo lo calcula el reader (datos.ts).
 *
 * ── Subida/ingesta (dominio · apps/api; el binario nunca pasa por el api · §2) ──
 *   video   → /media/videos/solicitar (leccionId opcional) + PUT firmado + confirmar
 *   imagen  → /media/imagenes/firmar-subida + PUT firmado
 *   pdf/word/ppt → /media/archivos/firmar-subida + PUT firmado
 *   scorm/xapi   → /paquetes (sin leccionId: valida manifiesto + guarda .zip)
 *   h5p     → /h5p/paquete (uploadPackage + saveOrUpdateContent)
 *
 * ── Fila lxp.recursos (CRUD directo web→Supabase bajo RLS · §2) ──
 *   contenido-acciones.ts: crearRecurso / actualizarRecurso /
 *   reemplazarArchivoRecurso (version+1) / eliminarRecurso (bloquea si usos>0).
 *
 * `getRecursos`/`getRecursoDetalle` degradan con `pendienteDb: true` solo si la BD no
 * responde (defensivo); en operación normal la tabla existe y se poblan con datos reales.
 */

export type TipoRecurso = 'video' | 'h5p' | 'scorm' | 'xapi' | 'pdf' | 'word' | 'ppt' | 'imagen';

/** Los tres ofimáticos se filtran juntos como "Documentos". */
export type FamiliaFiltro = 'todos' | 'video' | 'h5p' | 'scorm' | 'xapi' | 'documentos' | 'imagen';

export const ES_DOCUMENTO: TipoRecurso[] = ['pdf', 'word', 'ppt'];

export type Recurso = {
  id: string;
  tipo: TipoRecurso;
  nombre: string;
  meta: string;
  peso?: string;
  reproduccion?: string;
  fecha: Date;
  usos: number;
  programas: number;
  etiquetas: string[];
  procesando?: boolean;
  progreso?: number;
};

export type UsoRecurso = {
  id: string;
  programa: string;
  version: number;
  ruta: string;
  estadoLeccion: 'publicada' | 'borrador';
};

export type VersionArchivo = { id: string; etiqueta: string; nota: string; fecha: Date; actual?: boolean };

export type RecursoDetalle = {
  id: string;
  tipo: TipoRecurso;
  nombre: string;
  reproduccion?: string;
  duracion?: string;
  metadatos: { etiqueta: string; valor: string }[];
  etiquetas: string[];
  usos: UsoRecurso[];
  versiones: VersionArchivo[];
};
