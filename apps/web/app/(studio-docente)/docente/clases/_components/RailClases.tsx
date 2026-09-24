'use client';

/**
 * Rail derecho: Eco ligero (PLACEHOLDER · §7A — sin endpoint ni conexión; solo el
 * espacio donde vivirá) y el resumen del mes (clases dadas, asistencia media, horas en
 * vivo, grabaciones ligadas). Eco se conecta al final en todas las secciones.
 */

import { Plus, Send } from 'lucide-react';
import { mono, kicker, softText, card, focusRing, EcoMark } from './ui';
import type { ClasesData } from './tipos';

export type RailClasesProps = {
  resumenMes: ClasesData['resumenMes'];
  eco: ClasesData['eco'];
  mesActual: string;
  setProgramando: (v: boolean) => void;
  onPreguntarEco: (q: string) => void;
};

export function RailClases({ resumenMes, eco, mesActual, setProgramando, onPreguntarEco }: RailClasesProps) {
  const tituloMes = `Su ${mesActual}`;
  return (
    <div className="min-w-0">
      <section className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
          <EcoMark size={32} invertido />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold leading-tight">Eco</p>
            <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">Sobre sus clases</p>
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="flex justify-end">
            <p className="max-w-[88%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
              {eco.respuesta.pregunta}
            </p>
          </div>

          <div className="mt-3 flex gap-2.5">
            <EcoMark size={26} />
            <div className="min-w-0 flex-1">
              <p className={`text-[12.5px] leading-relaxed ${softText}`}>{eco.respuesta.intro}</p>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {eco.respuesta.temas.map((t) => (
                  <li
                    key={t.fecha}
                    className="flex items-center gap-2.5 rounded-[9px] border border-border px-2.5 py-2"
                  >
                    <span className={`${mono} shrink-0 text-[10.5px] font-bold text-muted-foreground`}>
                      {t.fecha}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{t.tema}</span>
                    <span className={`${mono} shrink-0 text-[10.5px] font-bold text-secondary`}>
                      {t.asistencia}
                    </span>
                  </li>
                ))}
              </ul>
              <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>{eco.respuesta.remate}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {eco.respuesta.acciones.map((a) => (
                  <button
                    key={a.etiqueta}
                    type="button"
                    onClick={() => (a.primaria ? setProgramando(true) : onPreguntarEco(a.etiqueta))}
                    className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-[12px] font-semibold transition-colors ${focusRing} ${
                      a.primaria
                        ? 'bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
                        : 'border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {a.primaria && <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />}
                    {a.etiqueta}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-4 pb-3.5 pt-3">
          <div className="flex gap-1.5 overflow-x-auto">
            {eco.sugerencias.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPreguntarEco(s)}
                className={`h-[30px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
              >
                {s}
              </button>
            ))}
          </div>
          <form
            className="mt-2.5 flex h-10 items-center gap-2.5 rounded-full border border-border bg-muted px-3.5"
            onSubmit={(e) => e.preventDefault()}
          >
            <span className="sr-only">Pregúntele a Eco sobre sus clases</span>
            <input
              type="text"
              placeholder="Pregúntele a Eco sobre sus clases…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              aria-label="Enviar"
              className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
            >
              <Send aria-hidden className="h-3 w-3" strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </section>

      <section className={`${card} mt-4 p-5`}>
        <p className={`${kicker} text-muted-foreground`}>{tituloMes}</p>
        <ul className="mt-3.5 flex flex-col gap-3">
          {resumenMes.map((r) => (
            <li key={r.titulo} className="flex items-baseline gap-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold">{r.titulo}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{r.detalle}</span>
              </span>
              <span className={`${mono} shrink-0 text-[17px] font-extrabold tracking-[-0.02em]`}>
                {r.valor}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
