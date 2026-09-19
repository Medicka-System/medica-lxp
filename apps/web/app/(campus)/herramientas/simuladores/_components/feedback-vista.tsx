'use client';

import { AlertCircle, Check, Sparkles } from 'lucide-react';
import { mono, kickerWide as kicker, softText, card } from '@/components/tokens';
import type { FeedbackItem, SimuladorFeedback } from '../_contrato';

/**
 * Vista de FEEDBACK del tutor (Eco) tras una sesión (§7A · Sprint 7). Compartida por
 * interpretación y reporte. Traduce la propuesta de Eco a lenguaje de mentor: puntaje
 * que acompaña (la frase manda), aciertos/omisiones/precisiones, la lectura de
 * referencia y el diagnóstico revelado. Es entrenamiento, no calificación.
 */

const BLOQUES = {
  aciertos: {
    titulo: 'Lo que acertaste',
    caja: 'bg-accent',
    tinta: 'text-accent-foreground',
    punto: 'bg-primary',
    icono: Check,
    iconoCaja: 'bg-primary text-[color:var(--sidebar)]',
  },
  omisiones: {
    titulo: 'Lo que omitiste',
    caja: 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]',
    tinta: 'text-[color:var(--warning-foreground)]',
    punto: 'bg-[color:var(--warning)]',
    icono: AlertCircle,
    iconoCaja: 'bg-[color:var(--warning)] text-white',
  },
  precisiones: {
    titulo: 'Lo que conviene precisar',
    caja: 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)]',
    tinta: 'text-[color:var(--info-foreground)]',
    punto: 'bg-[color:var(--info)]',
    icono: AlertCircle,
    iconoCaja: 'bg-[color:var(--info)] text-white',
  },
} as const;

function Bloque({ tipo, items }: { tipo: keyof typeof BLOQUES; items: FeedbackItem[] }) {
  if (items.length === 0) return null;
  const b = BLOQUES[tipo];
  const Icono = b.icono;
  return (
    <section className={`rounded-xl p-5 ${b.caja}`}>
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${b.iconoCaja}`}>
          <Icono className="h-[15px] w-[15px]" strokeWidth={2.4} />
        </span>
        <p className={`text-[14.5px] font-extrabold tracking-[-0.01em] ${b.tinta}`}>{b.titulo}</p>
        <span className={`${mono} ml-auto text-[12px] font-bold ${b.tinta}`}>{items.length}</span>
      </div>
      <ul className="mt-3.5 flex flex-col gap-3">
        {items.map((i, idx) => (
          <li key={`${i.titulo}-${idx}`} className="flex gap-3">
            <span aria-hidden className={`mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full ${b.punto}`} />
            <span className="min-w-0">
              <span className="block text-[14px] font-bold leading-snug">{i.titulo}</span>
              {i.detalle && (
                <span className={`mt-0.5 block text-[13.5px] leading-relaxed ${softText}`}>{i.detalle}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FeedbackVista({ feedback }: { feedback: SimuladorFeedback }) {
  const f = feedback;
  return (
    <div className="flex flex-col gap-5">
      {/* resultado: la frase manda, el puntaje acompaña */}
      <section className="relative overflow-hidden rounded-2xl p-6" style={{ background: 'var(--secondary)' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 150% at 90% 0%, rgba(83,195,190,.55) 0%, rgba(26,136,128,0) 62%)',
          }}
        />
        <div className="relative flex flex-wrap items-center gap-7">
          <div className="flex items-end gap-2.5">
            <span
              className={`${mono} text-[50px] font-extrabold leading-none tracking-[-0.03em]`}
              style={{ color: 'var(--hero-ink)' }}
            >
              {f.puntaje ?? '—'}
            </span>
            <span className={`${mono} pb-1.5 text-[15px] font-semibold`} style={{ color: 'var(--hero-ink-soft, #bff0ed)' }}>
              / 100
            </span>
          </div>
          <div className="min-w-[300px] flex-1 basis-[300px]">
            <p className="text-[18px] font-extrabold leading-snug tracking-[-0.015em]" style={{ color: 'var(--hero-ink)' }}>
              {f.titular}
            </p>
            <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed" style={{ color: 'var(--hero-ink-soft, #eafaf9)' }}>
              {f.resumen}
            </p>
          </div>
        </div>
      </section>

      <Bloque tipo="aciertos" items={f.aciertos} />
      <Bloque tipo="omisiones" items={f.omisiones} />
      <Bloque tipo="precisiones" items={f.precisiones} />

      <section className={`${card} p-5`}>
        <p className={`${kicker} text-muted-foreground`}>Cómo lo leería tu docente</p>
        <p className={`mt-3 max-w-[70ch] text-[15px] leading-[1.75] ${softText}`}>{f.lecturaDocente}</p>
        {f.diagnostico && (
          <div className="mt-4 border-t border-border pt-4">
            <p className={`${kicker} text-secondary`}>Diagnóstico del caso</p>
            <p className="mt-2 text-[16px] font-bold leading-relaxed">{f.diagnostico}</p>
          </div>
        )}
        {f.puntosAprendizaje.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className={`${kicker} text-muted-foreground`}>Puntos de aprendizaje</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {f.puntosAprendizaje.map((p, i) => (
                <li key={i} className={`flex gap-2 text-[13.5px] leading-relaxed ${softText}`}>
                  <span aria-hidden className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-secondary" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Traza honesta: Eco propone; en MOCK el feedback es de andamio (§7A). */}
      <div className="flex items-start gap-2.5 rounded-[11px] border border-border bg-muted px-4 py-3">
        <Sparkles aria-hidden className="mt-px h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {f.eco.mock
            ? 'El tutor corrió en MODO DEMO (sin modelo real): el feedback es de andamio. Al conectar el modelo, evaluará con criterio clínico.'
            : `Evaluado por Eco (${f.eco.modelo ?? f.eco.proveedor}). Eco propone; tu docente es la fuente de verdad.`}
        </p>
      </div>
    </div>
  );
}
