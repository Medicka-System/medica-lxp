'use client';

/**
 * Columna 3 · Eco (§7A). TOOLS-FIRST: «Qué está preguntando» (resumen del hilo), el
 * PATRÓN («otros N del mismo módulo esperan») y el MATERIAL para enlazar se DERIVAN de
 * datos reales (SQL). La redacción por LLM y el chat conversacional son PLACEHOLDER
 * hasta el endpoint de `apps/api` (§7A/§13). Colapsable a un riel de 56px. Eco asiste;
 * el docente decide (§7A) — nunca envía por su cuenta.
 *
 * Movimiento (§5A · Ola motion): la transición cinta↔panel ya NO es un swap instantáneo.
 * MISMA técnica que EcoRailValidacion (la superficie de Eco equivalente: su padre da
 * altura completa — aquí `flex h-[calc(100vh-60px)]`, allá `h-[calc(100dvh-60px)]` —, así
 * que solo cambia UN eje). Un ÚNICO `<aside>` queda montado y anima el ANCHO (56px↔340px)
 * con token; las dos capas (íconos de la cinta ↔ cuerpo del panel) viven APILADAS en
 * absoluto y hacen CROSSFADE por opacidad — ambas presentes durante la transición, sin
 * salto. El panel mantiene su ancho fijo (340px) mientras el contenedor se estrecha
 * (overflow-hidden lo recorta) ⇒ NO hay reflow del texto. Easing direccional
 * (--ease-entrada al abrir, --ease-salida al cerrar); reduced-motion lo deja instantáneo.
 */

import { BookCopy, MessageCircle, Send, Users, X } from 'lucide-react';
import { mono, softText, focusRing, EcoMark } from './ui';
import type { RecursoEnlazable, SugerenciaEcoConsulta } from '../../../_lib/contrato';

export type PanelEcoConsultasProps = {
  eco: SugerenciaEcoConsulta | null;
  ecoAbierto: boolean;
  setEcoAbierto: (v: boolean) => void;
  onEnlazar: (r: RecursoEnlazable) => void;
  onResponderATodos: () => void;
  onLlevarAlForo: () => void;
};

export function PanelEcoConsultas({
  eco,
  ecoAbierto,
  setEcoAbierto,
  onEnlazar,
  onResponderATodos,
  onLlevarAlForo,
}: PanelEcoConsultasProps) {
  // Transición compartida: duración base + curva DIRECCIONAL (entra al abrir, sale al
  // cerrar) + corte por reduced-motion. La usan el ancho del aside y la opacidad de las
  // dos capas. Mismo patrón que EcoRailValidacion.
  const curva = ecoAbierto
    ? '[transition-timing-function:var(--ease-entrada)]'
    : '[transition-timing-function:var(--ease-salida)]';
  const trans = `[transition-duration:var(--dur-base)] ${curva} motion-reduce:transition-none`;

  return (
    <aside
      aria-label="Eco"
      className={`relative shrink-0 overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-[width] ${trans} ${
        ecoAbierto ? 'w-[340px]' : 'w-14'
      }`}
    >
      {/* ── CINTA (colapsada) — crossfade con el panel; interactiva solo cerrada ── */}
      <div
        aria-hidden={ecoAbierto}
        className={`absolute inset-y-0 left-0 z-10 flex w-14 flex-col items-center gap-3 py-3.5 transition-opacity ${trans} ${
          ecoAbierto ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={() => setEcoAbierto(true)}
          aria-label="Abrir Eco"
          className={`grid h-9 w-9 place-items-center rounded-[11px] bg-[color:var(--info-foreground)] text-white transition-colors hover:bg-sidebar ${focusRing}`}
        >
          <EcoMark size={22} invertido />
        </button>
        <span
          aria-hidden
          className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--info-foreground)]"
          style={{ writingMode: 'vertical-rl' }}
        >
          Eco
        </span>
      </div>

      {/* ── PANEL (expandido) — ancho fijo 340 (sin reflow); recortado por overflow ── */}
      <div
        aria-hidden={!ecoAbierto}
        className={`absolute inset-y-0 left-0 flex w-[340px] flex-col transition-opacity ${trans} ${
          ecoAbierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3.5">
          <EcoMark size={34} invertido />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold leading-tight">Eco</p>
            <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">Asiste · usted responde</p>
          </div>
          <button
            type="button"
            onClick={() => setEcoAbierto(false)}
            aria-label="Cerrar Eco"
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
          >
            <X aria-hidden className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {!eco ? (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <p className={`text-[12.5px] ${softText}`}>Elija una consulta y Eco resumirá el hilo, detectará patrones y le propondrá material.</p>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
              {/* resume el hilo */}
              <section className="rounded-xl border border-border bg-card p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--info-foreground)]">
                  Qué está preguntando
                </p>
                <p className={`mt-2 text-[12.5px] leading-relaxed ${softText}`}>{eco.resumen}</p>
                <p className={`${mono} mt-2 text-[11px] text-muted-foreground`}>{eco.metaHilo}</p>
              </section>

              {/* patrón real: otros del mismo módulo que también esperan */}
              {eco.patron && (
                <section className="rounded-xl border border-border bg-card p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--info-foreground)]">
                    Lo mismo preguntaron otros
                  </p>
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <span className="flex pl-1.5" aria-hidden>
                      {eco.patron.inis.map((i, idx) => (
                        <span
                          key={`${i}-${idx}`}
                          className={`${mono} -ml-2 grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground`}
                        >
                          {i}
                        </span>
                      ))}
                    </span>
                    <span className="min-w-0 flex-1 text-[12px] font-semibold">{eco.patron.cuantos} alumnos</span>
                  </div>
                  <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>{eco.patron.texto}</p>
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={onResponderATodos}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-primary text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                    >
                      <Users aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      Responderles a los {eco.patron.cuantos}
                    </button>
                    <button
                      type="button"
                      onClick={onLlevarAlForo}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                    >
                      <MessageCircle aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      Llevarlo al foro del grupo
                    </button>
                  </div>
                  <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                    Responder juntos o llevarlo al foro son acciones de Eco · pendientes de su endpoint (§7A).
                  </p>
                </section>
              )}

              {/* material para enlazar */}
              {eco.recursos.length > 0 && (
                <section className="rounded-xl border border-border bg-card p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--info-foreground)]">
                    Material que puede enlazar
                  </p>
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {eco.recursos.map((r) => (
                      <li key={r.titulo}>
                        <button
                          type="button"
                          onClick={() => onEnlazar(r)}
                          className={`flex w-full items-start gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2.5 text-left transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                        >
                          <BookCopy aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={1.75} />
                          <span className="min-w-0 flex-1">
                            <span className={`${mono} block text-[9.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground`}>
                              {r.clave}
                            </span>
                            <span className="mt-0.5 block text-[12px] font-semibold leading-snug">{r.titulo}</span>
                            <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>{r.meta}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="shrink-0 border-t border-border px-3.5 pb-3.5 pt-3">
              <div className="flex gap-1.5 overflow-x-auto">
                {eco.ajustes.map((a) => (
                  <button
                    key={a}
                    type="button"
                    disabled
                    title="Eco conversacional: pendiente de endpoint (§7A)"
                    className={`h-[30px] shrink-0 cursor-not-allowed whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold opacity-60 ${softText}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <form
                className="mt-2.5 flex h-[42px] items-center gap-2.5 rounded-full border border-border bg-muted px-3.5 opacity-60"
                onSubmit={(e) => e.preventDefault()}
              >
                <span className="sr-only">Pedirle algo a Eco (próximamente)</span>
                <input
                  type="text"
                  disabled
                  placeholder="Pídale algo a Eco… (próximamente)"
                  className="w-full min-w-0 cursor-not-allowed bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled
                  aria-label="Enviar"
                  className={`grid h-7 w-7 shrink-0 cursor-not-allowed place-items-center rounded-full bg-[color:var(--info-foreground)] text-white opacity-70 ${focusRing}`}
                >
                  <Send aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
