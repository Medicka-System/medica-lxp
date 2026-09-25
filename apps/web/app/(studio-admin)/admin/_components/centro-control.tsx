'use client';

/**
 * Studio · Centro de control (Inicio de admin / súper admin). El súper admin no
 * construye ni evalúa: GOBIERNA y VIGILA. Tres capas (§ mock admin/dashboard):
 *   CAPA 1 · Pulso del negocio  → ¿cómo va la escuela?          (admin y súper admin)
 *   CAPA 2 · Salud del sistema  → ¿todo funciona?               (SOLO súper admin)
 *   CAPA 3 · Atención y actividad → qué exige su firma, qué se observa.
 *
 * Color (§5A): el ROJO se reserva a integración caída y dinero vencido; lo demás
 * pendiente es ÁMBAR; el violeta es Eco.
 *
 * Datos: kpis/tendencia/avance/riesgo/decisiones/actividad/ateneo son REALES (RLS).
 * Cartera (CORA), salud del sistema, costo de Eco y el chat de Eco son PLACEHOLDER
 * declarados (ver `_data.ts` / `contrato.ts`), a la espera de su integración.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Award,
  BarChart3,
  ChevronRight,
  CreditCard,
  Database,
  ExternalLink,
  KeyRound,
  LayoutGrid,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  Scale,
  Send,
  Settings,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/components/tokens';
import { EcoMark } from '../../_components/eco-mark';
import type {
  CentroControlData,
  EstadoIntegracion,
  IconoKpi,
} from './contrato';

const ICONO_KPI: Record<IconoKpi, typeof Users> = {
  alumnos: Users,
  grupos: LayoutGrid,
  programas: BarChart3,
  inscripciones: Plus,
};

const ICONO_INTEGRACION = {
  zoom: Video,
  mico: Database,
  cora: Database,
  pagos: CreditCard,
  correo: Mail,
} as const;

const ICONO_SISTEMA = { almacenamiento: Database, colas: Scale, lrs: TrendingUp } as const;
const ICONO_DECISION = { certificados: Award, accesos: KeyRound, escaladas: Scale } as const;

const SEMAFORO: Record<
  EstadoIntegracion,
  { etiqueta: string; clase: string; borde: string; fondoFila: string }
> = {
  ok: { etiqueta: 'Operativa', clase: 'bg-accent text-accent-foreground', borde: 'border-border', fondoFila: 'bg-card' },
  degradada: {
    etiqueta: 'Degradada',
    clase: 'bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
    borde: 'border-border',
    fondoFila: 'bg-card',
  },
  caida: {
    etiqueta: 'Caída',
    clase: 'bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]',
    borde: 'border-[color:var(--destructive-border)]',
    fondoFila: 'bg-[color:var(--destructive-surface)]',
  },
};

function RotuloCapa({ color, titulo, nota }: { color: string; titulo: string; nota?: string }) {
  return (
    <div className="mt-6 flex items-center gap-2.5">
      <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">{titulo}</h2>
      {nota && <span className="text-[11.5px] text-muted-foreground">{nota}</span>}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Chip discreto: marca un bloque como placeholder a la espera de integración. */
function ChipPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground">
      <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-muted-foreground/60" />
      {children}
    </span>
  );
}

export function CentroControl({ data }: { data: CentroControlData }) {
  const {
    esSuper,
    fecha,
    kpis,
    tendencia,
    avance,
    riesgo,
    cartera,
    integraciones,
    gastoIA,
    sistema,
    alertas,
    decisiones,
    actividad,
    ateneo,
    eco,
  } = data;

  const [rango, setRango] = useState<'6m' | '12m'>('6m');
  const puntosTendencia = rango === '6m' ? tendencia.puntos6m : tendencia.puntos12m;

  return (
    <div className="mx-auto w-full max-w-[1360px] px-6 pb-7 pt-5">
      {/* cabecera + accesos de gobierno (solo súper admin) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
            {esSuper ? 'Centro de control' : 'Panorama de la escuela'}
          </h1>
          <p className={`mt-1 text-[12.5px] ${softText}`}>
            {fecha} · {esSuper ? 'cómo va la escuela y si todo está funcionando.' : 'cómo va la experiencia de los alumnos.'}
          </p>
        </div>
        {esSuper && (
          <div className="ml-auto flex flex-wrap gap-2">
            {(
              [
                ['Usuarios y roles', Users, null],
                ['Integraciones', ExternalLink, null],
                ['Analítica', TrendingUp, '/admin/analitica'],
                ['Configuración', Settings, '/configuracion'],
              ] as const
            ).map(([t, Icono, href]) =>
              href ? (
                <Link
                  key={t}
                  href={href}
                  className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  {t}
                </Link>
              ) : (
                <button
                  key={t}
                  type="button"
                  disabled
                  title={`${t} — próximamente`}
                  className={`inline-flex h-10 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-muted-foreground opacity-70 ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  {t}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {/* ══════════════ CAPA 1 · PULSO DEL NEGOCIO ══════════════ */}
      <RotuloCapa color="var(--primary)" titulo="Pulso del negocio" />

      <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icono = ICONO_KPI[k.icono];
          return (
            <li key={k.id} className={`${card} p-[18px]`}>
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground"
                >
                  <Icono className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>{k.titulo}</p>
              </div>
              <div className="mt-3.5 flex items-baseline gap-2.5">
                <span className={`${mono} text-[34px] font-extrabold leading-none tracking-[-0.03em]`}>
                  {k.valor}
                </span>
                <span className="text-[12px] font-semibold text-muted-foreground">{k.unidad}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {k.delta && (
                  <span
                    className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-bold ${
                      k.deltaPositivo ? 'bg-accent text-accent-foreground' : `bg-muted ${softText}`
                    }`}
                  >
                    {k.deltaPositivo && <TrendingUp aria-hidden className="h-3 w-3" strokeWidth={2.2} />}
                    {k.delta}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{k.pie}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.92fr)]">
        {/* tendencia */}
        <section className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Crecimiento y actividad</p>
            <div className="ml-auto flex gap-1 rounded-full bg-muted p-[3px]">
              {(
                [
                  ['6m', '6 meses'],
                  ['12m', '12 meses'],
                ] as const
              ).map(([id, etiqueta]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRango(id)}
                  aria-pressed={rango === id}
                  className={`h-[26px] whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold transition-colors ${focusRing} ${
                    rango === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex h-[132px] items-end gap-2.5">
            {puntosTendencia.map((p, i, arr) => {
              const ultimo = i === arr.length - 1;
              return (
                <span key={p.mes + i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <span
                    className={`${mono} text-[10px] font-bold ${ultimo ? 'text-secondary' : 'text-muted-foreground'}`}
                  >
                    {p.valor}
                  </span>
                  <span
                    aria-hidden
                    className="w-full rounded-t-[7px]"
                    style={{ height: `${p.altura}%`, background: ultimo ? 'var(--primary)' : '#d6e3ea' }}
                  />
                  <span className="text-[10px] text-muted-foreground">{p.mes}</span>
                </span>
              );
            })}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-4 border-t border-border pt-3.5">
            {tendencia.resumen.map((r, i) => (
              <span key={r.etiqueta} className="flex items-center gap-4">
                {i > 0 && <span aria-hidden className="h-3.5 w-px bg-border" />}
                <span className="inline-flex items-baseline gap-1.5">
                  <span className={`${mono} text-[13px] font-bold`}>{r.valor}</span>
                  <span className="text-[11.5px] text-muted-foreground">{r.etiqueta}</span>
                </span>
              </span>
            ))}
          </div>
        </section>

        {/* avance + riesgo */}
        <section className={`${card} p-[18px]`}>
          <p className={`${kicker} text-muted-foreground`}>Avance de la escuela</p>
          <div className="mt-4 flex flex-col gap-4">
            {avance.map((a) => (
              <div key={a.titulo}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">{a.titulo}</span>
                  <span className={`${mono} shrink-0 text-[13px] font-bold`}>{a.pct}%</span>
                </div>
                <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${a.pct}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{a.detalle}</p>
              </div>
            ))}
          </div>

          {riesgo.n > 0 ? (
            <Link
              href="/admin/alumnos"
              className={`mt-4 flex w-full items-center gap-2.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3 text-left ${focusRing}`}
            >
              <span
                aria-hidden
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
              >
                <AlertTriangle className="h-[15px] w-[15px]" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-[color:var(--warning-foreground)]">
                  {riesgo.n} alumnos en riesgo
                </span>
                <span className="mt-0.5 block text-[11px] text-[color:var(--warning-foreground)]">
                  {riesgo.detalle}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="h-4 w-4 shrink-0 text-[color:var(--warning-foreground)]"
                strokeWidth={2}
              />
            </Link>
          ) : (
            <div className="mt-4 flex w-full items-center gap-2.5 rounded-[11px] border border-border bg-accent px-3.5 py-3">
              <span className="text-[12px] font-semibold text-accent-foreground">
                Sin alumnos en riesgo · todos con actividad reciente
              </span>
            </div>
          )}
        </section>

        {/* cartera: llega de CORA (placeholder en local) */}
        <section className={`${card} p-[18px]`}>
          <div className="flex items-center gap-2.5">
            <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Cartera · desde CORA</p>
            <ChipPlaceholder>
              <Lock aria-hidden className="h-[10px] w-[10px]" strokeWidth={2} />
              Solo lectura
            </ChipPlaceholder>
          </div>

          <div className="mt-3.5 flex items-baseline gap-2.5">
            <span className={`${mono} text-[26px] font-extrabold leading-none tracking-[-0.02em] text-muted-foreground`}>
              {cartera.pctAlCorriente}
            </span>
            <span className="text-[12px] font-semibold text-muted-foreground">al corriente</span>
          </div>

          <ul className="mt-3.5 flex flex-col gap-2.5">
            {cartera.cortes.map((c) => (
              <li
                key={c.etiqueta}
                className="flex items-center gap-2.5 rounded-[9px] border border-dashed border-border px-2.5 py-2.5"
              >
                <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-muted-foreground/40" />
                <span className="min-w-0 flex-1 text-[12px] font-semibold text-muted-foreground">{c.etiqueta}</span>
                <span className={`${mono} shrink-0 text-[13px] font-bold text-muted-foreground`}>{c.valor}</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            La cobranza vive en CORA; el LXP solo la refleja. El agregado se conecta en la integración con el ERP ({cartera.ultimoCorte}).
          </p>
          <button
            type="button"
            disabled
            title="Abrir CORA — se conecta con la integración del ERP (§11)"
            className={`mt-2.5 inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-muted-foreground opacity-70 ${focusRing}`}
          >
            <ExternalLink aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Abrir CORA
          </button>
        </section>
      </div>

      {/* ══════════════ CAPA 2 · SALUD DEL SISTEMA (solo súper admin) ══════════════ */}
      {esSuper && (
        <>
          <RotuloCapa color="var(--sidebar)" titulo="Salud del sistema" nota="solo usted ve esta capa" />

          <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)_minmax(0,1.1fr)]">
            {/* integraciones */}
            <section className={`${card} p-[18px]`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Integraciones</p>
                <ChipPlaceholder>Telemetría pendiente</ChipPlaceholder>
              </div>
              <ul className="mt-3.5 flex flex-col gap-2">
                {integraciones.map((it) => {
                  const sem = SEMAFORO[it.estado];
                  const Icono = ICONO_INTEGRACION[it.icono];
                  return (
                    <li key={it.id} className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-3 ${sem.borde} ${sem.fondoFila}`}>
                      <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${sem.clase}`}>
                        <Icono className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold">{it.nombre}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{it.detalle}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={`${mono} whitespace-nowrap text-[10.5px] text-muted-foreground`}>{it.meta}</span>
                        <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${sem.clase}`}>
                          <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-current" />
                          {sem.etiqueta}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Eco: servicio con presupuesto (placeholder) */}
            <section className={`${card} border-[color:var(--info-border)] p-[18px]`}>
              <div className="flex items-center gap-2.5">
                <EcoMark size={30} />
                <p className={`${kicker} min-w-0 flex-1 text-[color:var(--info-foreground)]`}>Eco · consumo del periodo</p>
                <ChipPlaceholder>Sin telemetría</ChipPlaceholder>
              </div>
              <div className="mt-3.5 flex items-baseline gap-2.5">
                <span className={`${mono} text-[30px] font-extrabold leading-none tracking-[-0.03em] text-muted-foreground`}>
                  {gastoIA.monto}
                </span>
                <span className="text-[12px] font-semibold text-muted-foreground">{gastoIA.moneda} en {gastoIA.periodo}</span>
              </div>

              {/* Barra de tope (estructura lista; el % real llega con la telemetría de Eco · §7A). */}
              <div className="mt-3 flex items-center gap-2.5">
                <div
                  className="h-[7px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]"
                  role="progressbar"
                  aria-valuenow={gastoIA.pctTope}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Consumo contra el tope mensual"
                >
                  <span className="block h-full rounded-full bg-[color:var(--info)]" style={{ width: `${gastoIA.pctTope}%` }} />
                </div>
                <span className={`${mono} shrink-0 text-[11.5px] font-bold text-muted-foreground`}>{gastoIA.pctTope}% del tope</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Tope: {gastoIA.tope}. El tope y el costo por tarea se configuran en el hub (IA/Eco); la medición del gasto se cablea con la orquestación de Eco (§7A).
              </p>

              {/* Desglose por tarea (mismo layout del mock; se puebla con la telemetría real). */}
              <ul className="mt-3.5 flex flex-col gap-2 border-t border-border pt-3.5">
                {gastoIA.desglose.length > 0 ? (
                  gastoIA.desglose.map((d) => (
                    <li key={d.tarea} className="flex items-center gap-2.5">
                      <span className={`min-w-0 flex-1 truncate text-[12px] font-medium ${softText}`}>{d.tarea}</span>
                      <span className={`${mono} shrink-0 text-[11.5px] font-bold`}>{d.monto}</span>
                      <span className={`${mono} w-[34px] shrink-0 text-right text-[10.5px] text-muted-foreground`}>{d.pct}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[11px] text-muted-foreground">Desglose por tarea disponible al cablear la telemetría de Eco.</li>
                )}
              </ul>

              <button
                type="button"
                disabled
                title="Configuración de IA/Eco — próximamente"
                className={`mt-3.5 h-10 w-full cursor-not-allowed rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[12.5px] font-bold text-[color:var(--info-foreground)] opacity-70 ${focusRing}`}
              >
                Modelos y costos por tarea
              </button>
            </section>

            {/* sistema + alertas */}
            <section className={`${card} p-[18px]`}>
              <div className="flex items-center gap-2.5">
                <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Estado del sistema</p>
                <ChipPlaceholder>Infra pendiente</ChipPlaceholder>
              </div>
              <ul className="mt-3.5 flex flex-col gap-2">
                {sistema.map((m) => {
                  const Icono = ICONO_SISTEMA[m.icono];
                  return (
                    <li key={m.titulo} className="flex items-center gap-3 rounded-[11px] border border-dashed border-border px-3.5 py-3">
                      <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted ${softText}`}>
                        <Icono className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 text-[12.5px] font-bold">{m.titulo}</span>
                          <span className={`${mono} shrink-0 text-[12px] font-bold text-muted-foreground`}>{m.valor}</span>
                        </span>
                        <span className="mt-1.5 block text-[10.5px] text-muted-foreground">{m.detalle}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className={`${kicker} mt-5 text-muted-foreground`}>Alertas de dominio</p>
              {alertas.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {alertas.map((a) => {
                    const critica = a.gravedad === 'critica';
                    const tono = critica
                      ? 'text-[color:var(--destructive-foreground)]'
                      : 'text-[color:var(--warning-foreground)]';
                    const borde = critica
                      ? 'border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)]'
                      : 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]';
                    const cuerpo = (
                      <>
                        <AlertTriangle aria-hidden className={`mt-0.5 h-[15px] w-[15px] shrink-0 ${tono}`} strokeWidth={2} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[12.5px] font-bold ${tono}`}>{a.titulo}</span>
                          <span className={`mt-1 block text-[11.5px] leading-relaxed ${tono}`}>{a.detalle}</span>
                        </span>
                        {a.href && <ChevronRight aria-hidden className={`mt-0.5 h-[15px] w-[15px] shrink-0 ${tono}`} strokeWidth={2} />}
                      </>
                    );
                    return (
                      <li key={a.id}>
                        {a.href ? (
                          <Link href={a.href} className={`flex items-start gap-2.5 rounded-[11px] border px-3.5 py-3 ${borde} ${focusRing}`}>
                            {cuerpo}
                          </Link>
                        ) : (
                          <div className={`flex items-start gap-2.5 rounded-[11px] border px-3.5 py-3 ${borde}`}>{cuerpo}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 rounded-[11px] border border-border bg-accent px-3.5 py-3 text-[12px] font-semibold text-accent-foreground">
                  Sin alertas de dominio.
                </p>
              )}
            </section>
          </div>
        </>
      )}

      {/* ══════════════ CAPA 3 · ATENCIÓN Y ACTIVIDAD ══════════════ */}
      <RotuloCapa color="var(--warning)" titulo="Atención y actividad" />

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* requiere su decisión */}
        <section className={`${card} p-[18px]`}>
          <p className={`${kicker} text-muted-foreground`}>Requiere su decisión</p>
          {decisiones.length > 0 ? (
            <ul className="mt-3.5 flex flex-col gap-2">
              {decisiones.map((d) => {
                const Icono = ICONO_DECISION[d.icono];
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3"
                  >
                    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-card text-[color:var(--warning-foreground)]">
                      <Icono className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`${mono} text-[15px] font-extrabold`}>{d.n}</span>
                        <span className="min-w-0 flex-1 text-[12.5px] font-bold text-[color:var(--warning-foreground)]">{d.titulo}</span>
                      </span>
                      <span className="mt-1 block text-[11px] text-[color:var(--warning-foreground)]">{d.detalle}</span>
                    </span>
                    {d.href ? (
                      <Link
                        href={d.href}
                        className={`inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3 text-[12px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
                      >
                        {d.cta}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Disponible próximamente"
                        className="h-9 shrink-0 cursor-not-allowed whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3 text-[12px] font-bold text-[color:var(--warning-foreground)] opacity-70"
                      >
                        {d.cta}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3.5 rounded-[11px] border border-border bg-accent px-3.5 py-3 text-[12px] font-semibold text-accent-foreground">
              Nada requiere su firma ahora mismo.
            </p>
          )}
        </section>

        {/* actividad del staff */}
        <section className={`${card} p-[18px]`}>
          <div className="flex items-center gap-2.5">
            <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Actividad del staff · reciente</p>
            <Link
              href="/admin/staff"
              className={`inline-flex h-[30px] shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              Ver todo
            </Link>
          </div>
          {actividad.length > 0 ? (
            <ul className="mt-2.5 flex flex-col gap-0.5">
              {actividad.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 rounded-[9px] px-2 py-2.5 transition-colors hover:bg-muted">
                  <span aria-hidden className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-sidebar text-[10.5px] font-bold text-sidebar-foreground">
                    {a.ini}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[12.5px] leading-snug ${softText}`}>
                      <span className="font-bold text-foreground">{a.nombre}</span> {a.accion}
                    </span>
                    <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>{a.meta}</span>
                  </span>
                  <span className={`inline-flex h-[19px] shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-muted px-[7px] text-[9.5px] font-semibold ${softText}`}>
                    {a.rol}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3.5 rounded-[11px] border border-border bg-muted px-3.5 py-3 text-[12px] font-medium text-muted-foreground">
              Sin validaciones registradas en los últimos días.
            </p>
          )}

          <div className="mt-3.5 flex items-center gap-3 border-t border-border pt-3.5">
            <span aria-hidden className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
              <MessageCircle className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-bold">Ateneo global</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {ateneo.casos} casos esta semana · {ateneo.comentarios} comentarios · {ateneo.sinResponder} sin responder
              </span>
            </span>
            <button
              type="button"
              disabled
              title="Abrir el Ateneo — vista de admin próximamente"
              className={`h-9 shrink-0 cursor-not-allowed whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-muted-foreground opacity-70 ${focusRing}`}
            >
              Abrir
            </button>
          </div>
        </section>

        {/* Eco analista (placeholder) */}
        <section className={`${card} overflow-hidden border-[color:var(--info-border)]`}>
          <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
            <EcoMark size={32} invertido />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold leading-tight">Eco</p>
              <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">Analista · placeholder</p>
            </div>
            <ChipPlaceholder>Sin API</ChipPlaceholder>
          </div>

          <div className="px-4 py-3.5">
            <div className="flex justify-end">
              <p className="max-w-[88%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                {eco.pregunta}
              </p>
            </div>
            <div className="mt-3 flex gap-2.5">
              <EcoMark size={26} />
              <div className="min-w-0 flex-1">
                <p className={`text-[12.5px] leading-relaxed ${softText}`}>{eco.intro}</p>
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {eco.puntos.map((p) => {
                    const tono =
                      p.tono === 'critica'
                        ? 'bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]'
                        : p.tono === 'media'
                          ? 'bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                          : 'bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]';
                    return (
                      <li key={p.titulo} className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-2.5 ${tono}`}>
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-bold">{p.titulo}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug">{p.detalle}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>{eco.cierre}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border px-4 pb-3.5 pt-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {eco.sugerencias.map((s) => (
                <span
                  key={s}
                  className={`inline-flex h-[30px] shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold ${softText}`}
                >
                  {s}
                </span>
              ))}
            </div>
            <form
              className="mt-2.5 flex h-10 items-center gap-2.5 rounded-full border border-border bg-muted px-3.5 opacity-70"
              onSubmit={(e) => e.preventDefault()}
            >
              <span className="sr-only">Chat de Eco (pendiente de API)</span>
              <input
                type="text"
                disabled
                placeholder="Eco conversacional llega con su API…"
                className="w-full min-w-0 cursor-not-allowed bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <span aria-hidden className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white">
                <Send className="h-3 w-3" strokeWidth={1.75} />
              </span>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
