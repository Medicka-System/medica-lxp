'use client';

/**
 * Registro de EDITORES POR TIPO de lección (§5C · mig 0023).
 *
 * El builder detecta `leccion.tipo` y renderiza aquí el editor de ese tipo. Los 7 tipos
 * tienen editor real; persisten con server actions (CRUD directo web→Supabase bajo RLS · §2):
 *   · tipos `config`  → escriben `lecciones.config`;
 *   · tipo  `teoria`  → escribe `lxp.bloques` (ordenable).
 */

import type { ComponentType } from 'react';
import {
  BookOpen,
  CheckCircle2,
  FileCheck2,
  MessageSquare,
  Package,
  SlidersHorizontal,
  Video,
  type LucideIcon,
} from 'lucide-react';
import {
  type EditorLeccionProps,
  type TipoLeccion,
} from '@/lib/studio/leccion-tipos';
import { EditorTeoria } from './teoria/editor-teoria';
import { EditorVideo } from './_editores/editor-video';
import { EditorH5P } from './_editores/editor-h5p';
import { EditorXapi } from './_editores/editor-xapi';
import { EditorAutoevaluacion } from './editor-autoevaluacion';
import { EditorTarea } from './editor-tarea';
import { EditorForo } from './editor-foro';

/** Ícono + acento por tipo (selector de tipo y placeholders · §5A). */
export const VISUAL_TIPO: Record<TipoLeccion, { icono: LucideIcon; clase: string }> = {
  teoria: { icono: BookOpen, clase: 'bg-accent text-accent-foreground' },
  video: { icono: Video, clase: 'bg-accent text-accent-foreground' },
  autoevaluacion: {
    icono: CheckCircle2,
    clase: 'bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
  },
  tarea: {
    icono: FileCheck2,
    clase: 'bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  },
  foro: { icono: MessageSquare, clase: 'bg-sidebar text-sidebar-foreground' },
  h5p: { icono: SlidersHorizontal, clase: 'bg-accent text-accent-foreground' },
  xapi: { icono: Package, clase: 'bg-accent text-accent-foreground' },
};

/**
 * tipo → componente de editor. Los 7 tipos ya tienen editor real (§5C):
 * teoria (bloques), video/h5p/xapi (config), autoevaluacion/tarea (config), foro.
 */
export const EDITORES_LECCION: Record<TipoLeccion, ComponentType<EditorLeccionProps>> = {
  teoria: EditorTeoria,
  video: EditorVideo,
  autoevaluacion: EditorAutoevaluacion,
  tarea: EditorTarea,
  foro: EditorForo,
  h5p: EditorH5P,
  xapi: EditorXapi,
};

/** Renderiza el editor registrado para el tipo de la lección. */
export function EditorDeLeccion(props: EditorLeccionProps) {
  const Editor = EDITORES_LECCION[props.tipo];
  // Encuadre COMÚN a los 7 tipos (§5A · máx 1240px centrado): el dispatcher cap+centra
  // una sola vez, así video/h5p/xapi/autoeval/tarea/foro igualan a teoría (que ya no lo
  // hace por su cuenta). Punto único: homologa el ancho sin tocar cada editor.
  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <Editor {...props} />
    </div>
  );
}
