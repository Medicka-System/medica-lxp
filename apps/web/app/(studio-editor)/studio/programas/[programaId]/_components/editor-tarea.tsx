'use client';

/**
 * Editor de lección tipo `tarea` (§5C). El diseñador escribe las instrucciones,
 * SELECCIONA una rúbrica del catálogo reutilizable (familia `tareas`, NO inline) y
 * fija el valor y el formato de entrega. Todo se guarda en `lecciones.config`
 * (CRUD directo web→Supabase bajo RLS · §2) vía `guardarTarea`. La rúbrica se elige
 * de `lxp.rubricas` — se lista directo web→Supabase; el `api` solo la escribe.
 *
 * Se engancha en `EDITORES_LECCION` con la firma `EditorLeccionProps`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClipboardList,
  FileCheck2,
  Info,
  Link2,
  ListChecks,
  Loader2,
  Scale,
  Search,
  X,
} from 'lucide-react';
import { EditorRico } from '@/components/editor-rico';
import { kicker, softText, focusRing } from '@/lib/studio/estilos';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import {
  comoTareaConfig,
  ENTREGA_ROTULO,
  type RubricaCatalogo,
  type TareaConfig,
} from '@/lib/studio/tarea-contrato';
import { guardarTarea, leerCatalogoRubricas } from '@/lib/studio/tarea-acciones';

export function EditorTarea({ programaId, leccionId, config, correr }: EditorLeccionProps) {
  const [tarea, setTarea] = useState<TareaConfig>(() => comoTareaConfig(config));
  const [picker, setPicker] = useState(false);
  const [catalogo, setCatalogo] = useState<RubricaCatalogo[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tareaRef = useRef(tarea);

  // Reseeding SOLO al cambiar de lección (el estado local manda mientras se edita).
  const leccionRef = useRef(leccionId);
  useEffect(() => {
    if (leccionRef.current !== leccionId) {
      leccionRef.current = leccionId;
      const fresco = comoTareaConfig(config);
      tareaRef.current = fresco;
      setTarea(fresco);
    }
  }, [leccionId, config]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const persistir = useCallback(
    (siguiente: TareaConfig) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        correr(() => guardarTarea(programaId, leccionId, siguiente));
      }, 800);
    },
    [correr, programaId, leccionId],
  );

  function actualizar(parche: Partial<TareaConfig>) {
    const siguiente = { ...tareaRef.current, ...parche };
    tareaRef.current = siguiente;
    setTarea(siguiente);
    persistir(siguiente);
  }

  function abrirPicker() {
    setPicker(true);
    if (catalogo === null) {
      leerCatalogoRubricas()
        .then(setCatalogo)
        .catch((e) => {
          console.error('[EditorTarea] no se pudo leer el catálogo de rúbricas:', e);
          setCatalogo([]);
        });
    }
  }

  const rubricaSel = catalogo?.find((r) => r.id === tarea.rubricaId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Encabezado del tipo ── */}
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
        >
          <FileCheck2 className="h-[21px] w-[21px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className={`${kicker} text-muted-foreground`}>Lección tipo Tarea</p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.01em]">Entrega evaluada</h2>
          <p className={`mt-1 max-w-[56ch] text-[13px] leading-relaxed ${softText}`}>
            Escribe los lineamientos, elige una rúbrica del catálogo y fija el valor. El alumno la
            entrega desde el Campus; el docente la evalúa con la rúbrica (Eco asiste · §7A).
          </p>
        </div>
      </div>

      {/* ── Lineamientos ── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList aria-hidden className="h-4 w-4 text-secondary" strokeWidth={1.75} />
          <h3 className="text-[13.5px] font-bold">Lineamientos de la entrega</h3>
        </div>
        <EditorRico
          contenidoInicial={tarea.lineamientos ?? ''}
          onChange={(html) => actualizar({ lineamientos: html })}
          minAlto={220}
          placeholder="Describe qué debe entregar el alumno, el alcance, los criterios de forma y la fecha límite. Puedes importar un .docx desde la barra."
          ariaLabel="Lineamientos de la tarea"
        />
      </section>

      {/* ── Rúbrica + valor + entrega ── */}
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {/* Rúbrica del catálogo */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ListChecks aria-hidden className="h-4 w-4 text-secondary" strokeWidth={1.75} />
            <h3 className="text-[13.5px] font-bold">Rúbrica de evaluación</h3>
            <span className="ml-auto text-[11px] font-medium text-muted-foreground">Catálogo reutilizable</span>
          </div>

          {rubricaSel || (tarea.rubricaId && catalogo === null) ? (
            <div className="flex items-start gap-3 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-3.5">
              <ListChecks
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]"
                strokeWidth={1.75}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[color:var(--info-foreground)]">
                  {rubricaSel ? rubricaSel.nombre : 'Rúbrica seleccionada'}
                </p>
                {rubricaSel && (
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
                    {rubricaSel.criterios.length} criterio(s)
                    {rubricaSel.publicado ? ' · publicada' : ' · borrador'}
                    {rubricaSel.descripcion ? ` · ${rubricaSel.descripcion}` : ''}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={abrirPicker}
                className={`shrink-0 rounded-[8px] border border-[color:var(--info-border)] bg-card px-2.5 py-1 text-[11.5px] font-semibold text-[color:var(--info-foreground)] hover:bg-white ${focusRing}`}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={abrirPicker}
              className={`flex w-full items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-dashed border-[color:var(--track)] bg-muted px-4 py-5 text-[13px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
            >
              <Link2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Seleccionar rúbrica del catálogo
            </button>
          )}

          <p className={`mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed ${softText}`}>
            <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            La rúbrica se define aparte y se reutiliza entre tareas. Aquí solo se selecciona (§5C).
          </p>
        </section>

        {/* Valor + formato */}
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <label className="flex items-center gap-2 text-[13.5px] font-bold" htmlFor="tarea-valor">
              <Scale aria-hidden className="h-4 w-4 text-secondary" strokeWidth={1.75} />
              Valor de la tarea
            </label>
            <div className="mt-2.5 flex items-center gap-2">
              <input
                id="tarea-valor"
                type="number"
                min={0}
                step={1}
                value={tarea.valor ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? undefined : Number(e.target.value);
                  actualizar({ valor: v !== undefined && Number.isFinite(v) && v >= 0 ? v : undefined });
                }}
                placeholder="—"
                className={`h-9 w-24 rounded-[9px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
              />
              <span className={`text-[12px] ${softText}`}>puntos</span>
            </div>
          </div>

          <div>
            <p className="text-[13.5px] font-bold">Formato de entrega</p>
            <div className="mt-2.5 flex flex-col gap-1.5">
              {(['archivo', 'texto', 'ambos'] as const).map((op) => (
                <label
                  key={op}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-2 text-[12.5px] transition-colors ${
                    tarea.entrega === op
                      ? 'border-primary bg-accent font-semibold text-accent-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="entrega"
                    className="sr-only"
                    checked={tarea.entrega === op}
                    onChange={() => actualizar({ entrega: op })}
                  />
                  <span
                    aria-hidden
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                      tarea.entrega === op ? 'border-primary' : 'border-[color:var(--track)]'
                    }`}
                  >
                    {tarea.entrega === op && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  {ENTREGA_ROTULO[op]}
                </label>
              ))}
            </div>
          </div>
        </section>
      </div>

      {picker && (
        <PickerRubrica
          catalogo={catalogo}
          seleccionadaId={tarea.rubricaId ?? null}
          onCerrar={() => setPicker(false)}
          onElegir={(id) => {
            actualizar({ rubricaId: id });
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}

/* ── Picker de rúbrica del catálogo ── */
function PickerRubrica({
  catalogo,
  seleccionadaId,
  onCerrar,
  onElegir,
}: {
  catalogo: RubricaCatalogo[] | null;
  seleccionadaId: string | null;
  onCerrar: () => void;
  onElegir: (id: string | null) => void;
}) {
  const [q, setQ] = useState('');

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  const filtradas = (catalogo ?? []).filter((r) =>
    r.nombre.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar rúbrica del catálogo"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="flex max-h-[80vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b border-border px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>Catálogo · familia tareas</p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
              Elige la rúbrica de esta tarea
            </h2>
            <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
              Rúbricas reutilizables para entregables. Se definen aparte; aquí solo se selecciona.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-2 rounded-[9px] border border-border bg-muted px-3">
            <Search aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar rúbrica…"
              className="h-9 w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Buscar rúbrica"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {catalogo === null ? (
            <div className={`flex items-center gap-2 px-2 py-8 text-[13px] ${softText}`}>
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              Cargando catálogo…
            </div>
          ) : filtradas.length === 0 ? (
            <p className={`px-2 py-8 text-center text-[13px] leading-relaxed ${softText}`}>
              {catalogo.length === 0
                ? 'Aún no hay rúbricas de tareas en el catálogo. Créalas en la sección de rúbricas.'
                : 'Ninguna rúbrica coincide con la búsqueda.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtradas.map((r) => {
                const sel = r.id === seleccionadaId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onElegir(r.id)}
                      aria-current={sel ? 'true' : undefined}
                      className={`flex w-full items-start gap-3 rounded-[11px] border p-3.5 text-left transition-colors ${
                        sel
                          ? 'border-primary bg-accent'
                          : 'border-border bg-card hover:border-primary hover:bg-accent'
                      } ${focusRing}`}
                    >
                      <ListChecks
                        aria-hidden
                        className="mt-0.5 h-[18px] w-[18px] shrink-0 text-secondary"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[13.5px] font-bold leading-snug">{r.nombre}</span>
                          <span
                            className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-wide ${
                              r.publicado
                                ? 'bg-primary text-[color:var(--sidebar)]'
                                : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                            }`}
                          >
                            {r.publicado ? 'Publicada' : 'Borrador'}
                          </span>
                        </span>
                        <span className={`mt-0.5 block text-[11.5px] leading-relaxed ${softText}`}>
                          {r.criterios.length} criterio(s)
                          {r.descripcion ? ` · ${r.descripcion}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {seleccionadaId && (
          <div className="flex items-center border-t border-border bg-muted px-6 py-3">
            <button
              type="button"
              onClick={() => onElegir(null)}
              className={`text-[12.5px] font-semibold text-destructive hover:underline ${focusRing}`}
            >
              Quitar rúbrica de esta tarea
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
