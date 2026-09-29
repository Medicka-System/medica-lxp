'use client';

/**
 * Curso · FOROS — los foros de este curso donde el alumno publicó (RLS · foro_mensajes).
 * Acordeón: colapsado muestra lección/título/resumen; abierto, "Mi publicación" y el hilo
 * en cadena. "Abrir el foro" lleva al foro real de la lección. "N nuevas" no existe (sin
 * read-receipt) → no se muestra.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown, MessagesSquare } from 'lucide-react';
import type { ForoParticipado, Respuesta } from '../_components/curso';
import { Avatar, CabeceraPagina, Chip, Segmentado, card, focusRing, mono, softText } from '../_components/curso';

function RespuestaHilo({ r }: { r: Respuesta }) {
  return (
    <div className="flex gap-2.5" style={{ marginLeft: r.nivel * 28, paddingLeft: r.nivel ? 14 : 0, borderLeft: r.nivel ? '2px solid var(--border)' : undefined }}>
      <Avatar ini={r.ini} size={30} staff={r.docente} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] font-bold">{r.autor}</span>
          {r.docente && <Chip tono="navy">Docente</Chip>}
          <span className={`${mono} text-[10.5px] text-muted-foreground`}>{r.cuando}</span>
        </p>
        <p className={`mt-1 text-[13px] leading-relaxed ${softText}`}>{r.texto}</p>
      </div>
    </div>
  );
}

export function ForosVista({
  contexto,
  miIni,
  foros,
}: {
  contexto: string;
  miIni: string;
  foros: ForoParticipado[];
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<'todos' | 'nuevas'>('todos');
  const [abierto, setAbierto] = useState<string | null>(foros[0]?.id ?? null);
  const visibles = foros.filter((f) => filtro === 'todos' || f.nuevas > 0);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina titulo="Foros" contexto={contexto} sub="Los foros en los que participó, con sus hilos de respuesta." />
      <Segmentado
        valor={filtro}
        onCambio={setFiltro}
        opciones={[
          { id: 'todos', etiqueta: 'Todos', n: foros.length },
          { id: 'nuevas', etiqueta: 'Con respuestas nuevas', n: foros.filter((f) => f.nuevas > 0).length },
        ]}
      />

      {foros.length === 0 ? (
        <div className={`${card} px-6 py-14 text-center text-[13px] text-muted-foreground`}>Aún no ha participado en ningún foro de este curso.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibles.map((f) => {
            const on = abierto === f.id;
            return (
              <article key={f.id} className={`${card} overflow-hidden`}>
                <button
                  type="button"
                  onClick={() => setAbierto(on ? null : f.id)}
                  aria-expanded={on}
                  className={`flex w-full items-center gap-3.5 px-[18px] py-4 text-left transition-colors hover:bg-muted ${focusRing}`}
                >
                  <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
                    <MessagesSquare className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{f.leccion}</span>
                    <span className="mt-1 block text-[14.5px] font-bold">{f.titulo}</span>
                    <span className={`${mono} mt-1 block text-[11.5px] text-muted-foreground`}>{f.resumen}</span>
                  </span>
                  {f.nuevas > 0 && <Chip tono="ok">{f.nuevas === 1 ? '1 nueva' : `${f.nuevas} nuevas`}</Chip>}
                  <ChevronDown aria-hidden className={`h-[17px] w-[17px] shrink-0 text-muted-foreground transition-transform ${on ? 'rotate-180' : ''}`} strokeWidth={2} />
                </button>

                {on && (
                  <div className="border-t border-border px-[18px] pb-[18px] pt-1">
                    {f.miPublicacion && (
                      <div className="mt-3.5 rounded-[11px] border border-primary bg-accent p-3.5">
                        <p className="flex items-center gap-2">
                          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[10px] font-bold text-[color:var(--sidebar)]">{miIni}</span>
                          <span className="text-[12.5px] font-bold">Mi publicación</span>
                          <span className={`${mono} text-[10.5px] text-secondary`}>{f.miPublicacion.cuando}</span>
                        </p>
                        <p className={`mt-2 text-[13px] leading-relaxed ${softText}`}>{f.miPublicacion.texto}</p>
                      </div>
                    )}
                    <div className="mt-4 flex flex-col gap-3.5">
                      {(f.hilo ?? []).map((r) => (
                        <RespuestaHilo key={r.id} r={r} />
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-3.5">
                      <span className="text-[12px] text-muted-foreground">Hilo completo en la lección</span>
                      <button
                        type="button"
                        onClick={() => router.push(`/foro/${f.id}`)}
                        className={`ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-bold text-secondary ${focusRing}`}
                      >
                        Abrir el foro
                        <ArrowRight aria-hidden className="h-[13px] w-[13px]" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
