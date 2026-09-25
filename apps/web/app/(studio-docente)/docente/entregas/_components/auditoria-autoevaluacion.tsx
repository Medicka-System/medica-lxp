'use client';

/**
 * Auditoría de una AUTOEVALUACIÓN (§5B) — fiel al mock. Se califica sola (opción
 * múltiple, sin Eco): el docente NO califica una por una, solo observa dónde falló el
 * grupo. Datos reales: acierto por pregunta objetiva + estadísticas del grupo. Un solo
 * color de atención: ÁMBAR para las preguntas por debajo del 60% (§5A).
 */

import { MonitorCheck, TriangleAlert } from 'lucide-react';
import { mono, kicker, softText, card } from '@/lib/studio/estilos';
import type { ActividadRef, AuditoriaAutoeval } from '../../../_lib/contrato';

export function AuditoriaAutoevaluacion({
  actividad,
  auditoria,
  grupoNombre,
}: {
  actividad: ActividadRef;
  auditoria: AuditoriaAutoeval;
  grupoNombre: string;
}) {
  const est = auditoria.estadisticas;
  const reprobadas = auditoria.preguntas.filter((p) => p.aciertoPct < 60);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 pb-8 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight">Autoevaluación · {actividad.clave}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {grupoNombre} · {actividad.titulo} · {auditoria.preguntas.length} preguntas de opción múltiple ·{' '}
            {auditoria.contestada}
          </p>
        </div>
        <span className="ml-auto inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-3 text-[11.5px] font-bold text-accent-foreground">
          <MonitorCheck aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          La califica el sistema · sin Eco
        </span>
      </div>

      <div className={`${card} mt-4 flex flex-wrap items-center gap-3 px-[18px] py-3.5`}>
        <p className={`min-w-[280px] flex-1 text-[12.5px] leading-relaxed ${softText}`}>
          <span className="font-bold text-foreground">No tiene que calificarlas.</span> Son objetivas: el sistema
          las corrigió al enviarse y la nota ya está en el expediente del alumno. Lo único que le toca es mirar
          dónde falló el grupo.
        </p>
        {est && (
          <span className="flex shrink-0 items-stretch gap-5">
            {(
              [
                ['Promedio', est.promedio.toFixed(1)],
                ['Mediana', est.mediana.toFixed(1)],
                ['Más baja', est.masBaja.toFixed(1)],
                ['Más alta', est.masAlta.toFixed(1)],
              ] as const
            ).map(([r, v]) => (
              <span key={r} className="text-right">
                <span className={`${kicker} block text-[9.5px] tracking-[0.12em] text-muted-foreground`}>{r}</span>
                <span className={`${mono} mt-1 block text-[20px] font-extrabold`}>{v}</span>
              </span>
            ))}
          </span>
        )}
      </div>

      {reprobadas.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-2.5">
          <TriangleAlert aria-hidden className="h-4 w-4 shrink-0 text-[color:var(--warning-foreground)]" strokeWidth={2} />
          <p className="min-w-[280px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
            <span className="font-bold">
              {reprobadas.length === 1
                ? 'Una pregunta la reprobó el grupo'
                : `${reprobadas.length} preguntas las reprobó el grupo`}
            </span>{' '}
            — la {reprobadas.map((p) => Number(p.n)).join(', la ')}. Vale repasarlo en la próxima clase.
          </p>
        </div>
      )}

      <section className={`${card} mt-4 overflow-hidden`}>
        <div className="flex items-center gap-3.5 px-[18px] py-3.5">
          <h2 className={`${kicker} text-muted-foreground`}>Aciertos por pregunta</h2>
          <span className={`${kicker} ml-auto w-[150px] text-[9.5px] tracking-[0.12em] text-muted-foreground`}>
            Acierto del grupo
          </span>
          <span className={`${kicker} w-[110px] text-right text-[9.5px] tracking-[0.12em] text-muted-foreground`}>
            Aciertos
          </span>
        </div>
        {auditoria.preguntas.length === 0 ? (
          <p className="border-t border-border px-[18px] py-6 text-center text-[12.5px] italic text-muted-foreground">
            Aún no hay respuestas para auditar.
          </p>
        ) : (
          auditoria.preguntas.map((p) => {
            const bajo = p.aciertoPct < 60;
            return (
              <div
                key={p.n}
                className={`flex items-center gap-3.5 border-t border-border px-[18px] py-3 ${
                  bajo ? 'bg-[color:var(--warning-surface)]' : ''
                }`}
              >
                <span
                  aria-hidden
                  className={`${mono} grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${
                    bajo ? 'bg-card text-[color:var(--warning-foreground)]' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {p.n}
                </span>
                <span
                  className={`min-w-0 flex-1 text-[13px] leading-snug ${
                    bajo ? 'font-semibold text-[color:var(--warning-foreground)]' : `font-medium ${softText}`
                  }`}
                >
                  {p.texto}
                </span>
                <span className="flex w-[150px] shrink-0 items-center gap-2.5">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                    <span
                      className={`block h-full rounded-full ${bajo ? 'bg-[color:var(--warning)]' : 'bg-primary'}`}
                      style={{ width: `${p.aciertoPct}%` }}
                    />
                  </span>
                  <span
                    className={`${mono} shrink-0 text-[12px] font-bold ${
                      bajo ? 'text-[color:var(--warning-foreground)]' : 'text-foreground'
                    }`}
                  >
                    {p.aciertoPct}%
                  </span>
                </span>
                <span className={`${mono} w-[110px] shrink-0 text-right text-[11.5px] text-muted-foreground`}>
                  {p.aciertos}
                </span>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
