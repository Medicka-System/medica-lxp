'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Clock, Eye, FileText, Play } from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import {
  labelDominio,
  type CasoPresentacion,
  type CasoSim,
  type Desempeno,
  type Dificultad,
  type SimuladoresData,
  type TipoSim,
} from '../_contrato';
import { SesionInterpretacion } from './sesion-interpretacion';
import { SesionReporte } from './sesion-reporte';

const claseNivel: Record<Dificultad, string> = {
  Básico: 'bg-accent text-accent-foreground',
  Intermedio: 'border border-border bg-muted text-[color:var(--foreground-soft)]',
  Avanzado:
    'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
};

const tonoBarra: Record<Desempeno['tono'], string> = {
  bien: 'var(--primary)',
  aviso: 'var(--warning)',
  neutro: 'var(--hero-ink-muted)',
};

/** Presentación (sin verdad) que arranca la sesión, derivada del caso del catálogo. */
function presentacionDe(caso: CasoSim): CasoPresentacion {
  return {
    id: caso.id,
    titulo: caso.titulo,
    area: caso.area,
    dominio: caso.dominio,
    dificultad: caso.dificultad,
    vineta:
      `Practica sobre "${caso.titulo}"` +
      (caso.area ? ` (${caso.area})` : '') +
      '. Describe lo que ves y concluye; el tutor comparará tu lectura contra la verdad del ' +
      'caso. El contexto clínico detallado se enriquece con la curación del docente.',
  };
}

/**
 * Catálogo de simuladores del alumno (§7A · Sprint 7). Muestra el entrenamiento previo
 * (real, de `sesiones_simulador`), los repasos pendientes y el banco curado; al elegir
 * un caso lanza la sesión (interpretación o reporte). El feedback lo produce Eco en el
 * `api` (MOCK por defecto) — aquí no hay lógica de evaluación.
 */
export function SimuladoresCliente({ data }: { data: SimuladoresData }) {
  const { practicados, ultimaSesion, desempeno, repasos, disponibles, areas, casos } = data;
  const [tipo, setTipo] = useState<TipoSim>('interpretacion');
  const [area, setArea] = useState('Todas las áreas');
  const [dificultad, setDificultad] = useState('Todas');
  const [sesion, setSesion] = useState<{ tipo: TipoSim; caso: CasoPresentacion } | null>(null);

  const visibles = useMemo(
    () =>
      casos.filter((c) => {
        if (area !== 'Todas las áreas' && c.area !== area) return false;
        if (dificultad !== 'Todas' && c.dificultad !== dificultad) return false;
        return true;
      }),
    [casos, area, dificultad],
  );

  const iniciar = (t: TipoSim, caso: CasoSim) => setSesion({ tipo: t, caso: presentacionDe(caso) });

  if (sesion?.tipo === 'interpretacion')
    return <SesionInterpretacion caso={sesion.caso} onSalir={() => setSesion(null)} />;
  if (sesion?.tipo === 'reporte')
    return <SesionReporte caso={sesion.caso} onSalir={() => setSesion(null)} />;

  const sinCasos = casos.length === 0;
  const primerCaso = casos[0];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold tracking-[-0.015em]">Simuladores</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Entrena con casos ya validados; el tutor compara tu lectura contra la verdad del caso.
          </p>
        </div>
        {primerCaso && (
          <button
            type="button"
            onClick={() => iniciar(tipo, primerCaso)}
            className={`ml-auto inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Play aria-hidden className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} />
            {practicados > 0 ? 'Seguir entrenando' : 'Empezar a entrenar'}
          </button>
        )}
      </div>

      {/* su entrenamiento + repasos */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl p-7" style={{ background: 'var(--sidebar)' }}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(120% 150% at 88% 0%, rgba(26,136,128,.6) 0%, rgba(15,45,82,0) 62%)',
            }}
          />
          <div className="relative flex flex-wrap gap-8">
            <div className="min-w-0">
              <p className={kicker} style={{ color: 'var(--hero-ink-muted)' }}>
                Tu entrenamiento
              </p>
              <div className="mt-3.5 flex items-end gap-2.5">
                <span className={`${mono} text-[44px] font-extrabold leading-none tracking-[-0.03em]`} style={{ color: 'var(--hero-ink)' }}>
                  {practicados}
                </span>
                <span className={`${mono} pb-1.5 text-[14px] font-semibold`} style={{ color: 'var(--hero-ink-muted)' }}>
                  casos practicados
                </span>
              </div>
              <p className="mt-4 max-w-[42ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--hero-ink-soft, #dbe8f1)' }}>
                {ultimaSesion}
              </p>
            </div>
            <div className="flex min-w-[230px] flex-1 flex-col gap-3.5">
              {desempeno.map((d) => (
                <div key={d.etiqueta}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12.5px]" style={{ color: 'var(--hero-ink-soft, #dbe8f1)' }}>
                      {d.etiqueta}
                    </span>
                    <span className={`${mono} ml-auto text-[12.5px] font-bold`} style={{ color: 'var(--hero-ink)' }}>
                      {d.valor}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.18)' }}>
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: tonoBarra[d.tono] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${card} p-6`}>
          <p className={`${kicker} text-muted-foreground`}>Lo que el tutor te dejó para repasar</p>
          {repasos.length === 0 ? (
            <p className={`mt-3.5 text-[13px] leading-relaxed ${softText}`}>
              Sin repasos pendientes. Practica un caso y el tutor decidirá cuándo conviene volver al tema.
            </p>
          ) : (
            <ul className="mt-3.5 flex flex-col gap-2.5">
              {repasos.map((r) => (
                <li
                  key={r.dominio}
                  className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-3 ${
                    r.hoy
                      ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]'
                      : 'border-border bg-card'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full ${
                      r.hoy ? 'bg-card text-[color:var(--warning-foreground)]' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Clock className="h-[17px] w-[17px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold leading-snug">{r.tema}</span>
                    <span
                      className={`${mono} mt-0.5 block text-[11.5px] ${
                        r.hoy ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
                      }`}
                    >
                      repaso {r.cuando}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
            Cada sesión alimenta tu competencia I-AIM y decide cuándo vuelve el tema.
          </p>
        </section>
      </div>

      {/* los dos tipos */}
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        {(
          [
            {
              t: 'interpretacion' as TipoSim,
              nombre: 'Interpretación',
              sub: 'Lee el caso y da tu impresión',
              d: 'El tutor te muestra las imágenes y el contexto, sin diagnóstico. Describes hallazgos y concluyes; se compara contra la verdad del caso.',
              cta: 'Practicar lectura',
              icono: Eye,
              principal: true,
            },
            {
              t: 'reporte' as TipoSim,
              nombre: 'Reporte',
              sub: 'Redacta el estudio completo',
              d: 'Recibes el estudio y escribes el reporte. El tutor revisa estructura, medidas, omisiones e impresión diagnóstica.',
              cta: 'Practicar reporte',
              icono: FileText,
              principal: false,
            },
          ]
        ).map((s) => {
          const Icono = s.icono;
          return (
            <section
              key={s.t}
              className={`relative overflow-hidden rounded-xl border bg-card p-6 shadow-rest ${
                s.principal ? 'border-primary' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                    s.principal ? 'bg-primary text-[color:var(--sidebar)]' : 'bg-accent text-accent-foreground'
                  }`}
                >
                  <Icono className="h-[22px] w-[22px]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-[19px] font-extrabold tracking-[-0.015em]">{s.nombre}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{s.sub}</p>
                </div>
              </div>
              <p className={`mt-4 max-w-[52ch] text-[14px] leading-[1.7] ${softText}`}>{s.d}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => primerCaso && iniciar(s.t, primerCaso)}
                  disabled={sinCasos}
                  className={`inline-flex h-12 items-center rounded-[10px] px-5 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${
                    s.principal
                      ? 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
                      : 'border border-border bg-card text-secondary hover:bg-accent'
                  }`}
                >
                  {s.cta}
                </button>
                <span className={`${mono} text-[12.5px] text-muted-foreground`}>{disponibles} casos disponibles</span>
              </div>
            </section>
          );
        })}
      </div>

      {/* filtros + casos */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Tipo de simulador" className="flex gap-1.5 rounded-full border border-border bg-card p-1">
          {(
            [
              ['interpretacion', 'Interpretación'],
              ['reporte', 'Reporte'],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tipo === id}
              onClick={() => setTipo(id)}
              className={`inline-flex h-10 items-center gap-[7px] whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                tipo === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setArea(a)}
              aria-pressed={area === a}
              className={`h-10 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                area === a ? 'border-transparent bg-accent text-accent-foreground' : `border-border bg-card ${softText} hover:bg-muted`
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <label className="ml-auto flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5">
          <span className="text-[12.5px] text-muted-foreground">Dificultad</span>
          <select
            value={dificultad}
            onChange={(e) => setDificultad(e.target.value)}
            className="appearance-none bg-transparent text-[13.5px] font-semibold text-foreground outline-none"
          >
            {['Todas', 'Básico', 'Intermedio', 'Avanzado'].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        </label>
      </div>

      {sinCasos ? (
        <div className={`${card} mt-4 p-10 text-center`}>
          <p className="text-[15px] font-bold">Aún no hay casos en el banco</p>
          <p className={`mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed ${softText}`}>
            Cuando el docente publique casos en la biblioteca, aparecerán aquí para entrenar.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((c) => (
            <li
              key={c.id}
              className={`overflow-hidden rounded-xl border bg-card shadow-rest transition-colors hover:border-primary ${
                c.sugerido ? 'border-primary' : 'border-border'
              }`}
            >
              <div
                aria-hidden
                className="relative grid h-[150px] place-items-center overflow-hidden"
                style={{ background: 'var(--wave-0)' }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)' }}
                />
                <span
                  className={`relative ${mono} px-3 text-center text-[9.5px] uppercase tracking-[0.14em]`}
                  style={{ color: 'var(--hero-ink-muted)' }}
                >
                  {c.area}
                </span>
                {c.sugerido && (
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-primary px-2.5 py-[3px] text-[10.5px] font-bold text-[color:var(--sidebar)]">
                    {c.mejor == null ? 'Nuevo' : 'Te toca'}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
                    {c.area}
                  </span>
                  <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseNivel[c.dificultad]}`}>
                    {c.dificultad}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-full border border-border bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                    {labelDominio(c.dominio)}
                  </span>
                </div>
                <h3 className="mt-3 text-[15px] font-bold leading-snug" style={{ textWrap: 'pretty' }}>
                  {c.titulo}
                </h3>
                <div className="mt-3.5 flex items-center gap-2.5 border-t border-border pt-3.5">
                  <span className={`${mono} text-[11.5px] text-muted-foreground`}>{c.historial}</span>
                  <button
                    type="button"
                    onClick={() => iniciar(tipo, c)}
                    className={`ml-auto h-10 rounded-full bg-accent px-3.5 text-[12.5px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                  >
                    Entrenar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
