'use client';

/**
 * Entregas — segunda herramienta diaria del DOCENTE (§5B). Los dos tipos NO se tratan
 * igual: las AUTOEVALUACIONES (opción múltiple) se autocalifican; las TAREAS abiertas
 * las pre-califica Eco contra la rúbrica del diseñador y el docente confirma o ajusta.
 * Eco nunca asienta la nota solo (§7A) — aquí la nota se ASIENTA con `calificarEntrega`.
 *
 * REAL: la lista (RLS `es_staff`) y la calificación (update `entregas` bajo RLS).
 * PLACEHOLDER (Sprint 5.3): la nota sugerida y el sustento de Eco contra la rúbrica.
 * Un solo color de atención: ÁMBAR para lo que espera lectura; violeta = Eco (§5A).
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ClipboardCheck, Clock, Search, Sparkles, TriangleAlert } from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import type { EntregaRevision, EstadoEntrega } from '../../../_lib/contrato';
import { calificarEntrega } from '../../../_lib/acciones';

const ESTADO_LABEL: Record<EstadoEntrega, string> = {
  pendiente: 'Pendiente',
  enviada: 'Por revisar',
  calificada: 'Calificada',
  devuelta: 'Devuelta',
};

const TIPO_LABEL: Record<EntregaRevision['tipoActividad'], string> = {
  tarea: 'Tarea abierta',
  autoevaluacion: 'Autoevaluación',
  foro: 'Foro',
};

function metaEntrega(e: EntregaRevision): string {
  return [e.modulo, e.leccion].filter(Boolean).join(' · ');
}

export function EntregasConsola({ entregas }: { entregas: EntregaRevision[] }) {
  const router = useRouter();
  const [lista, setLista] = useState(entregas);
  const [seleccionId, setSeleccionId] = useState<string | null>(entregas[0]?.id ?? null);
  const [filtro, setFiltro] = useState('');
  const [nota, setNota] = useState('');
  const [feedback, setFeedback] = useState('');
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, startTransition] = useTransition();

  useEffect(() => {
    setLista(entregas);
    setSeleccionId((prev) => (prev && entregas.some((e) => e.id === prev) ? prev : entregas[0]?.id ?? null));
  }, [entregas]);

  const seleccion = lista.find((e) => e.id === seleccionId) ?? null;

  useEffect(() => {
    setNota(seleccion?.nota != null ? String(seleccion.nota) : '');
    setFeedback('');
    setResultado(null);
  }, [seleccionId, seleccion?.nota]);

  const listaFiltrada = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (e) => e.alumno.toLowerCase().includes(q) || e.actividad.toLowerCase().includes(q),
    );
  }, [lista, filtro]);

  function confirmar() {
    if (!seleccion) return;
    const n = Number(nota);
    if (Number.isNaN(n) || n < 0 || n > 10) {
      setResultado({ ok: false, texto: 'La nota debe ir de 0 a 10.' });
      return;
    }
    const entregaId = seleccion.id;
    startTransition(async () => {
      const r = await calificarEntrega({ entregaId, nota: n, feedback, ecoSugerida: false });
      if (!r.ok) {
        setResultado({ ok: false, texto: r.error });
        return;
      }
      setResultado({ ok: true, texto: `Nota ${n.toFixed(1)} asentada y devuelta al alumno.` });
      setLista((prev) =>
        prev.map((e) => (e.id === entregaId ? { ...e, estado: 'calificada', nota: n } : e)),
      );
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-60px)] min-h-0">
      {/* ════════ BANDEJA ════════ */}
      <aside className="flex w-[340px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
        <div className="shrink-0 border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[15px] font-extrabold tracking-[-0.015em]">Entregas</h1>
            <span className={`${mono} text-[13px] font-bold text-muted-foreground`}>{lista.length}</span>
          </div>
          <label className="mt-2.5 flex h-9 items-center gap-2 rounded-[9px] border border-border bg-muted px-2.5 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno o actividad</span>
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar alumno o actividad…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-2">
          {listaFiltrada.length === 0 ? (
            <p className={`px-4 py-6 text-center text-[12.5px] ${softText}`}>
              {lista.length === 0 ? 'No hay entregas por revisar.' : 'Sin coincidencias.'}
            </p>
          ) : (
            listaFiltrada.map((e) => {
              const on = e.id === seleccionId;
              const porRevisar = e.estado === 'enviada' || e.estado === 'pendiente';
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSeleccionId(e.id)}
                  aria-current={on ? 'true' : undefined}
                  className={`flex w-full gap-2.5 rounded-r-[10px] border-l-[3px] p-3 text-left transition-colors ${focusRing} ${
                    on ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar text-[11px] font-bold text-sidebar-foreground"
                  >
                    {e.iniciales}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={`min-w-0 flex-1 truncate text-[12.5px] ${on ? 'font-bold text-accent-foreground' : 'font-semibold text-foreground'}`}>
                        {e.alumno}
                      </span>
                      {e.nota != null ? (
                        <span className={`${mono} shrink-0 text-[11px] font-bold text-secondary`}>{e.nota.toFixed(1)}</span>
                      ) : (
                        <span className={`${mono} shrink-0 text-[10.5px] ${porRevisar ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>
                          {haceCuanto(e.creadoEn)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{e.actividad}</span>
                    <span className="mt-1.5 inline-flex items-center gap-1.5">
                      <span className={`inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-bold ${
                        porRevisar
                          ? 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                          : 'bg-accent text-accent-foreground'
                      }`}>
                        {ESTADO_LABEL[e.estado]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{TIPO_LABEL[e.tipoActividad]}</span>
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ════════ DETALLE ════════ */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-background">
        {seleccion ? (
          <div className="mx-auto w-full max-w-[860px] px-6 pb-8 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sidebar text-[13px] font-bold text-sidebar-foreground"
              >
                {seleccion.iniciales}
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-extrabold tracking-[-0.015em]">{seleccion.alumno}</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {seleccion.actividad} · {TIPO_LABEL[seleccion.tipoActividad]}
                  {metaEntrega(seleccion) ? ` · ${metaEntrega(seleccion)}` : ''}
                </p>
              </div>
              <span className={`ml-auto ${mono} text-[11.5px] text-muted-foreground`}>
                entregada {haceCuanto(seleccion.creadoEn)}
              </span>
            </div>

            {/* respuesta del alumno */}
            <section className="mt-5 rounded-xl border border-border bg-card p-[18px] shadow-rest">
              <p className={`${kicker} text-muted-foreground`}>Respuesta del alumno</p>
              <p className={`mt-3 text-[13px] leading-relaxed ${softText}`}>
                {seleccion.notaAlumno || <span className="italic text-muted-foreground">Sin texto capturado en la entrega.</span>}
              </p>
            </section>

            {/* Eco — pre-calificación (placeholder) */}
            <section className="mt-4 rounded-xl border border-[color:var(--info-border)] p-[18px] shadow-rest" style={{ background: '#fbfbff' }}>
              <div className="flex items-center gap-2.5">
                <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]">
                  <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </span>
                <p className={`${kicker} text-[color:var(--info-foreground)]`}>Pre-calificación de Eco</p>
                <span className="ml-auto inline-flex h-[22px] items-center rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted-foreground">
                  Demostración
                </span>
              </div>
              <p className={`mt-3 text-[12.5px] leading-relaxed ${softText}`}>
                {seleccion.tipoActividad === 'autoevaluacion'
                  ? 'Las autoevaluaciones se autocalifican por opción múltiple. Al conectar Eco verá el acierto por pregunta para auditar y liberar.'
                  : 'Al conectarse, Eco compara la respuesta contra la rúbrica del diseñador y sugiere nota + comentario. Usted confirma o ajusta — nada se asienta sin usted.'}
              </p>
            </section>

            {/* calificar */}
            <section className="mt-4 rounded-xl border border-border bg-card p-[18px] shadow-rest">
              <p className={`${kicker} text-muted-foreground`}>Calificar</p>
              <div className="mt-3 flex flex-wrap items-center gap-3.5">
                <label className="flex shrink-0 items-center gap-2.5">
                  <span className="text-[11.5px] font-bold">Nota</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="0–10"
                    className={`${mono} h-11 w-[92px] rounded-[10px] border border-border bg-card px-3 text-center text-[15px] font-bold text-foreground outline-none transition-colors focus:border-secondary`}
                  />
                </label>
                <p className="min-w-[180px] flex-1 text-[11.5px] leading-snug text-muted-foreground">
                  El alumno recibe la nota y su comentario. Puede ajustar una nota ya asentada.
                </p>
              </div>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Comentario para el alumno (opcional)…"
                className="mt-3 w-full resize-none rounded-[11px] border border-border bg-muted px-3.5 py-3 text-[13px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary"
              />

              {resultado && (
                <div
                  role="status"
                  className={`mt-3 flex items-start gap-2.5 rounded-[11px] border px-3.5 py-3 text-[12.5px] font-medium ${
                    resultado.ok
                      ? 'border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
                      : 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                  }`}
                >
                  {resultado.ok ? (
                    <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
                  ) : (
                    <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                  )}
                  <span>{resultado.texto}</span>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={enviando}
                  className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
                >
                  {enviando ? (
                    <Clock aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />
                  )}
                  {seleccion.estado === 'calificada' ? 'Actualizar nota' : 'Asentar y devolver'}
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <span aria-hidden className="inline-grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-accent-foreground">
                <ClipboardCheck className="h-[26px] w-[26px]" strokeWidth={2} />
              </span>
              <h2 className="mt-3.5 text-[18px] font-extrabold tracking-[-0.015em]">Sin entregas por revisar</h2>
              <p className={`mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed ${softText}`}>
                Cuando un alumno envíe una tarea o autoevaluación, aparecerá aquí para su revisión.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
