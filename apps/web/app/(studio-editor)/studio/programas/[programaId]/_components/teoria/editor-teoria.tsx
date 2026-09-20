'use client';

/**
 * Editor de LECCIÓN tipo TEORÍA (§5C · mig 0023) — editor por BLOQUES estilo Gutenberg.
 *
 * El diseñador apila BLOQUES ordenables (texto, imagen, galería, video, HTML, link, PDF,
 * caso DICOM, H5P, xAPI) que viven como filas en `lxp.bloques`. Puede agregar, editar,
 * borrar y REORDENAR (arrastrar con dnd-kit · §3, o teclado ↑/↓ sobre el asa — accesible).
 *
 * Contrato: consume `EditorLeccionProps` (`@/lib/studio/leccion-tipos`) y persiste con las
 * server actions de bloques de teoría (CRUD directo web→Supabase bajo RLS · Regla de Oro
 * §2). `correr` (lo pasa el builder) envuelve cada acción y refresca el indicador
 * "guardado" del header — no se duplica el feedback.
 *
 * H5P y xAPI van como BLOQUE dentro de la teoría (un elemento más), reusando los
 * componentes de `components/bloques/` — no son tipos de lección propios.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Code,
  FileText,
  Image as ImageIcon,
  Images,
  Layers,
  Library,
  Link as LinkIcon,
  Package,
  Plus,
  ScanLine,
  SlidersHorizontal,
  Trash2,
  Type,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { EditorLeccionProps, BloqueTeoria } from '@/lib/studio/leccion-tipos';
import { kicker, softText, focusRing } from '@/lib/studio/estilos';
import {
  actualizarBloqueTeoria,
  crearBloqueTeoria,
  eliminarBloqueTeoria,
  reordenarBloquesTeoria,
} from '@/lib/studio/acciones';
import {
  INFO_BLOQUE_TEORIA,
  TIPOS_BLOQUE_TEORIA,
  comoTipoBloqueTeoria,
  configInicial,
  type FamiliaBloque,
  type TipoBloqueTeoria,
} from './tipos-bloque';
import { EditorBloque } from './editores-bloque';
import { SelectorRecurso, type InsercionBloque } from './selector-recurso';

/** Resuelve el nombre de ícono del registro (string) al componente Lucide. */
const ICONOS: Record<string, LucideIcon> = {
  Type,
  Image: ImageIcon,
  Images,
  Video,
  Code,
  Link: LinkIcon,
  FileText,
  ScanLine,
  SlidersHorizontal,
  Package,
};

const FAMILIAS: { familia: FamiliaBloque; rotulo: string }[] = [
  { familia: 'contenido', rotulo: 'Contenido' },
  { familia: 'multimedia', rotulo: 'Multimedia' },
  { familia: 'interactivo', rotulo: 'Interactivo' },
  { familia: 'clinico', rotulo: 'Clínico' },
];

/* ─────────────────────────────── Editor de teoría ─────────────────────────────── */

export function EditorTeoria({ programaId, leccionId, bloques, correr }: EditorLeccionProps) {
  // Orden local optimista (se reconcilia con el árbol del builder tras revalidar).
  const [ordenIds, setOrdenIds] = useState<string[]>(() => bloques.map((b) => b.id));
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  // Reconcilia cuando cambia el CONJUNTO de bloques (agregar/borrar): adopta el orden
  // del servidor. Un reorden puro no cambia el conjunto, así que no pisa el optimista.
  useEffect(() => {
    const propIds = bloques.map((b) => b.id);
    const mismoConjunto =
      propIds.length === ordenIds.length && propIds.every((id) => ordenIds.includes(id));
    if (!mismoConjunto) setOrdenIds(propIds);
  }, [bloques, ordenIds]);

  const porId = useMemo(() => new Map(bloques.map((b) => [b.id, b])), [bloques]);
  const ordenadas = useMemo(
    () => ordenIds.map((id) => porId.get(id)).filter((b): b is BloqueTeoria => Boolean(b)),
    [ordenIds, porId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function persistirOrden(ids: string[]) {
    correr(() => reordenarBloquesTeoria(programaId, leccionId, ids));
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ordenIds.indexOf(String(active.id));
    const to = ordenIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const nuevo = arrayMove(ordenIds, from, to);
    setOrdenIds(nuevo);
    persistirOrden(nuevo);
  }

  function mover(id: string, dir: 'arriba' | 'abajo') {
    const i = ordenIds.indexOf(id);
    const j = dir === 'arriba' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ordenIds.length) return;
    const nuevo = arrayMove(ordenIds, i, j);
    setOrdenIds(nuevo);
    persistirOrden(nuevo);
  }

  function agregar(tipo: TipoBloqueTeoria) {
    setMenuAbierto(false);
    correr(() => crearBloqueTeoria(programaId, leccionId, tipo, configInicial(tipo)));
  }

  function insertarRecurso({ tipoBloque, config }: InsercionBloque) {
    setSelectorAbierto(false);
    correr(() => crearBloqueTeoria(programaId, leccionId, tipoBloque, config));
  }

  return (
    // Ancho acotado al contenedor de la plataforma (§5A · máx 1240px centrado): los
    // bloques NO se estiran con la ventana, quedan a la medida del resto del campus.
    <div className="mx-auto grid w-full max-w-[1240px] gap-4">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
          <Layers className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div>
          <p className={`${kicker} text-muted-foreground`}>Contenido de la lección</p>
          <p className="text-[13px] font-semibold">
            {ordenadas.length} bloque{ordenadas.length === 1 ? '' : 's'} · arrástralos para reordenar
          </p>
        </div>
      </div>

      {ordenadas.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card py-12 text-center">
          <Layers aria-hidden className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-[13.5px] font-bold">Lección vacía</p>
          <p className={`max-w-[42ch] text-[12.5px] leading-relaxed ${softText}`}>
            Agrega el primer bloque para empezar a construir la teoría: texto, imagen, video, un caso del Banco…
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ordenIds} strategy={verticalListSortingStrategy}>
            <div className="grid gap-3">
              {ordenadas.map((b, i) => (
                <BloqueItem
                  key={b.id}
                  programaId={programaId}
                  bloque={b}
                  indice={i}
                  total={ordenadas.length}
                  correr={correr}
                  onMover={mover}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Barra de acciones: agregar bloque (menú de sub-tipos) + insertar un recurso
          que YA existe (Biblioteca de Contenido / Banco de Casos).
          STICKY al pie del lienzo: con muchos bloques el botón "Agregar bloque"
          SIEMPRE queda a la vista y alcanzable (patrón Gutenberg/Notion). */}
      <div className="sticky bottom-0 z-10 -mb-6 mt-1 flex flex-wrap items-center gap-2.5 border-t border-border bg-background/95 py-3 backdrop-blur-sm">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.4} />
            Agregar bloque
          </button>

          {menuAbierto && <MenuTipos onCerrar={() => setMenuAbierto(false)} onElegir={agregar} />}
        </div>

        <button
          type="button"
          onClick={() => setSelectorAbierto(true)}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-bold text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <Library aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Insertar recurso
        </button>
      </div>

      {selectorAbierto && (
        <SelectorRecurso onCerrar={() => setSelectorAbierto(false)} onInsertar={insertarRecurso} />
      )}
    </div>
  );
}

/* ─────────────────────────── Menú "Agregar bloque" ─────────────────────────── */

function MenuTipos({
  onCerrar,
  onElegir,
}: {
  onCerrar: () => void;
  onElegir: (tipo: TipoBloqueTeoria) => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <>
      {/* velo para cerrar al hacer clic fuera */}
      <button type="button" aria-label="Cerrar menú" onClick={onCerrar} className="fixed inset-0 z-10 cursor-default" />
      <div className="absolute bottom-full left-0 z-20 mb-2 w-[min(520px,86vw)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <p className={`${kicker} text-secondary`}>Elige un tipo de bloque</p>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`ml-auto grid h-7 w-7 place-items-center rounded-[8px] text-muted-foreground hover:bg-muted ${focusRing}`}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {FAMILIAS.map(({ familia, rotulo }) => {
            const tipos = TIPOS_BLOQUE_TEORIA.filter((t) => INFO_BLOQUE_TEORIA[t].familia === familia);
            if (tipos.length === 0) return null;
            return (
              <div key={familia} className="mb-2 last:mb-0">
                <p className={`${kicker} px-1 pb-1.5 text-muted-foreground`}>{rotulo}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tipos.map((t) => {
                    const info = INFO_BLOQUE_TEORIA[t];
                    const Icono = ICONOS[info.icono] ?? Type;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onElegir(t)}
                        className={`flex items-start gap-2.5 rounded-[11px] border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                      >
                        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
                          <Icono className="h-[17px] w-[17px]" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-bold leading-snug">{info.rotulo}</span>
                          <span className={`mt-0.5 block text-[11px] leading-relaxed ${softText}`}>{info.descripcion}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── Un bloque (sortable + editor) ─────────────────────────── */

/** Compara dos config por su JSON (suficiente para detectar cambios sin librería). */
function igual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function BloqueItem({
  programaId,
  bloque,
  indice,
  total,
  correr,
  onMover,
}: {
  programaId: string;
  bloque: BloqueTeoria;
  indice: number;
  total: number;
  correr: (accion: () => Promise<void>) => void;
  onMover: (id: string, dir: 'arriba' | 'abajo') => void;
}) {
  const tipo = comoTipoBloqueTeoria(bloque.tipoBloque);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bloque.id,
  });

  // Plegado local: permite contraer el cuerpo del bloque para navegar cómodo con
  // muchos bloques (el chevron del encabezado lo alterna).
  const [plegado, setPlegado] = useState(false);

  // Borrador local: el editor es controlado y guarda con un botón cuando hay cambios.
  const [draft, setDraft] = useState<Record<string, unknown>>(bloque.config);
  const [guardado, setGuardado] = useState<Record<string, unknown>>(bloque.config);

  // Si el config llega distinto desde el servidor (otra sesión / revalidación) y no hay
  // edición local pendiente, adopta el nuevo valor.
  useEffect(() => {
    if (!igual(bloque.config, guardado) && igual(draft, guardado)) {
      setDraft(bloque.config);
      setGuardado(bloque.config);
    }
    // Reacciona solo al `config` entrante del servidor; `draft`/`guardado` son locales.
  }, [bloque.config]);

  const sucio = !igual(draft, guardado);

  function guardar() {
    const aGuardar = draft;
    setGuardado(aGuardar);
    correr(() => actualizarBloqueTeoria(programaId, bloque.id, aGuardar));
  }

  const estilo = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };

  if (!tipo) {
    // tipo_bloque desconocido (dato viejo / futuro): no lo edita, pero deja borrarlo.
    return (
      <div ref={setNodeRef} style={estilo} className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-muted-foreground">
            Bloque no reconocido: <span className="font-mono">{bloque.tipoBloque}</span>
          </p>
          <button
            type="button"
            onClick={() => correr(() => eliminarBloqueTeoria(programaId, bloque.id))}
            aria-label="Borrar bloque"
            className={`ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:text-destructive ${focusRing}`}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    );
  }

  const info = INFO_BLOQUE_TEORIA[tipo];
  const Icono = ICONOS[info.icono] ?? Type;

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      className={`overflow-hidden rounded-xl border bg-card ${
        isDragging ? 'border-primary shadow-2xl' : 'border-border shadow-rest'
      }`}
    >
      {/* Cabecera del bloque: asa (drag + ↑/↓), tipo, guardar, borrar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Mover bloque ${info.rotulo} — arrastra o usa ↑ ↓`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              onMover(bloque.id, 'arriba');
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              onMover(bloque.id, 'abajo');
            }
          }}
          className={`shrink-0 cursor-grab touch-none text-[color:var(--track)] hover:text-muted-foreground active:cursor-grabbing ${focusRing}`}
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
            {[6, 12, 18].map((cy) => (
              <g key={cy}>
                <circle cx="9" cy={cy} r="1.5" />
                <circle cx="15" cy={cy} r="1.5" />
              </g>
            ))}
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setPlegado((v) => !v)}
          aria-expanded={!plegado}
          aria-label={plegado ? `Desplegar bloque ${info.rotulo}` : `Plegar bloque ${info.rotulo}`}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
        >
          <ChevronDown
            aria-hidden
            className={`h-[15px] w-[15px] transition-transform ${plegado ? '-rotate-90' : ''}`}
            strokeWidth={2}
          />
        </button>
        <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-accent text-accent-foreground">
          <Icono className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </span>
        <span className="text-[12.5px] font-bold">{info.rotulo}</span>
        <span className="text-[11px] text-muted-foreground">
          {indice + 1} / {total}
        </span>

        {sucio && (
          <button
            type="button"
            onClick={guardar}
            className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[12px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            Guardar bloque
          </button>
        )}
        <button
          type="button"
          onClick={() => correr(() => eliminarBloqueTeoria(programaId, bloque.id))}
          aria-label={`Borrar bloque ${info.rotulo}`}
          className={`${sucio ? '' : 'ml-auto'} grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
        >
          <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Cuerpo: editor del sub-tipo (controlado). Se oculta al plegar el bloque. */}
      {!plegado && (
        <div className="p-3.5">
          <EditorBloque tipo={tipo} config={draft} onCambio={setDraft} />
        </div>
      )}
    </div>
  );
}
