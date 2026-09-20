'use client';

/**
 * Registro de EDITORES POR TIPO de lección (§5C · mig 0023) + placeholders.
 *
 * El builder detecta `leccion.tipo` y renderiza aquí el editor de ese tipo. Hoy
 * TODOS apuntan al placeholder ("Editor de … — próximamente"): esta rama construye
 * SOLO el modelo + el enrutamiento por tipo, no los editores.
 *
 * CÓMO ENCHUFA UN AGENTE SU EDITOR (sin tocar el modelo):
 *   1. Crea el componente del editor; su firma es `EditorLeccionProps` (contrato en
 *      `@/lib/studio/leccion-tipos`).
 *   2. Reemplaza la entrada de su tipo en `EDITORES_LECCION` por ese componente.
 *   3. Persiste con server actions (CRUD directo web→Supabase bajo RLS · §2):
 *      · tipos `config`  → escriben `lecciones.config`;
 *      · tipo  `teoria`  → escribe `lxp.bloques` (ordenable).
 * No hace falta cambiar el builder ni el esquema.
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
  INFO_TIPO_LECCION,
  type EditorLeccionProps,
  type TipoLeccion,
} from '@/lib/studio/leccion-tipos';
import { kicker, softText } from '@/lib/studio/estilos';
import { EditorTarea } from './editor-tarea';

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
 * Placeholder del editor de un tipo: punto de entrada claro mientras el agente
 * correspondiente construye el editor real. Muestra el tipo, su descripción y —para
 * orientar al siguiente agente— DÓNDE persiste su contenido.
 */
function PlaceholderEditor({ tipo, config, bloques }: EditorLeccionProps) {
  const info = INFO_TIPO_LECCION[tipo];
  const { icono: Icono, clase } = VISUAL_TIPO[tipo];
  const almacen =
    info.almacen === 'bloques'
      ? `Su contenido vivirá en bloques ordenables (lxp.bloques) · ${bloques.length} bloque(s) hoy.`
      : `Su contenido vivirá en la config de la lección (lecciones.config) · ${
          Object.keys(config).length ? 'con datos.' : 'vacía por ahora.'
        }`;

  return (
    <div className="rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card p-6">
      <div className="flex items-start gap-3.5">
        <span aria-hidden className={`grid h-11 w-11 shrink-0 place-items-center rounded-[12px] ${clase}`}>
          <Icono className="h-[21px] w-[21px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className={`${kicker} text-muted-foreground`}>Lección tipo {info.rotulo}</p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.01em]">
            Editor de {info.rotulo} — próximamente
          </h2>
          <p className={`mt-1.5 max-w-[52ch] text-[13px] leading-relaxed ${softText}`}>
            {info.descripcion}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-3.5">
        <p className="text-[11.5px] font-bold text-[color:var(--info-foreground)]">
          Pendiente de editor
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
          {almacen} El editor se enchufa en <span className="font-semibold">EDITORES_LECCION</span>{' '}
          (contrato <span className="font-semibold">EditorLeccionProps</span>) sin tocar el modelo.
        </p>
      </div>
    </div>
  );
}

/**
 * tipo → componente de editor. Cada agente reemplaza SU entrada por su editor real.
 * Hoy todas apuntan al placeholder (esta rama es solo el modelo + el flujo).
 */
export const EDITORES_LECCION: Record<TipoLeccion, ComponentType<EditorLeccionProps>> = {
  teoria: PlaceholderEditor,
  video: PlaceholderEditor,
  autoevaluacion: PlaceholderEditor,
  tarea: EditorTarea,
  foro: PlaceholderEditor,
  h5p: PlaceholderEditor,
  xapi: PlaceholderEditor,
};

/** Renderiza el editor registrado para el tipo de la lección (placeholder por defecto). */
export function EditorDeLeccion(props: EditorLeccionProps) {
  const Editor = EDITORES_LECCION[props.tipo] ?? PlaceholderEditor;
  return <Editor {...props} />;
}
