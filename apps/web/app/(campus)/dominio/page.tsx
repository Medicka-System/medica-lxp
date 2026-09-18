import Link from 'next/link';
import { Award, Check, Clock } from 'lucide-react';
import { getSesionAlumno } from '@/lib/session';
import { getDominioData } from '@/lib/datos';
import { fechaCorta } from '@/lib/format';
import { mono, kicker, kickerWide, softText, focusRing } from '@/components/tokens';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Anillo, Barra, Tendencia } from '@/components/campus/dominio-visuals';

export const dynamic = 'force-dynamic';

const ESTADO_LABEL = { solido: 'Sólido', repaso: 'En repaso', caida: 'En caída' } as const;

function cuandoRepaso(fecha: Date | null): string {
  if (!fecha) return 'pendiente';
  const d = new Date(fecha);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString() || d.getTime() < hoy.getTime()) return 'hoy';
  return fechaCorta(d);
}

export default async function DominioPage() {
  const alumno = await getSesionAlumno();
  const data = await getDominioData(alumno.userId);
  const { general, dominios, repasos, horas, hitos } = data;

  const enCaida = dominios.find((d) => d.estado === 'caida');
  const mejor = [...dominios].sort((a, b) => b.nivel - a.nivel)[0];
  const titular = enCaida
    ? `Su ${enCaida.dominio} está decayendo — es de manos, no de teoría.`
    : mejor
      ? `Va sólido; ${mejor.dominio} es su fuerte.`
      : 'Suba casos para empezar a medir su competencia.';
  const detalle = enCaida
    ? `Perdió ${enCaida.decaimiento} puntos en ${enCaida.dominio}. Una o dos prácticas lo devuelven a su nivel.`
    : 'La competencia I-AIM mide su maestría real, no el % del curso.';
  const pctHoras = Math.round((horas.acreditadas / horas.meta) * 1000) / 10;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* ── Panorama: una frase antes que un número ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.55fr]">
        <section className="relative overflow-hidden rounded-2xl p-7" style={{ background: 'var(--sidebar)' }}>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 150% at 88% 0%, rgba(26,136,128,.6) 0%, rgba(15,45,82,0) 62%)' }} />
          <div className="relative flex flex-wrap items-center gap-6">
            <span className="relative grid shrink-0 place-items-center">
              <Anillo pct={general.nivel} />
              <span className="absolute grid place-items-center text-center">
                <span className={`${mono} block text-[40px] font-extrabold leading-none tracking-[-0.03em]`} style={{ color: 'var(--hero-ink)' }}>{general.nivel}</span>
                <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--hero-ink-muted)' }}>competencia</span>
              </span>
            </span>
            <div className="min-w-[220px] flex-1 basis-[220px]">
              <p className={kickerWide} style={{ color: 'var(--hero-ink-muted)' }}>Su dominio general</p>
              <p className="mt-3 text-[17px] font-bold leading-relaxed" style={{ color: 'var(--hero-ink)' }}>{titular}</p>
              <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: 'var(--hero-ink-soft)' }}>{detalle}</p>
            </div>
          </div>
        </section>

        <ul className="grid gap-4 sm:grid-cols-2">
          {dominios.length > 0 ? dominios.map((d) => {
            const sube = d.decaimiento === 0;
            return (
              <li key={d.dominio} className={`rounded-xl border bg-card p-5 shadow-rest ${d.estado === 'caida' ? 'border-warning-border' : 'border-border'}`}>
                <div className="flex items-center gap-2.5">
                  <p className="text-[15px] font-bold tracking-[-0.01em]">{d.dominio}</p>
                  <Badge variant={d.estado === 'solido' ? 'accent' : 'warning'}>{ESTADO_LABEL[d.estado]}</Badge>
                </div>
                <div className="mt-3.5 flex items-end gap-3.5">
                  <span className={`${mono} text-[40px] font-extrabold leading-none tracking-[-0.03em]`}>{d.nivel}</span>
                  <span className={`${mono} whitespace-nowrap pb-1.5 text-[13px] font-bold ${d.decaimiento === 0 ? 'text-muted-foreground' : 'text-warning-foreground'}`}>
                    {d.decaimiento === 0 ? '=' : `−${d.decaimiento} por olvido`}
                  </span>
                  <span className="ml-auto"><Tendencia serie={d.serie} sube={sube} /></span>
                </div>
                <div className="mt-3.5"><Barra pct={d.nivel} alerta={d.estado === 'caida'} /></div>
              </li>
            );
          }) : (
            <li className="rounded-xl border border-dashed border-border bg-card p-8 text-center sm:col-span-2">
              <p className={`text-[13.5px] ${softText}`}>Aún no hay competencia registrada. Cuando el docente valide tus casos, aquí verás tu dominio I-AIM.</p>
            </li>
          )}
        </ul>
      </div>

      {/* ── Qué repasar ahora ── */}
      {repasos.length > 0 && (
        <Card className="mt-7 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-5">
            <div className="min-w-0">
              <p className={`${kicker} text-warning-foreground`}>Qué repasar ahora</p>
              <p className={`mt-1.5 text-[14px] leading-snug ${softText}`}>La competencia decae sola. Estos dominios volvieron a la fila porque ya toca.</p>
            </div>
            <span className={`${mono} ml-auto text-[12.5px] text-muted-foreground`}>{repasos.length} pendientes</span>
          </div>
          <ul className="flex flex-col">
            {repasos.map((r, i) => {
              const hoy = cuandoRepaso(r.cuando) === 'hoy';
              return (
                <li key={r.dominio} className={`flex flex-wrap items-center gap-4 px-6 py-4 ${i ? 'border-t border-border' : ''} ${hoy ? 'bg-warning-surface' : ''}`}>
                  <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${hoy ? 'bg-card text-warning-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Clock className="h-[19px] w-[19px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-[220px] flex-1">
                    <span className="block text-[15px] font-bold leading-snug">{r.dominio}</span>
                    <span className={`mt-0.5 block text-[12.5px] ${softText}`}>Perdió {r.decaimiento} puntos por falta de práctica reciente</span>
                  </span>
                  <span className={`inline-flex h-[26px] shrink-0 items-center rounded-full px-2.5 text-[11.5px] font-bold ${hoy ? 'bg-warning-foreground text-white' : 'border border-border bg-muted text-muted-foreground'}`}>
                    {hoy ? 'Toca hoy' : cuandoRepaso(r.cuando)}
                  </span>
                  <Link href="/simuladores" className={`h-11 rounded-[10px] bg-primary px-4 text-[13px] font-bold leading-[44px] text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}>
                    Practicar
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* ── Horas e hitos ── */}
      <div className="mt-7 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl p-6 lg:order-2" style={{ background: 'var(--secondary)' }}>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 150% at 90% 0%, rgba(83,195,190,.55) 0%, rgba(26,136,128,0) 62%)' }} />
          <div className="relative">
            <p className={kicker} style={{ color: 'var(--hero-ink-soft)' }}>Horas acreditadas</p>
            <div className="mt-3 flex items-end gap-2.5">
              <span className={`${mono} text-[40px] font-extrabold leading-none tracking-[-0.03em]`} style={{ color: 'var(--hero-ink)' }}>{horas.acreditadas}</span>
              <span className={`${mono} pb-1 text-[14px] font-semibold`} style={{ color: 'var(--hero-ink-soft)' }}>/ {horas.meta} h</span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.22)' }} role="progressbar" aria-valuenow={pctHoras} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full" style={{ width: `${pctHoras}%`, background: 'var(--hero-ink)' }} />
            </div>
            <p className="mt-3.5 text-[13px] leading-relaxed" style={{ color: 'var(--hero-ink-soft)' }}>
              Le faltan <span className={`${mono} font-bold`} style={{ color: 'var(--hero-ink)' }}>{horas.faltan} h</span> para el hito de {horas.siguiente} h.
            </p>
          </div>
        </section>

        <Card className="p-6 lg:order-1">
          <p className={`${kicker} text-muted-foreground`}>Hitos</p>
          <ol className="mt-4 flex flex-col">
            {hitos.map((h, i) => (
              <li key={h.horas} className="flex gap-3.5">
                <span className="flex shrink-0 flex-col items-center">
                  <span aria-hidden className={`grid h-[26px] w-[26px] place-items-center rounded-full ${h.alcanzado ? 'bg-primary text-[color:var(--sidebar)]' : h.cerca ? 'border-2 border-primary bg-card' : 'border-2 border-[color:var(--track)] bg-card'}`}>
                    {h.alcanzado && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  {i < hitos.length - 1 && <span aria-hidden className="min-h-[22px] w-0.5 flex-1 bg-[color:var(--track)]" />}
                </span>
                <span className={`min-w-0 flex-1 ${i < hitos.length - 1 ? 'pb-5' : ''}`}>
                  <span className="flex items-baseline gap-2">
                    <span className={`${mono} text-[15px] font-extrabold ${!h.alcanzado && !h.cerca ? 'text-muted-foreground' : ''}`}>{h.horas}</span>
                    {h.cerca && <Badge variant="accent" size="sm" className="ml-auto">Casi</Badge>}
                    {h.alcanzado && <Badge variant="accent" size="sm" className="ml-auto">Logrado</Badge>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <Link href="/certificados" className={`mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}>
            <Award aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Ver mis certificados
          </Link>
        </Card>
      </div>
    </div>
  );
}
