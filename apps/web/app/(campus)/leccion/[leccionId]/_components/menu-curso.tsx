'use client';

/**
 * Menú del curso (rail derecho de la lección · §5A · mock leccion-lectura):
 * "Contenido del curso" con el contador `hechas/total` (el "6/15"), módulos como
 * acordeón que despliegan sus lecciones, con PALOMITA VERDE en lo completado y la
 * lección actual resaltada. Navega por <Link> a la misma ruta `/leccion/[id]` (o a la
 * de preview en el Studio), sin recargar. Hereda el tono del modo lectura (tokens).
 */

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
import { mono, kicker, focusRing } from '@/components/tokens';
import { INFO_TIPO_LECCION } from '@/lib/studio/leccion-tipos';
import type { ContenidoCurso } from '@/lib/campus/leccion-contrato';

export function MenuCurso({
  contenido,
  baseLeccion,
}: {
  contenido: ContenidoCurso;
  /** Prefijo de ruta: `/leccion` en el campus, `/studio/preview/leccion` en el Studio. */
  baseLeccion: string;
}) {
  // Abre por defecto el módulo de la lección actual (o el primero).
  const inicial = contenido.modulos.find((m) => m.actual)?.id ?? contenido.modulos[0]?.id ?? '';
  const [abierto, setAbierto] = useState(inicial);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
      <div className="flex items-baseline justify-between gap-3 border-b border-border p-5">
        <h2 className={`${kicker} text-muted-foreground`}>Contenido del curso</h2>
        <span className={`${mono} text-[11.5px] font-bold text-muted-foreground`}>
          {contenido.hechas}/{contenido.total}
        </span>
      </div>

      <div className="max-h-[calc(100dvh-200px)] overflow-y-auto">
        {contenido.modulos.map((m) => {
          const on = abierto === m.id;
          const hechas = m.lecciones.filter((l) => l.completada).length;
          const completo = m.lecciones.length > 0 && hechas === m.lecciones.length;
          return (
            <div key={m.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => setAbierto(on ? '' : m.id)}
                aria-expanded={on}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${focusRing} ${
                  on ? 'bg-muted' : 'hover:bg-muted'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    {completo && (
                      <Check aria-hidden className="h-3.5 w-3.5 text-accent-foreground" strokeWidth={2.4} />
                    )}
                    <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
                      {hechas}/{m.lecciones.length}
                    </span>
                  </span>
                  <span
                    className={`mt-1 block text-[13.5px] font-semibold leading-snug ${
                      m.actual ? 'text-foreground' : 'text-foreground'
                    }`}
                  >
                    {m.nombre}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={`mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground transition-transform ${
                    on ? 'rotate-180' : ''
                  }`}
                  strokeWidth={2}
                />
              </button>

              {on && (
                <ul className="pb-2">
                  {m.lecciones.length === 0 ? (
                    <li className="px-5 pb-3 text-[12.5px] leading-relaxed text-muted-foreground">
                      Este módulo aún no tiene lecciones.
                    </li>
                  ) : (
                    m.lecciones.map((l) => {
                      const ok = l.completada;
                      return (
                        <li key={l.id}>
                          <Link
                            href={`${baseLeccion}/${l.id}`}
                            aria-current={l.actual ? 'step' : undefined}
                            className={`flex w-full items-start gap-3 px-5 py-2.5 text-left transition-colors ${focusRing} ${
                              l.actual ? 'bg-accent' : 'hover:bg-muted'
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                                ok
                                  ? 'bg-primary text-primary-foreground'
                                  : l.actual
                                    ? 'border-2 border-secondary bg-card'
                                    : 'bg-[color:var(--track)]'
                              }`}
                            >
                              {ok && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block text-[13px] leading-snug ${
                                  l.actual ? 'font-bold text-accent-foreground' : 'font-medium text-foreground'
                                }`}
                              >
                                {l.nombre}
                              </span>
                              <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                                {INFO_TIPO_LECCION[l.tipo].rotulo}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
