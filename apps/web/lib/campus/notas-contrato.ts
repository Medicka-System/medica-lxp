/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Notas del alumno en la lección (§5A · mock leccion-lectura). REAL: CRUD directo
 * web→Supabase bajo RLS (mig 0027) — es dato del alumno, no dominio (Regla de Oro §2).
 * El alumno solo ve/edita SUS notas (policy notas_* · alumno_id = auth.uid()).
 * ══════════════════════════════════════════════════════════════════════════════
 */

export type NotaTipo =
  | 'texto_seleccionado'
  | 'nota_libre'
  | 'subrayado'
  | 'marcador_video';

/** Ancla de una nota anclada al TEXTO (subrayado / fragmento guardado). */
export type AnclaTexto = {
  /** id del bloque de teoría (lxp.bloques) que contiene el rango. */
  bloqueId: string;
  /** Offsets de carácter sobre el textContent del bloque. */
  inicio: number;
  fin: number;
  /** Snapshot del texto anclado (para re-localizar y validar al re-aplicar). */
  texto: string;
};

/** Ancla de una nota anclada a un MOMENTO del video. */
export type AnclaVideo = { segundos: number };

export type AnclaNota = AnclaTexto | AnclaVideo | Record<string, never>;

export type Nota = {
  id: string;
  tipo: NotaTipo;
  contenido: string;
  ancla: AnclaNota;
  creadoEn: string;
};

/** Type guards defensivos sobre el jsonb de ancla. */
export function esAnclaTexto(a: AnclaNota): a is AnclaTexto {
  return (
    typeof (a as AnclaTexto).bloqueId === 'string' &&
    typeof (a as AnclaTexto).inicio === 'number' &&
    typeof (a as AnclaTexto).fin === 'number'
  );
}

export function esAnclaVideo(a: AnclaNota): a is AnclaVideo {
  return typeof (a as AnclaVideo).segundos === 'number';
}

/** Datos para crear una nota (el alumno_id lo pone la acción desde la sesión). */
export type NuevaNota = {
  leccionId: string;
  moduloId?: string | null;
  tipo: NotaTipo;
  contenido: string;
  ancla?: AnclaNota;
};
