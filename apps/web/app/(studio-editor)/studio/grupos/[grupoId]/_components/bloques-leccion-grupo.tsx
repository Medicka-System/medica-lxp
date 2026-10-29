'use client';

/**
 * Vista por-BLOQUE de una lección de TEORÍA en el contexto del grupo (copy-on-write · Paso 4).
 *
 * Lista los bloques de la lección (heredados + propios, con el heredado suprimido donde una copia
 * lo reemplaza). Editar un bloque HEREDADO lo independiza (copia a fila propia con `reemplaza_a`)
 * y monta el editor inline SOBRE la copia — solo ese bloque se vuelve propio; el resto de la lección
 * sigue heredando y el `leccion_id` NO cambia (progreso intacto). "Volver a heredar" borra la copia.
 *
 * Reusa `EditorBloque` (agnóstico, config-in/out) y persiste con `actualizarBloqueTeoria` (se llavea
 * por bloqueId → escribe la copia del grupo). CRUD directo web→Supabase bajo RLS (Regla de Oro §2).
 */

import { useEffect, useState, useTransition } from 'react';
import {
  Code,
  FileText,
  Image as ImageIcon,
  Images,
  Layers,
  Link as LinkIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  SlidersHorizontal,
  Trash2,
  Type,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { kicker, softText, focusRing } from '@/lib/studio/estilos';
import {
  cargarBloquesLeccionGrupo,
  independizarBloqueGrupo,
  volverAHeredarBloque,
  agregarBloqueGrupo,
  eliminarBloqueGrupo,
  actualizarBloqueTeoria,
} from '@/lib/studio/acciones';
import type { BloquesLeccionGrupo } from '@/lib/studio/datos';
import { EditorBloque } from '@/app/(studio-editor)/studio/programas/[programaId]/_components/teoria/editores-bloque';
import { SelectorTipoBloque } from '@/app/(studio-editor)/studio/programas/[programaId]/_components/teoria/selector-tipo-bloque';
import {
  comoTipoBloqueTeoria,
  INFO_BLOQUE_TEORIA,
  type TipoBloqueTeoria,
} from '@/app/(studio-editor)/studio/programas/[programaId]/_components/teoria/tipos-bloque';

/** Nombre de ícono (registro de tipos) → componente Lucide (igual que el editor de teoría). */
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
function iconoDeBloque(tipoBloque: string): LucideIcon {
  const tb = comoTipoBloqueTeoria(tipoBloque);
  return (tb && ICONOS[INFO_BLOQUE_TEORIA[tb].icono]) || Type;
}

/** Etiqueta legible de un bloque (rótulo del tipo + breve resumen del texto si es teoría). */
function resumenBloque(tipoBloque: string, config: Record<string, unknown>): string {
  const tb = comoTipoBloqueTeoria(tipoBloque);
  const rotulo = tb ? INFO_BLOQUE_TEORIA[tb].rotulo : tipoBloque;
  if (tb === 'texto' && typeof config.html === 'string') {
    const texto = config.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (texto) return `${rotulo} · ${texto.slice(0, 60)}${texto.length > 60 ? '…' : ''}`;
  }
  return rotulo;
}

type BloqueItem = BloquesLeccionGrupo['bloques'][number];

export function BloquesLeccionGrupoPanel({
  grupoId,
  leccionId,
  titulo,
  onCerrar,
}: {
  grupoId: string;
  leccionId: string;
  titulo: string;
  onCerrar: () => void;
}) {
  const [data, setData] = useState<BloquesLeccionGrupo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  const recargar = () =>
    cargarBloquesLeccionGrupo(grupoId, leccionId)
      .then((d) => setData(d))
      .catch(() => setError('No se pudieron cargar los bloques.'))
      .finally(() => setCargando(false));
  useEffect(() => {
    void recargar();
  }, [grupoId, leccionId]);

  function editarBloque(b: BloqueItem) {
    setError(null);
    start(async () => {
      let destino = b.id;
      if (!b.esPropio) {
        const r = await independizarBloqueGrupo(grupoId, b.id);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        destino = r.bloqueId;
      }
      await recargar();
      setEditando(destino);
    });
  }

  function volver(b: BloqueItem) {
    setError(null);
    setConfirmar(null);
    start(async () => {
      const r = await volverAHeredarBloque(grupoId, b.id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (editando === b.id) setEditando(null);
      await recargar();
    });
  }

  function guardarBloque(bloqueId: string, config: Record<string, unknown>) {
    if (!data) return;
    setError(null);
    start(async () => {
      await actualizarBloqueTeoria(data.programaId, bloqueId, config);
      await recargar();
    });
  }

  // "+Agregar" (Paso 5): bloque NUEVO propio del grupo (aditivo, sin reemplaza_a). Funciona
  // también sobre una lección HEREDADA — la acción fija grupo_id explícito.
  const [agregando, setAgregando] = useState(false);
  function agregar(tipo: TipoBloqueTeoria) {
    setAgregando(false);
    setError(null);
    start(async () => {
      const r = await agregarBloqueGrupo(grupoId, leccionId, tipo);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      await recargar();
      setEditando(r.bloqueId);
    });
  }
  function eliminar(b: BloqueItem) {
    setError(null);
    setConfirmar(null);
    start(async () => {
      await eliminarBloqueGrupo(grupoId, b.id);
      if (editando === b.id) setEditando(null);
      await recargar();
    });
  }

  return (
    <div className="border-t border-border px-3 pb-3.5 pt-2.5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <span className={`${kicker} text-secondary`}>
          Bloques de «{titulo}» · edita uno sin forkear la lección (el resto sigue heredando)
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
        >
          <X aria-hidden className="h-[13px] w-[13px]" strokeWidth={2} /> Cerrar
        </button>
      </div>

      {error && (
        <div className="mb-2.5 rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[12px] font-medium text-[color:var(--destructive-foreground)]">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="grid place-items-center gap-2 py-8 text-center">
          <Loader2 aria-hidden className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.75} />
          <p className={`text-[12px] ${softText}`}>Cargando los bloques…</p>
        </div>
      ) : !data || data.bloques.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-[10px] border border-dashed border-[color:var(--track)] bg-card py-8 text-center">
          <Layers aria-hidden className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          <p className={`text-[12.5px] ${softText}`}>Esta lección de teoría no tiene bloques.</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {data.bloques.map((b) => {
            const tb = comoTipoBloqueTeoria(b.tipoBloque);
            const abierto = editando === b.id;
            const Icono = iconoDeBloque(b.tipoBloque);
            // 3 estados: heredado · editado (reemplaza a uno heredado) · agregado (propio nuevo).
            const agregado = b.esPropio && !b.editada;
            return (
              <li key={b.id} className="rounded-[11px] border border-border bg-card">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-accent text-accent-foreground">
                    <Icono className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed">
                    {resumenBloque(b.tipoBloque, b.config)}
                  </span>
                  {b.editada ? (
                    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11px] font-bold text-[color:var(--info-foreground)]">
                      <Pencil aria-hidden className="h-3 w-3" strokeWidth={2} /> Editado para este grupo
                    </span>
                  ) : agregado ? (
                    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11px] font-bold text-[color:var(--info-foreground)]">
                      <Plus aria-hidden className="h-3 w-3" strokeWidth={2.4} /> Agregado por el grupo
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => editarBloque(b)}
                    disabled={pendiente || !tb}
                    aria-expanded={abierto}
                    className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-bold transition-colors disabled:opacity-60 ${focusRing} ${
                      abierto
                        ? 'bg-[color:var(--info)] text-white'
                        : 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
                    }`}
                  >
                    <Pencil aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.9} />
                    {abierto ? 'Editando…' : 'Editar'}
                  </button>
                  {/* editado → "Volver a heredar" (borra la copia); agregado → "Eliminar" (borra el
                      bloque propio). Ambos piden confirmación inline. Heredado puro: sin acción extra. */}
                  {(b.editada || agregado) &&
                    (confirmar === b.id ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => (b.editada ? volver(b) : eliminar(b))}
                          disabled={pendiente}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 text-[11.5px] font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60 ${focusRing}`}
                        >
                          {b.editada ? (
                            <>
                              <RefreshCw aria-hidden className="h-[13px] w-[13px]" strokeWidth={2} /> Descartar
                            </>
                          ) : (
                            <>
                              <Trash2 aria-hidden className="h-[13px] w-[13px]" strokeWidth={2} /> Eliminar
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmar(null)}
                          className={`h-8 shrink-0 rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
                        >
                          No
                        </button>
                      </span>
                    ) : b.editada ? (
                      <button
                        type="button"
                        onClick={() => setConfirmar(b.id)}
                        disabled={pendiente}
                        title="Descartar la copia de este bloque y volver a heredar del programa."
                        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-secondary transition-colors hover:bg-accent disabled:opacity-60 ${focusRing}`}
                      >
                        <RefreshCw aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.9} /> Volver a heredar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmar(b.id)}
                        disabled={pendiente}
                        aria-label="Eliminar bloque del grupo"
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60 ${focusRing}`}
                      >
                        <Trash2 aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      </button>
                    ))}
                </div>

                {abierto && tb && (
                  <div className="border-t border-border p-3.5">
                    <EditorBloqueInline
                      key={b.id}
                      bloque={b}
                      leccionId={leccionId}
                      guardando={pendiente}
                      onGuardar={(config) => guardarBloque(b.id, config)}
                      onCerrar={() => setEditando(null)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* +Agregar: bloque NUEVO propio del grupo (aditivo), también sobre una lección HEREDADA.
          Abre el MISMO selector modal que el builder de Programas (sin cortarse). */}
      {!cargando && (
        <button
          type="button"
          onClick={() => setAgregando(true)}
          disabled={pendiente}
          aria-haspopup="dialog"
          aria-expanded={agregando}
          className={`mt-2.5 inline-flex h-9 items-center gap-2 rounded-[10px] border border-dashed border-[color:var(--track)] bg-card px-4 text-[12.5px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent disabled:opacity-60 ${focusRing}`}
        >
          <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} /> Agregar bloque del grupo
        </button>
      )}

      {agregando && <SelectorTipoBloque onElegir={agregar} onCerrar={() => setAgregando(false)} />}
    </div>
  );
}

/* ── Editor inline de UN bloque (draft local + guardar) ── */
function EditorBloqueInline({
  bloque,
  leccionId,
  guardando,
  onGuardar,
  onCerrar,
}: {
  bloque: BloqueItem;
  leccionId: string;
  guardando: boolean;
  onGuardar: (config: Record<string, unknown>) => void;
  onCerrar: () => void;
}) {
  const tb = comoTipoBloqueTeoria(bloque.tipoBloque);
  const [draft, setDraft] = useState<Record<string, unknown>>(bloque.config);
  const sucio = JSON.stringify(draft) !== JSON.stringify(bloque.config);
  if (!tb) return null;
  return (
    <div className="grid gap-3">
      <EditorBloque tipo={tb} config={draft} onCambio={setDraft} leccionId={leccionId} />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCerrar}
          className={`h-9 rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={() => onGuardar(draft)}
          disabled={!sucio || guardando}
          className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-primary px-4 text-[12px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          Guardar bloque
        </button>
      </div>
    </div>
  );
}
