'use client';

/**
 * Eco en Grupos — PLACEHOLDER estructurado (§7A). Es el HUECO donde vivirá el análisis
 * de Eco sobre los grupos ("¿quién batalla y por qué?", propone acciones), con la
 * superficie LISTA pero SIN conectar al orquestador real (apps/api · RAG · Sprint 5.3).
 * Riel colapsado ↔ panel de chat, con conversación de DEMOSTRACIÓN visiblemente marcada.
 *
 * Movimiento (§5A · Ola motion): la transición cinta↔panel ya NO es un swap instantáneo.
 * Un ÚNICO `<aside>` queda montado y anima a la vez el ANCHO (56px↔352px, con token) y la
 * ALTURA (la cinta es corta; el panel, alto y acotado al viewport). Como aquí el alto es
 * VARIABLE, el panel se revela con el truco `grid-template-rows: 0fr↔1fr` (sin reflow: su
 * contenido va a ancho fijo 352px y se recorta con overflow) y la cinta se sostiene con un
 * piso `min-h`. Los dos contenidos (íconos de la cinta ↔ cuerpo del panel) hacen CROSSFADE
 * por opacidad — ambos presentes durante la transición, sin salto. Easing direccional
 * (--ease-entrada al abrir, --ease-salida al cerrar); reduced-motion lo deja instantáneo.
 *
 * Sigue la convención visual de Eco en la app (icono `Sparkles` sobre `info-surface`) —
 * no hay `EcoMark`. Cuando la API exista, `stub()` se cablea a POST /ai/eco. Nada aquí
 * fabrica juicio de dominio: las respuestas son de muestra y lo dicen.
 */

import { useState } from 'react';
import { MessageCircle, Send, Sparkles, TriangleAlert, X } from 'lucide-react';
import { focusRing, softText, mono } from '@/lib/studio/estilos';
import { Avatar } from '@/components/avatar';

type MsgAlumno = { ini: string; nombre: string; motivo: string };
type Mensaje = {
  id: number;
  de: 'docente' | 'eco';
  texto: string;
  alumnos?: MsgAlumno[];
  destacado?: string;
};

/** Conversación de DEMOSTRACIÓN (no es dato real; ilustra qué hará Eco aquí). */
const DEMO: Mensaje[] = [
  { id: 1, de: 'docente', texto: '¿Quién está batallando en este grupo?' },
  {
    id: 2,
    de: 'eco',
    texto: 'Ejemplo de lo que Eco responderá con trabajo hecho: la lista de quién y por qué.',
    alumnos: [
      { ini: 'HC', nombre: 'Dr. Hugo Cuevas', motivo: 'No entra desde hace 9 días · 2 casos rechazados' },
      { ini: 'PN', nombre: 'Dra. P. Navarro', motivo: '12 días sin actividad · va 2 módulos atrás' },
    ],
    destacado:
      'A los que reprueban los alcanza una consulta; a los que no entran conviene llamarles. (Demostración — Eco real llega con la API.)',
  },
];

const SUGERENCIAS = [
  '¿Quién está en riesgo?',
  'Resúmeme el avance del grupo',
  'Redacta un mensaje para los que no se conectan',
];

/** Respuesta de muestra: deja claro que el juicio real llega con el orquestador. */
function stub(peticion: string): string {
  return `Eco (demostración): recibí «${peticion}». El análisis real —quién batalla, por qué y qué acción proponer— llega cuando se conecte el orquestador de Eco (apps/api · RAG). Eco propone; usted confirma.`;
}

export function PanelEco({ resumen }: { resumen: string }) {
  const [abierto, setAbierto] = useState(false);
  const [peticion, setPeticion] = useState('');
  const [extra, setExtra] = useState<Mensaje[]>([]);
  const [n, setN] = useState(100);

  function pedir(texto: string) {
    const t = texto.trim();
    if (!t) return;
    const idU = n + 1;
    const idE = n + 2;
    setExtra((m) => [...m, { id: idU, de: 'docente', texto: t }, { id: idE, de: 'eco', texto: stub(t) }]);
    setN(idE);
    setPeticion('');
    setAbierto(true);
  }

  const mensajes = [...DEMO, ...extra];

  // Transición compartida: duración base + curva DIRECCIONAL (entra al abrir, sale al
  // cerrar) + corte por reduced-motion. La usan ancho, alto (grid-rows) y opacidad.
  const curva = abierto
    ? '[transition-timing-function:var(--ease-entrada)]'
    : '[transition-timing-function:var(--ease-salida)]';
  const trans = `[transition-duration:var(--dur-base)] ${curva} motion-reduce:transition-none`;

  return (
    <aside
      aria-label="Eco"
      className={`relative min-h-[120px] shrink-0 self-start overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-rest transition-[width] ${trans} ${
        abierto ? 'w-[352px]' : 'w-14'
      }`}
    >
      {/* ── CINTA (colapsada) — overlay que sostiene el alto cerrado (min-h); crossfade ── */}
      <div
        aria-hidden={abierto}
        className={`absolute inset-0 z-10 flex flex-col items-center gap-3 py-3.5 transition-opacity ${trans} ${
          abierto ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir Eco"
          className={`grid h-9 w-9 place-items-center rounded-[11px] bg-[color:var(--info-foreground)] text-white transition-colors hover:bg-sidebar ${focusRing}`}
        >
          <Sparkles aria-hidden className="h-[19px] w-[19px]" strokeWidth={1.75} />
        </button>
        <span
          aria-hidden
          className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--info-foreground)]"
          style={{ writingMode: 'vertical-rl' }}
        >
          Eco
        </span>
      </div>

      {/* ── PANEL (expandido) — se revela con grid-rows 0fr↔1fr; contenido a ancho fijo ── */}
      <div
        className={`grid transition-[grid-template-rows] ${trans}`}
        style={{ gridTemplateRows: abierto ? '1fr' : '0fr' }}
        aria-hidden={!abierto}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`flex max-h-[calc(100vh-120px)] w-[352px] flex-col transition-opacity ${trans} ${
              abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3.5">
              <span
                aria-hidden
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-[color:var(--info-foreground)] text-white"
              >
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold leading-tight">Eco</p>
                  <span className="inline-flex h-[19px] items-center rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted-foreground">
                    Demostración
                  </span>
                </div>
                <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">Analiza · usted acompaña</p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar Eco"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
              >
                <X aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5">
              <div className="flex gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                >
                  <Sparkles className="h-[14px] w-[14px]" strokeWidth={1.75} />
                </span>
                <p className={`min-w-0 flex-1 text-[12.5px] leading-relaxed ${softText}`}>{resumen}</p>
              </div>

              {mensajes.map((m) =>
                m.de === 'docente' ? (
                  <div key={m.id} className="flex shrink-0 justify-end">
                    <p className="max-w-[86%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                      {m.texto}
                    </p>
                  </div>
                ) : (
                  <div key={m.id} className="flex shrink-0 gap-2.5">
                    <span
                      aria-hidden
                      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                    >
                      <Sparkles className="h-[14px] w-[14px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] leading-relaxed ${softText}`}>{m.texto}</p>

                      {m.alumnos && (
                        <ul className="mt-2.5 flex flex-col gap-1.5">
                          {m.alumnos.map((a) => (
                            <li key={a.ini} className="flex gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2.5">
                              <Avatar ini={a.ini} size={26} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[11.5px] font-bold">{a.nombre}</span>
                                <span className={`mt-0.5 block text-[11px] leading-snug ${softText}`}>{a.motivo}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {m.destacado && (
                        <div className="mt-2.5 flex gap-2 rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2.5">
                          <TriangleAlert
                            aria-hidden
                            className="mt-px h-3.5 w-3.5 shrink-0 text-[color:var(--warning-foreground)]"
                            strokeWidth={2}
                          />
                          <p className="text-[11.5px] leading-relaxed text-[color:var(--warning-foreground)]">{m.destacado}</p>
                        </div>
                      )}

                      {m.alumnos && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <span
                            className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-muted px-3 text-[12px] font-semibold ${softText}`}
                          >
                            <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Mandarles consulta
                          </span>
                          <span className={`${mono} inline-flex h-9 items-center rounded-[9px] px-2 text-[10.5px] text-muted-foreground`}>
                            acción cuando Eco esté conectado
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="shrink-0 border-t border-border px-3.5 pb-3.5 pt-3">
              <div className="flex gap-1.5 overflow-x-auto">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pedir(s)}
                    className={`h-[30px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <form
                className="mt-2.5 flex h-[42px] items-center gap-2.5 rounded-full border border-border bg-muted px-3.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  pedir(peticion);
                }}
              >
                <span className="sr-only">Preguntarle a Eco sobre este grupo</span>
                <input
                  type="text"
                  value={peticion}
                  onChange={(e) => setPeticion(e.target.value)}
                  placeholder="Pregúntele a Eco sobre este grupo…"
                  className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  aria-label="Enviar"
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
                >
                  <Send aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
