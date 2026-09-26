'use client';

/**
 * <ChatEco> — chat conversacional de Eco (§7A), cableado a la API real
 * (`POST /ai/eco` vía la server action `preguntarAEco`). Evoluciona el antiguo
 * EcoPanel placeholder: mismo lenguaje visual (info/violeta · §5A) pero con respuestas
 * REALES que usan herramientas (datos del alumno bajo RLS + RAG) — Eco no inventa.
 *
 * Superficie-agnóstica por props (`surface`/`entidadId`): hoy el expediente del alumno;
 * las otras 4 surfaces reusan este mismo componente. Historial LOCAL/transitorio (no se
 * persiste · §7A). READ-ONLY: Eco informa, no acciona.
 */

import { useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { softText, focusRing } from '@/components/tokens';
import { EcoMark } from './eco-mark';
import { preguntarAEco } from '@/lib/eco/chat.server';
import type { FuenteEco, TurnoEco } from '@/lib/eco/tipos';

type Burbuja = {
  id: number;
  de: 'usuario' | 'eco';
  texto: string;
  fuentes?: FuenteEco[];
  tools?: string[];
};

/** Etiqueta legible para una fuente citada por Eco (RAG o caso). */
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

export function ChatEco({
  surface,
  entidadId,
  intro,
  sugerencias = [],
}: {
  surface: 'alumno';
  entidadId: string;
  /** Texto de encuadre mientras no hay conversación. */
  intro: string;
  sugerencias?: string[];
}) {
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contador = useRef(0);

  async function enviar(pregunta: string) {
    const t = pregunta.trim();
    if (!t || pensando) return;
    setError(null);
    setTexto('');

    const idU = ++contador.current;
    const nuevas: Burbuja[] = [...burbujas, { id: idU, de: 'usuario', texto: t }];
    setBurbujas(nuevas);
    setPensando(true);

    // El historial que viaja: solo texto (usuario/eco), en orden (stateless en el api).
    const historial: TurnoEco[] = nuevas.map((b) => ({
      rol: b.de === 'usuario' ? 'usuario' : 'eco',
      texto: b.texto,
    }));

    const r = await preguntarAEco({ surface, entidadId, mensajes: historial });
    setPensando(false);

    if (!r.ok) {
      setError(r.error);
      return;
    }
    setBurbujas((prev) => [
      ...prev,
      {
        id: ++contador.current,
        de: 'eco',
        texto: r.texto,
        fuentes: r.fuentes,
        tools: r.toolsUsados,
      },
    ]);
  }

  return (
    <section className="overflow-hidden rounded-[12px] border border-[color:var(--info-border)] bg-card shadow-rest">
      <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
        <EcoMark size={32} invertido />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-tight">Eco</p>
          <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">Sobre este alumno</p>
        </div>
        <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-card px-2 text-[10px] font-bold text-[color:var(--info-foreground)]">
          Propone · usted confirma
        </span>
      </div>

      <div className="px-4 py-3.5">
        {burbujas.length === 0 ? (
          <p className={`text-[12.5px] leading-relaxed ${softText}`}>{intro}</p>
        ) : (
          <div className="flex max-h-[360px] flex-col gap-3 overflow-y-auto">
            {burbujas.map((b) =>
              b.de === 'usuario' ? (
                <div key={b.id} className="flex justify-end">
                  <p className="max-w-[84%] rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-sidebar-foreground">
                    {b.texto}
                  </p>
                </div>
              ) : (
                <div key={b.id} className="flex gap-2.5">
                  <EcoMark size={28} />
                  <div className="min-w-0 flex-1">
                    <p className={`whitespace-pre-wrap text-[13px] leading-relaxed ${softText}`}>{b.texto}</p>
                    {b.fuentes && b.fuentes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {b.fuentes.map((f, i) => (
                          <span
                            key={`${f.tipo}-${f.id ?? i}`}
                            className="inline-flex h-[22px] items-center rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold text-muted-foreground"
                          >
                            {rotuloFuente(f)}
                          </span>
                        ))}
                      </div>
                    )}
                    {b.tools && b.tools.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        Consultó: {[...new Set(b.tools)].join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}
            {pensando && (
              <div className="flex items-center gap-2.5">
                <EcoMark size={28} />
                <p className="text-[12.5px] italic text-muted-foreground">Eco está consultando los datos…</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[11.5px] text-[color:var(--destructive-foreground)]">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-border px-4 pb-3.5 pt-3">
        {sugerencias.length > 0 && burbujas.length === 0 && (
          <div className="mb-2.5 flex gap-1.5 overflow-x-auto">
            {sugerencias.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pensando}
                onClick={() => enviar(s)}
                className={`inline-flex h-[30px] shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] disabled:opacity-60 ${softText} ${focusRing}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex h-10 items-center gap-2.5 rounded-full border border-border bg-muted px-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <span className="sr-only">Preguntarle a Eco sobre este alumno</span>
          <input
            type="text"
            value={texto}
            disabled={pensando}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pregúntale a Eco sobre este alumno…"
            className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pensando || !texto.trim()}
            aria-label="Enviar a Eco"
            className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white disabled:opacity-50 ${focusRing}`}
          >
            <Send aria-hidden className="h-3 w-3" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </section>
  );
}
