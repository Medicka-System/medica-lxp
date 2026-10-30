'use client';

/**
 * Eco — rail colapsable de la validación (§7A). Colapsado es una cinta de 56px; abierto,
 * un panel con el encuadre "propone · usted firma" y un chat CONVERSACIONAL REAL.
 *
 * Movimiento (§5A · Ola motion): la transición cinta↔panel ya NO es un swap instantáneo.
 * Un ÚNICO `<aside>` queda montado y anima su ANCHO (56px↔360px) con token; los dos
 * contenidos (íconos de la cinta y cuerpo del panel) viven APILADOS en absoluto y hacen
 * CROSSFADE por opacidad — ambos presentes durante la transición, sin salto. El panel
 * mantiene su ancho fijo (360px) mientras el contenedor se estrecha (overflow-hidden lo
 * recorta), así NO hay reflow del texto ⇒ sin jank. El padre da altura completa
 * (`flex h-[calc(100dvh-60px)]`), por eso aquí solo cambia el ancho. Easing direccional
 * (--ease-entrada al abrir, --ease-salida al cerrar); reduced-motion lo deja instantáneo.
 *
 * CABLEADO REAL (§7A · §2): el chat usa `preguntarAEco` → `POST /ai/eco` (el MISMO cliente
 * y surface que <ChatEco>). `surface='grupo'` con el grupo del caso en foco (`grupoId`);
 * Eco corre tools bajo RLS (roster, casos, competencia) — no inventa. Si no hay caso
 * abierto (`grupoId` null) no hay grupo que consultar: el input queda deshabilitado con una
 * pista. El pre-análisis EN LOTE sigue por su vía (`lxp.eco_propuestas`), aparte de este chat.
 */

import { useRef, useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { focusRing, softText } from '@/lib/studio/estilos';
import { preguntarAEco } from '@/lib/eco/chat.server';
import type { FuenteEco, TurnoEco } from '@/lib/eco/tipos';

type Burbuja = {
  id: number;
  de: 'docente' | 'eco';
  texto: string;
  fuentes?: FuenteEco[];
  tools?: string[];
};

const SUGERENCIAS = [
  'Resume los casos del grupo',
  '¿Cuáles valen para la Biblioteca?',
  '¿Qué veredicto sugieres y por qué?',
];

/** Etiqueta legible de una fuente citada por Eco (RAG o caso). */
function rotuloFuente(f: FuenteEco): string {
  if (f.titulo) return f.titulo;
  const mapa: Record<string, string> = {
    caso_biblioteca: 'Caso de biblioteca',
    caso_bitacora: 'Caso de bitácora',
    contenido: 'Teoría',
    rubrica: 'Rúbrica',
  };
  return mapa[f.tipo] ?? f.tipo;
}

export function EcoRailValidacion({
  abierta,
  onAbrir,
  onCerrar,
  grupoId,
}: {
  abierta: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
  /** Grupo del caso en foco; `null` si no hay caso abierto (sin grupo que consultar). */
  grupoId: string | null;
}) {
  const [peticion, setPeticion] = useState('');
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contador = useRef(0);

  async function enviar(texto: string) {
    const t = texto.trim();
    if (!t || pensando || !grupoId) return;
    setError(null);
    setPeticion('');

    const idU = ++contador.current;
    const nuevas: Burbuja[] = [...burbujas, { id: idU, de: 'docente', texto: t }];
    setBurbujas(nuevas);
    setPensando(true);

    // Historial transitorio (solo texto, en orden) — el api es stateless (§7A).
    const historial: TurnoEco[] = nuevas.map((b) => ({
      rol: b.de === 'docente' ? 'usuario' : 'eco',
      texto: b.texto,
    }));

    const r = await preguntarAEco({ surface: 'grupo', entidadId: grupoId, mensajes: historial });
    setPensando(false);

    if (!r.ok) {
      setError(r.error);
      return;
    }
    setBurbujas((prev) => [
      ...prev,
      { id: ++contador.current, de: 'eco', texto: r.texto, fuentes: r.fuentes, tools: r.toolsUsados },
    ]);
  }

  // Transición compartida: duración base + curva DIRECCIONAL (entra al abrir, sale al
  // cerrar) + corte por reduced-motion. La usan ancho, borde y opacidad de ambas capas.
  const curva = abierta
    ? '[transition-timing-function:var(--ease-entrada)]'
    : '[transition-timing-function:var(--ease-salida)]';
  const trans = `[transition-duration:var(--dur-base)] ${curva} motion-reduce:transition-none`;

  return (
    <aside
      aria-label="Eco"
      className={`relative shrink-0 overflow-hidden border-l bg-card transition-[width,border-color] ${trans} ${
        abierta ? 'w-[360px] border-[color:var(--info-border)]' : 'w-14 border-border'
      }`}
    >
      {/* ── CINTA (colapsada) — crossfade con el panel; interactiva solo cerrada ── */}
      <div
        aria-hidden={abierta}
        className={`absolute inset-y-0 left-0 z-10 flex w-14 flex-col items-center gap-2.5 py-3.5 transition-opacity ${trans} ${
          abierta ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={onAbrir}
          aria-label="Abrir Eco"
          className={`grid h-10 w-10 place-items-center rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-foreground)] hover:text-white ${focusRing}`}
        >
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <span
          aria-hidden
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
          style={{ writingMode: 'vertical-rl' }}
        >
          Asistente
        </span>
      </div>

      {/* ── PANEL (expandido) — ancho fijo 360 (sin reflow); recortado por overflow ── */}
      <div
        aria-hidden={!abierta}
        className={`absolute inset-y-0 left-0 flex w-[360px] flex-col transition-opacity ${trans} ${
          abierta ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[color:var(--info-foreground)] text-white"
          >
            <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold leading-tight">Eco</p>
            <p className="mt-0.5 text-[11px] text-[color:var(--info-foreground)]">Propone · usted firma</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar Eco"
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
          >
            <X aria-hidden className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {burbujas.length === 0 ? (
            <p className={`text-[12.5px] leading-relaxed ${softText}`}>
              {grupoId
                ? 'Pregúntele a Eco sobre el grupo del caso: cruza casos, entregas por revisar y competencia I-AIM (bajo RLS). Pre-analiza contra la verdad del caso y propone veredicto, nota y feedback. Nada se firma sin usted.'
                : 'Abra un caso para preguntarle a Eco sobre su grupo. Eco cruza casos, entregas y competencia del grupo del caso en foco (bajo RLS). Nada se firma sin usted.'}
            </p>
          ) : (
            burbujas.map((m) =>
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
                  <div className="min-w-0 flex-1">
                    <p className={`whitespace-pre-wrap text-[13px] leading-relaxed ${softText}`}>{m.texto}</p>
                    {m.fuentes && m.fuentes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.fuentes.map((f, i) => (
                          <span
                            key={`${f.tipo}-${f.id ?? i}`}
                            className="inline-flex h-[22px] items-center rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold text-muted-foreground"
                          >
                            {rotuloFuente(f)}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.tools && m.tools.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        Consultó: {[...new Set(m.tools)].join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )
          )}
          {pensando && (
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
              >
                <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </span>
              <p className="text-[12.5px] italic text-muted-foreground">Eco está consultando los datos…</p>
            </div>
          )}
          {error && (
            <p className="rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[11.5px] text-[color:var(--destructive-foreground)]">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 pb-4 pt-3">
          {grupoId && burbujas.length === 0 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pensando}
                  onClick={() => enviar(s)}
                  className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] disabled:opacity-60 ${softText} ${focusRing}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            className={`mt-2.5 flex h-11 items-center gap-2.5 rounded-full border border-border bg-muted px-4 ${
              grupoId ? '' : 'opacity-60'
            }`}
            onSubmit={(e) => {
              e.preventDefault();
              enviar(peticion);
            }}
          >
            <span className="sr-only">Pedirle trabajo a Eco</span>
            <input
              type="text"
              value={peticion}
              disabled={pensando || !grupoId}
              onChange={(e) => setPeticion(e.target.value)}
              placeholder={grupoId ? 'Pídale trabajo a Eco…' : 'Abra un caso para preguntar sobre su grupo'}
              className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={pensando || !grupoId || !peticion.trim()}
              aria-label="Enviar"
              className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white disabled:opacity-50 ${focusRing}`}
            >
              <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
