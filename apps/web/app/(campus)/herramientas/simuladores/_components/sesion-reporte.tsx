'use client';

import { useState, useTransition } from 'react';
import { Sparkles, X } from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing, tramaEstilo } from '@/components/tokens';
import { enviarReporte } from '../_acciones';
import {
  CRITERIOS_REPORTE,
  SECCIONES_REPORTE_DEFAULT,
  labelDominio,
  type CasoPresentacion,
  type ResultadoSesion,
} from '../_contrato';
import { FeedbackVista } from './feedback-vista';

/**
 * Sesión de REPORTE (§7A · Sprint 7): presenta el estudio → el alumno redacta el
 * reporte por secciones (esqueleto placeholder hasta las plantillas por estudio) →
 * Eco revisa estructura, mediciones y omisiones, y devuelve feedback. Reusa el mismo
 * patrón de redacción del generador de reportes (§6.5), en modo práctica.
 */
export function SesionReporte({ caso, onSalir }: { caso: CasoPresentacion; onSalir: () => void }) {
  const [secciones, setSecciones] = useState<Record<string, string>>(() =>
    Object.fromEntries(SECCIONES_REPORTE_DEFAULT.map((t) => [t, ''])),
  );
  const [resultado, setResultado] = useState<ResultadoSesion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const algoEscrito = Object.values(secciones).some((t) => t.trim());

  const enviar = () => {
    setError(null);
    iniciar(async () => {
      const r = await enviarReporte({
        casoId: caso.id,
        secciones: SECCIONES_REPORTE_DEFAULT.map((titulo) => ({ titulo, texto: secciones[titulo] ?? '' })),
      });
      if (r.ok) setResultado(r.resultado);
      else setError(r.error);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className={`${card} flex flex-wrap items-center gap-4 px-5 py-3.5`}>
        <button
          type="button"
          onClick={onSalir}
          aria-label="Salir del entrenamiento"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </button>
        <div className="min-w-0">
          <p className={`${kicker} text-secondary`}>Simulador de reporte{resultado ? ' · resultado' : ''}</p>
          <p className="mt-0.5 text-[15px] font-bold leading-snug">{caso.titulo}</p>
        </div>
        <span
          className={`ml-auto inline-flex h-[30px] items-center rounded-full bg-muted px-3 text-[12px] font-semibold ${softText}`}
        >
          {caso.area} · {labelDominio(caso.dominio)}
        </span>
      </div>

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className={`${card} overflow-hidden`}>
            <div
              aria-hidden
              className="relative grid h-[240px] place-items-center"
              style={{ background: 'var(--wave-0)' }}
            >
              <div className="absolute inset-0" style={{ background: tramaEstilo }} />
              <span
                className={`relative ${mono} px-3 text-center text-[10.5px] uppercase tracking-[0.14em]`}
                style={{ color: 'var(--hero-ink-muted)' }}
              >
                visor DICOM · estudio completo
              </span>
            </div>
          </div>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>El estudio que te tocó</p>
            <p className={`mt-2.5 text-[14.5px] leading-[1.7] ${softText}`}>{caso.vineta}</p>
          </section>

          {!resultado ? (
            <>
              <div className="flex flex-col gap-3">
                {SECCIONES_REPORTE_DEFAULT.map((titulo, i) => (
                  <section key={titulo} className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-bold leading-snug">{titulo}</span>
                        <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>
                          sección {i + 1}
                        </span>
                      </span>
                    </div>
                    <div className="p-4">
                      <textarea
                        rows={2}
                        value={secciones[titulo] ?? ''}
                        onChange={(e) => setSecciones((s) => ({ ...s, [titulo]: e.target.value }))}
                        placeholder="Redacta esta sección como en un reporte real."
                        className="w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-[13.5px] leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
                      />
                    </div>
                  </section>
                ))}
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-2.5 text-[12.5px] font-medium text-[color:var(--warning-foreground)]"
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={enviar}
                disabled={pendiente || !algoEscrito}
                className={`inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
              >
                {pendiente ? 'Revisando…' : 'Enviar mi reporte a revisión'}
              </button>
            </>
          ) : (
            <FeedbackVista feedback={resultado.feedback} />
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <section className={`${card} p-5`}>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-sidebar text-primary"
              >
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-[15.5px] font-extrabold tracking-[-0.01em]">Qué revisa el tutor</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Estructura, medidas, omisiones e impresión</p>
              </div>
            </div>
            <dl className="mt-4 flex flex-col gap-3">
              {CRITERIOS_REPORTE.map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-24 shrink-0 text-[12.5px] font-semibold">{k}</dt>
                  <dd className="min-w-0 text-[12.5px] leading-snug text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-border pt-3.5 text-[12px] leading-relaxed text-muted-foreground">
              Las plantillas por tipo de estudio se afinan con tu escuela; por ahora entrenas con un
              esqueleto general.
            </p>
          </section>

          {resultado && (
            <section className={`${card} p-5`}>
              <p className={`${kicker} text-muted-foreground`}>Sigue el entrenamiento</p>
              <div className="mt-3.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResultado(null);
                    setError(null);
                  }}
                  className={`h-11 flex-1 rounded-[10px] border border-border bg-card text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={onSalir}
                  className={`h-11 flex-1 rounded-[10px] border border-border bg-card text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Terminar
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
