'use client';

/**
 * Eco — rail colapsable de la validación (PLACEHOLDER · §7A). Colapsado es una cinta
 * de 56px; abierto, un panel con el encuadre "propone · usted firma" y un chat de
 * demostración. El pre-análisis real (comparar la respuesta del alumno contra la
 * verdad del caso, veredicto, nota y borrador) lo construye la infra de Eco en
 * apps/api (Sprint 5.3). Aquí queda el hueco listo y cableable a POST /ai/eco.
 */

import { useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { focusRing, softText } from '@/lib/studio/estilos';

type Mensaje = { id: number; de: 'docente' | 'eco'; texto: string };

const SUGERENCIAS = [
  'Resume los casos del Grupo B',
  '¿Cuáles valen para la Biblioteca?',
  '¿Qué veredicto sugieres y por qué?',
];

export function EcoRailValidacion({
  abierta,
  onAbrir,
  onCerrar,
}: {
  abierta: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
}) {
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
      {
        id: idE,
        de: 'eco',
        texto: `Eco (demostración): «${t}». El pre-análisis real —contra la verdad del caso, con veredicto y borrador— llega al conectar la infra de Eco (apps/api · RAG). Usted siempre firma.`,
      },
    ]);
    setN(idE);
    setPeticion('');
  }

  if (!abierta) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center gap-2.5 border-l border-border bg-card py-3.5">
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
      </aside>
    );
  }

  return (
    <aside
      aria-label="Eco"
      className="flex w-[360px] shrink-0 flex-col overflow-hidden border-l border-[color:var(--info-border)] bg-card"
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
        <span className="inline-flex h-[21px] items-center rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted-foreground">
          Demostración
        </span>
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
        {mensajes.length === 0 ? (
          <p className={`text-[12.5px] leading-relaxed ${softText}`}>
            Al conectarse, Eco pre-analiza cada caso contra la verdad del caso y le propone veredicto,
            nota y feedback. Nada se firma sin usted.
          </p>
        ) : (
          mensajes.map((m) =>
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
          )
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 pb-4 pt-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pedir(s)}
              className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="mt-2.5 flex h-11 items-center gap-2.5 rounded-full border border-border bg-muted px-4"
          onSubmit={(e) => {
            e.preventDefault();
            pedir(peticion);
          }}
        >
          <span className="sr-only">Pedirle trabajo a Eco</span>
          <input
            type="text"
            value={peticion}
            onChange={(e) => setPeticion(e.target.value)}
            placeholder="Pídale trabajo a Eco…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Enviar"
            className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
          >
            <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </aside>
  );
}
