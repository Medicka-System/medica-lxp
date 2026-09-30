'use client';

/**
 * Eco — PLACEHOLDER (§7A). Panel/chat del asistente con el hueco LISTO para la infra
 * real de Eco (orquestador multi-modelo + RAG en apps/api · Sprint 5.3), que construye
 * otro agente. Aquí solo la superficie: banner que abre a un chat con respuestas mock
 * y el encuadre irrenunciable "Eco propone · usted confirma" (nada se asienta sin el
 * docente). Cuando la API exista, `onPedir` se cablea a POST /ai/eco (conversacional).
 *
 * No inventa datos de dominio: las respuestas son visiblemente de demostración.
 */

import { useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { focusRing, softText } from '@/lib/studio/estilos';

type Mensaje = { id: number; de: 'docente' | 'eco'; texto: string };

/** Respuesta mock: deja claro que Eco real llega con la API (no fabrica juicio). */
function respuestaMock(peticion: string): string {
  return `Eco (demostración): recibí «${peticion}». La respuesta real —pre-análisis por confianza, nota sugerida y borrador de feedback— llega cuando se conecte el orquestador de Eco (apps/api · RAG). Recuerde: Eco propone; usted confirma.`;
}

export function EcoPanel({
  resumen,
  sugerencias,
}: {
  resumen: string;
  sugerencias: string[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [peticion, setPeticion] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [n, setN] = useState(0);

  function pedir(texto: string) {
    const t = texto.trim();
    if (!t) return;
    const idU = n + 1;
    const idE = n + 2;
    setMensajes((m) => [
      ...m,
      { id: idU, de: 'docente', texto: t },
      { id: idE, de: 'eco', texto: respuestaMock(t) },
    ]);
    setN(idE);
    setPeticion('');
    setAbierto(true);
  }

  // La conversación se despliega inline (acordeón); ver el wrapper grid más abajo.
  const mostrarConv = abierto && mensajes.length > 0;

  return (
    <section
      aria-label="Eco"
      className="relative overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-rest"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(100deg, rgba(238,242,255,.95) 0%, rgba(255,255,255,0) 58%)',
        }}
      />
      <div className="relative p-5">
        <div className="flex flex-wrap items-center gap-3.5">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
          >
            <Sparkles className="h-[21px] w-[21px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-[14.5px] font-bold leading-snug">Eco</p>
              <span className="inline-flex h-[21px] items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                Propone · usted confirma
              </span>
              <span className="inline-flex h-[21px] items-center rounded-full border border-border bg-muted px-2 text-[10.5px] font-bold text-muted-foreground">
                Demostración
              </span>
            </div>
            <p className={`mt-1 text-[12.5px] ${softText}`}>{resumen}</p>
          </div>
          {abierto && (
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar conversación de Eco"
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-surface)] ${focusRing}`}
            >
              <X aria-hidden className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Despliegue inline (acordeón) de la conversación. Técnica: grid-template-rows
            0fr↔1fr — la EXCEPCIÓN aceptable a "solo transform/opacity" (§Ola3) por ser
            contenido de ALTO VARIABLE (chat que crece). Montado SIEMPRE (los mensajes
            persisten en estado) para animar en AMBOS sentidos; el hijo recorta con
            overflow-hidden mientras colapsa. Un fade sobrio acompaña el alto. La red
            global de reduced-motion + `motion-reduce:transition-none` lo dejan instantáneo. */}
        <div
          className="grid transition-[grid-template-rows] [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-entrada)] motion-reduce:transition-none"
          style={{ gridTemplateRows: mostrarConv ? '1fr' : '0fr' }}
          aria-hidden={!mostrarConv}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className="mt-4 flex max-h-[320px] flex-col gap-3 overflow-y-auto transition-opacity [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-entrada)] motion-reduce:transition-none"
              style={{ opacity: mostrarConv ? 1 : 0 }}
            >
              {mensajes.map((m) =>
                m.de === 'docente' ? (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-[84%] rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-sidebar-foreground">
                      {m.texto}
                    </p>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                    >
                      <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    </span>
                    <p className={`min-w-0 flex-1 text-[13px] leading-relaxed ${softText}`}>{m.texto}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <form
          className="relative mt-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            pedir(peticion);
          }}
        >
          <label className="flex h-11 items-center gap-2.5 rounded-full border border-border bg-muted px-4">
            <span className="sr-only">Pedirle trabajo a Eco</span>
            <input
              type="text"
              value={peticion}
              onChange={(e) => setPeticion(e.target.value)}
              placeholder="Pídale a Eco: «resúmeme las entregas del Grupo B»…"
              className="w-full min-w-0 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              aria-label="Enviar a Eco"
              className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
            >
              <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </button>
          </label>
        </form>

        <div className="mt-2.5 flex gap-2 overflow-x-auto">
          {sugerencias.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pedir(s)}
              className={`h-[34px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3.5 text-[12.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
