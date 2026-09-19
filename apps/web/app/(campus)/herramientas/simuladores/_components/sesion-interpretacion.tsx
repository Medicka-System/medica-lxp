'use client';

import { useState, useTransition } from 'react';
import { Sparkles, X } from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing, tramaEstilo } from '@/components/tokens';
import { enviarInterpretacion } from '../_acciones';
import { labelDominio, type CasoPresentacion, type ResultadoSesion } from '../_contrato';
import { FeedbackVista } from './feedback-vista';

type Seguridad = 'Poco' | 'Algo' | 'Mucho';

/**
 * Sesión de INTERPRETACIÓN (§7A · Sprint 7): presenta el caso (visor + viñeta, SIN
 * diagnóstico) → el alumno describe hallazgos y concluye → Eco evalúa contra la verdad
 * del caso y devuelve feedback formativo. Tono de entrenar con un mentor, no de examen.
 */
export function SesionInterpretacion({
  caso,
  onSalir,
}: {
  caso: CasoPresentacion;
  onSalir: () => void;
}) {
  const [hallazgos, setHallazgos] = useState('');
  const [impresion, setImpresion] = useState('');
  const [seguridad, setSeguridad] = useState<Seguridad>('Algo');
  const [resultado, setResultado] = useState<ResultadoSesion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const enviar = () => {
    setError(null);
    iniciar(async () => {
      const r = await enviarInterpretacion({ casoId: caso.id, hallazgos, impresion, seguridad });
      if (r.ok) setResultado(r.resultado);
      else setError(r.error);
    });
  };

  const reintentar = () => {
    setResultado(null);
    setError(null);
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
          <p className={`${kicker} text-secondary`}>
            Simulador de interpretación{resultado ? ' · resultado' : ''}
          </p>
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
          {!resultado ? (
            <>
              <div className={`${card} overflow-hidden`}>
                <div
                  aria-hidden
                  className="relative grid h-[280px] place-items-center sm:h-[420px]"
                  style={{ background: 'var(--wave-0)' }}
                >
                  <div className="absolute inset-0" style={{ background: tramaEstilo }} />
                  <span
                    className={`relative ${mono} px-3 text-center text-[10.5px] uppercase tracking-[0.14em]`}
                    style={{ color: 'var(--hero-ink-muted)' }}
                  >
                    visor DICOM · {caso.area}
                  </span>
                  <span
                    className={`absolute bottom-3.5 left-3.5 ${mono} text-[10px] leading-[1.7]`}
                    style={{ color: 'var(--hero-ink-muted)' }}
                  >
                    <span className="block">sin diagnóstico a la vista</span>
                  </span>
                </div>
              </div>

              <section className={`${card} p-5`}>
                <p className={`${kicker} text-muted-foreground`}>Contexto del caso</p>
                <p className={`mt-3 text-[14.5px] leading-[1.7] ${softText}`}>{caso.vineta}</p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {['I-AIM Interpretación', caso.dificultad].map((t) => (
                    <span
                      key={t}
                      className={`inline-flex h-[26px] items-center rounded-full border border-border bg-muted px-3 text-[11.5px] font-semibold ${softText}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <FeedbackVista feedback={resultado.feedback} />
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          {!resultado ? (
            <section className={`${card} p-5`}>
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-sidebar text-primary"
                >
                  <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-[15.5px] font-extrabold tracking-[-0.01em]">Tu lectura</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">Describe lo que ves antes de concluir</p>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="block text-[11.5px] font-semibold">Hallazgos</span>
                <textarea
                  rows={7}
                  value={hallazgos}
                  onChange={(e) => setHallazgos(e.target.value)}
                  placeholder="Menciona plano, medida y lado."
                  className="mt-[7px] w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
                />
              </label>

              <label className="mt-4 block">
                <span className="block text-[11.5px] font-semibold">Tu impresión diagnóstica</span>
                <input
                  type="text"
                  value={impresion}
                  onChange={(e) => setImpresion(e.target.value)}
                  className="mt-[7px] h-12 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14.5px] font-semibold text-foreground outline-none transition-colors focus:border-secondary"
                />
              </label>

              <fieldset className="mt-4 border-0 p-0">
                <legend className="p-0 text-[11.5px] font-semibold">¿Qué tan seguro estás?</legend>
                <div className="mt-[7px] flex gap-1.5">
                  {(['Poco', 'Algo', 'Mucho'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeguridad(s)}
                      aria-pressed={seguridad === s}
                      className={`h-11 flex-1 rounded-[10px] border text-[13px] font-semibold transition-colors ${focusRing} ${
                        seguridad === s
                          ? 'border-transparent bg-accent text-accent-foreground'
                          : `border-border bg-card ${softText}`
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </fieldset>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-2.5 text-[12.5px] font-medium text-[color:var(--warning-foreground)]"
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={enviar}
                disabled={pendiente || (!hallazgos.trim() && !impresion.trim())}
                className={`mt-5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
              >
                {pendiente ? 'Evaluando…' : 'Enviar mi lectura'}
              </button>
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                Al enviarla verás la verdad del caso y el tutor te explicará las diferencias.
              </p>
            </section>
          ) : (
            <>
              <section className={`${card} p-5`}>
                <p className={`${kicker} text-muted-foreground`}>Sigue el entrenamiento</p>
                <div className="mt-3.5 flex gap-2">
                  <button
                    type="button"
                    onClick={reintentar}
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
                <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
                  Tu avance se guardó. Puedes elegir otro caso cuando quieras.
                </p>
              </section>

              {resultado.dominioIaim && (
                <section className={`${card} p-5`}>
                  <p className={`${kicker} text-muted-foreground`}>Efecto en tu competencia</p>
                  <p className={`mt-3 text-[13.5px] leading-relaxed ${softText}`}>
                    Esta práctica quedó registrada en <span className="font-bold">{labelDominio(caso.dominio)}</span>.{' '}
                    {resultado.repasoJobId
                      ? 'Programamos un repaso del tema según tu curva de olvido.'
                      : 'Cuando acumules práctica en este dominio, agendaremos su repaso.'}
                  </p>
                </section>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
