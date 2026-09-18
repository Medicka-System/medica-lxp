'use client';

/**
 * Consultas — canal 1:1 alumno↔docente (§5B). Master-detail: hilos a la izquierda,
 * conversación a la derecha con la caja de respuesta. El docente atiende dudas fuera
 * del foro del grupo; se envía lo que el docente confirma.
 *
 * REAL: lista + hilo (RLS `es_docente_o_mas`), responder (`responderConsulta` inserta
 * en `consulta_mensajes`), cerrar/reabrir (`cambiarEstadoConsulta`). La selección va
 * por query param (?c=) → navegación real que revalida el hilo.
 *
 * PENDIENTE DE API (contrato · §7A/§13): el "borrador de respuesta redactado por Eco"
 * es CONVERSACIONAL y `apps/api` (`src/ai`) NO expone endpoint para eso todavía — solo
 * el pipeline de evaluación EN LOTE (/ai/lote, /ai/propuestas/:id/confirmar|descartar,
 * /ai/indexar, /ai/config). El web se ajusta al api (no al revés): cuando exista un
 * endpoint tipo `POST /ai/redactar` (consulta → borrador), se cablea aquí igual que en
 * validación/entregas. Hasta entonces, el aviso de abajo lo deja explícito.
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, MessagesSquare, Send, Sparkles, Unlock } from 'lucide-react';
import { mono, softText, focusRing } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import type { ConsultaDetalle, ConsultaHilo } from '../../../_lib/contrato';
import { cambiarEstadoConsulta, responderConsulta } from '../../../_lib/acciones';

export function ConsultasConsola({
  hilos,
  detalle,
}: {
  hilos: ConsultaHilo[];
  detalle: ConsultaDetalle | null;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function enviar() {
    if (!detalle) return;
    const cuerpo = texto.trim();
    if (!cuerpo) {
      setError('Escribe una respuesta antes de enviar.');
      return;
    }
    const consultaId = detalle.id;
    startTransition(async () => {
      const r = await responderConsulta({ consultaId, cuerpo });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setTexto('');
      router.refresh();
    });
  }

  function alternarEstado() {
    if (!detalle) return;
    const consultaId = detalle.id;
    const estado = detalle.estado === 'abierta' ? 'cerrada' : 'abierta';
    startTransition(async () => {
      await cambiarEstadoConsulta({ consultaId, estado });
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-60px)] min-h-0">
      {/* ════════ LISTA DE HILOS ════════ */}
      <aside className="flex w-[340px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
        <div className="shrink-0 border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[15px] font-extrabold tracking-[-0.015em]">Consultas</h1>
            <span className={`${mono} text-[13px] font-bold text-muted-foreground`}>{hilos.length}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Canal 1:1 con sus alumnos</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-2">
          {hilos.length === 0 ? (
            <p className={`px-4 py-6 text-center text-[12.5px] ${softText}`}>
              No hay consultas abiertas. Cuando un alumno le escriba, aparecerá aquí.
            </p>
          ) : (
            hilos.map((h) => {
              const on = detalle?.id === h.id;
              return (
                <Link
                  key={h.id}
                  href={`/docente/consultas?c=${h.id}`}
                  scroll={false}
                  aria-current={on ? 'true' : undefined}
                  className={`flex gap-2.5 rounded-r-[10px] border-l-[3px] p-3 transition-colors ${focusRing} ${
                    on ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar text-[11px] font-bold text-sidebar-foreground"
                  >
                    {h.iniciales}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={`min-w-0 flex-1 truncate text-[12.5px] ${on ? 'font-bold text-accent-foreground' : 'font-semibold text-foreground'}`}>
                        {h.alumno}
                      </span>
                      <span className={`${mono} shrink-0 text-[10.5px] text-muted-foreground`}>{haceCuanto(h.actualizado)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] font-medium text-foreground">{h.asunto}</span>
                    {h.ultimoMensaje && (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{h.ultimoMensaje}</span>
                    )}
                    {h.estado === 'cerrada' && (
                      <span className="mt-1.5 inline-flex h-5 items-center gap-1 rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                        <Lock aria-hidden className="h-2.5 w-2.5" strokeWidth={2} /> Cerrada
                      </span>
                    )}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </aside>

      {/* ════════ HILO ════════ */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {detalle ? (
          <>
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3.5">
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar text-[12px] font-bold text-sidebar-foreground"
              >
                {detalle.iniciales}
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px] font-bold leading-tight">{detalle.alumno}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{detalle.asunto}</p>
              </div>
              <button
                type="button"
                onClick={alternarEstado}
                disabled={enviando}
                className={`ml-auto inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 ${focusRing}`}
              >
                {detalle.estado === 'abierta' ? (
                  <><Lock aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> Cerrar</>
                ) : (
                  <><Unlock aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> Reabrir</>
                )}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
                {detalle.mensajes.length === 0 ? (
                  <p className={`py-8 text-center text-[12.5px] ${softText}`}>
                    Aún no hay mensajes en esta consulta.
                  </p>
                ) : (
                  detalle.mensajes.map((m) =>
                    m.autor === 'docente' ? (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[80%]">
                          <p className="rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-sidebar-foreground">
                            {m.cuerpo}
                          </p>
                          <p className={`${mono} mt-1 text-right text-[10.5px] text-muted-foreground`}>{haceCuanto(m.creadoEn)}</p>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="flex gap-2.5">
                        <span
                          aria-hidden
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground"
                        >
                          {detalle.iniciales}
                        </span>
                        <div className="max-w-[80%]">
                          <p className={`rounded-[14px] rounded-bl-[4px] border border-border bg-card px-3.5 py-2.5 text-[13px] leading-relaxed ${softText}`}>
                            {m.cuerpo}
                          </p>
                          <p className={`${mono} mt-1 text-[10.5px] text-muted-foreground`}>
                            {m.autorNombre} · {haceCuanto(m.creadoEn)}
                          </p>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>

            {/* caja de respuesta */}
            <div className="shrink-0 border-t border-border bg-card px-5 py-3.5">
              <div className="mx-auto w-full max-w-[720px]">
                <div className="mb-2 flex items-center gap-1.5">
                  <Sparkles aria-hidden className="h-3.5 w-3.5 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
                  <span className="text-[11px] font-semibold text-[color:var(--info-foreground)]">
                    Eco redactará el borrador cuando apps/api exponga su endpoint conversacional · usted envía lo que confirme
                  </span>
                </div>
                {error && (
                  <p className="mb-2 text-[11.5px] font-medium text-[color:var(--warning-foreground)]">{error}</p>
                )}
                <form
                  className="flex items-end gap-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    enviar();
                  }}
                >
                  <textarea
                    rows={2}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escriba su respuesta…"
                    className="min-h-[46px] w-full resize-none rounded-[11px] border border-border bg-muted px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary"
                  />
                  <button
                    type="submit"
                    disabled={enviando}
                    aria-label="Enviar respuesta"
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-primary text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
                  >
                    <Send aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <span aria-hidden className="inline-grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-accent-foreground">
                <MessagesSquare className="h-[26px] w-[26px]" strokeWidth={1.75} />
              </span>
              <h2 className="mt-3.5 text-[18px] font-extrabold tracking-[-0.015em]">
                {hilos.length === 0 ? 'Sin consultas' : 'Elija una consulta'}
              </h2>
              <p className={`mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed ${softText}`}>
                {hilos.length === 0
                  ? 'Cuando un alumno abra una consulta 1:1, aparecerá en esta lista.'
                  : 'Seleccione un hilo de la izquierda para leerlo y responder.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
