'use client';

/**
 * Studio · Analítica (admin / súper admin). Cada cifra cierra con su señal (§ mock):
 * qué revisar, no solo cómo va. Tres capas: negocio (parcial · CORA pendiente),
 * aprendizaje (del LRS · el diferenciador, REAL) y operación (REAL). Eco es el
 * analista: aquí su panel es placeholder hasta que su API esté cableada (§7A).
 *
 * Gráficas reales (crecimiento, casos por mes) vía el wrapper `<Chart>` §5A (Recharts
 * tematizado, SSR-safe · §3); los medidores simples se quedan en CSS con tokens.
 */
import { AlertTriangle, Lock, Sparkles, Stethoscope, TrendingUp } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts';
import { mono, kicker, softText, card, focusRing } from '@/components/tokens';
import { Chart, ChartTooltip, EJE } from '@/components/ui/chart';
import { ChatEco } from '../../../_components/chat-eco';
import type { AnaliticaData, BarraSimple } from './contrato';

function RotuloCapa({ color, titulo, nota }: { color: string; titulo: string; nota: string }) {
  return (
    <div className="mt-6 flex items-center gap-2.5">
      <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">{titulo}</h2>
      <span className="text-[11.5px] text-muted-foreground">{nota}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

function Barras({ filas, color = 'primary' }: { filas: BarraSimple[]; color?: 'primary' | 'sidebar' }) {
  return (
    <div className="mt-3.5 flex flex-col gap-2.5">
      {filas.map((f) => (
        <div key={f.etiqueta}>
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{f.etiqueta}</span>
            <span className={`${mono} shrink-0 text-[12px] font-bold ${f.alerta ? 'text-[color:var(--warning-foreground)]' : ''}`}>
              {f.valor}
            </span>
          </div>
          <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-[color:var(--track)]">
            <span
              aria-hidden
              className={`block h-full rounded-full ${f.alerta ? 'bg-[color:var(--warning)]' : color === 'sidebar' ? 'bg-sidebar' : 'bg-primary'}`}
              style={{ width: `${f.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Senal({ tono, children }: { tono: 'ok' | 'warn' | 'info'; children: React.ReactNode }) {
  const clase =
    tono === 'warn'
      ? 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
      : tono === 'info'
        ? 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
        : 'bg-accent text-accent-foreground';
  return (
    <div className="mt-3.5 border-t border-border pt-3.5">
      <span className={`inline-flex items-start gap-1.5 rounded-[9px] px-2.5 py-2 text-[11.5px] font-semibold leading-snug ${clase}`}>
        {tono === 'warn' && <AlertTriangle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
        {children}
      </span>
    </div>
  );
}

function Tarjeta({
  titulo,
  extra,
  children,
}: {
  titulo: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`${card} flex flex-col p-[18px]`}>
      <div className="flex items-center gap-2.5">
        <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>{titulo}</p>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function Analitica({ data }: { data: AnaliticaData }) {
  const { alumnos, crecimiento, casos, casosMesSerie, iaim, casosPorDominio, repaso, docentes, diseno, ateneo, ecoCorrecciones } = data;

  const flojo = iaim.find((d) => d.flojo);
  const participacion = alumnos.activos > 0 ? Math.round((ateneo.autores / alumnos.activos) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Analítica</h1>
          <p className={`mt-1 text-[12.5px] ${softText}`}>Cada cifra viene con su señal: qué revisar, no solo cómo va.</p>
        </div>
        <button
          type="button"
          disabled
          title="Exportar — próximamente"
          className={`ml-auto inline-flex h-10 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-muted-foreground ${focusRing}`}
        >
          Exportar
        </button>
      </div>

      {/* ══════════════ CAPA 1 · NEGOCIO ══════════════ */}
      <RotuloCapa color="var(--primary)" titulo="Negocio y crecimiento" nota="lo que revisa a diario" />
      <div className="mt-3.5 grid items-start gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        <Tarjeta titulo="Alumnos activos">
          <div className="mt-3.5 flex items-baseline gap-2.5">
            <span className={`${mono} text-[30px] font-extrabold leading-none tracking-[-0.03em]`}>{alumnos.activos}</span>
            <span className="text-[12px] font-semibold text-muted-foreground">con acceso al día</span>
          </div>
          {/* gráfica real: crecimiento acumulado de alumnos (Recharts vía wrapper §5A) */}
          <div className="mt-3.5">
            <Chart height={74}>
              <AreaChart data={crecimiento} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="x" hide />
                <YAxis hide domain={['dataMin - 40', 'dataMax + 40']} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)' }} />
                <Area
                  type="monotone"
                  dataKey="v"
                  name="Alumnos"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="var(--primary)"
                  fillOpacity={0.1}
                  isAnimationActive={false}
                />
              </AreaChart>
            </Chart>
            <div className="mt-1.5 flex justify-between">
              {crecimiento.map((p) => (
                <span key={p.x} className="text-[9.5px] text-muted-foreground">{p.x}</span>
              ))}
            </div>
          </div>
          <Senal tono={alumnos.altas30 > 0 ? 'ok' : 'info'}>
            {alumnos.altas30 > 0 ? `${alumnos.altas30} altas en 30 días; el cuello es capacidad docente, no demanda.` : 'Sin altas nuevas en 30 días.'}
          </Senal>
        </Tarjeta>

        <Tarjeta titulo="Casos y validación">
          <div className="mt-3.5 flex items-baseline gap-2.5">
            <span className={`${mono} text-[30px] font-extrabold leading-none tracking-[-0.03em]`}>
              {casos.tasaAprobacion === null ? '—' : `${casos.tasaAprobacion}%`}
            </span>
            <span className="text-[12px] font-semibold text-muted-foreground">de aprobación</span>
          </div>
          <Barras
            filas={[
              { etiqueta: 'Aprobados', valor: String(casos.aprobados), pct: casos.total ? Math.round((casos.aprobados / casos.total) * 100) : 0 },
              { etiqueta: 'Pendientes', valor: String(casos.pendientes), pct: casos.total ? Math.round((casos.pendientes / casos.total) * 100) : 0 },
              { etiqueta: 'Rechazados', valor: String(casos.rechazados), pct: casos.total ? Math.round((casos.rechazados / casos.total) * 100) : 0, alerta: casos.rechazados > 0 },
            ]}
          />
        </Tarjeta>

        <Tarjeta
          titulo="Cartera e ingreso"
          extra={
            <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              CORA
            </span>
          }
        >
          <div className="mt-3.5 flex flex-1 flex-col justify-center rounded-[11px] border border-dashed border-border bg-muted/40 px-3.5 py-5 text-center">
            <span className={`${mono} text-[22px] font-extrabold text-muted-foreground`}>—</span>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              Retención, llenado, embudo, ingreso y cartera se calculan sobre datos de CORA y el LRS histórico; se conectan en la integración con el ERP (§11).
            </p>
          </div>
        </Tarjeta>
      </div>

      {/* ══════════════ CAPA 2 · APRENDIZAJE (LRS) ══════════════ */}
      <RotuloCapa color="var(--info-foreground)" titulo="Aprendizaje" nota="la capa profunda · del LRS (xAPI)" />

      {/* Eco, su analista de la escuela (§7A · conversacional, read-only) */}
      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ChatEco
          surface="escuela"
          entidadId="escuela"
          subtitulo="Su analista de la escuela"
          placeholder="Pregúntele a Eco sobre la escuela…"
          intro="Pregúntele a Eco sobre la escuela: cruza alumnos, casos y validación, competencia I-AIM y comunidad del LRS (bajo RLS) para responder con datos reales. Eco propone; usted decide."
          sugerencias={['¿Cómo va la escuela?', '¿En qué dominio I-AIM está más floja?', '¿Cuántos casos faltan por validar?']}
        />
        <section className={`${card} min-w-0 p-5`}>
          <div className="flex items-center gap-2.5">
            <Sparkles aria-hidden className="h-4 w-4 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
            <p className="text-[12.5px] font-bold">El dato duro (real, del LRS):</p>
          </div>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            <li className="rounded-[9px] bg-muted px-2.5 py-2 text-[11.5px] font-medium">
              Competencia I-AIM medida en <span className={`${mono} font-bold`}>{repaso.dominiosMedidos}</span> proyecciones alumno×dominio.
            </li>
            <li className="rounded-[9px] bg-muted px-2.5 py-2 text-[11.5px] font-medium">
              {flojo ? `El dominio más flojo es ${flojo.dominio} (${flojo.valor}).` : 'Aún sin proyección de competencia suficiente.'}
            </li>
            <li className="rounded-[9px] bg-muted px-2.5 py-2 text-[11.5px] font-medium">
              <span className={`${mono} font-bold`}>{ecoCorrecciones}</span> correcciones docente→Eco registradas (loop de mejora, §7A).
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Tarjeta titulo="Competencia I-AIM de la escuela" extra={<span className="text-[10px] font-bold text-[color:var(--info-foreground)]">del LRS</span>}>
          <div className="mt-3.5 flex flex-col gap-3">
            {iaim.map((d) => (
              <div key={d.dominio}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">{d.dominio}</span>
                  {d.decaimiento > 0 && (
                    <span className="inline-flex h-5 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                      decae {d.decaimiento}
                    </span>
                  )}
                  <span className={`${mono} shrink-0 text-[13px] font-bold ${d.flojo ? 'text-[color:var(--warning-foreground)]' : ''}`}>
                    {d.n > 0 ? d.valor : '—'}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span aria-hidden className={`block h-full rounded-full ${d.flojo ? 'bg-[color:var(--warning)]' : 'bg-primary'}`} style={{ width: `${d.valor}%` }} />
                </div>
              </div>
            ))}
          </div>
          {flojo ? (
            <Senal tono="warn">{flojo.dominio} es el dominio más flojo de la escuela; suele ser técnica de manos → más práctica guiada.</Senal>
          ) : (
            <Senal tono="info">Aún no hay proyección de competencia suficiente para señalar un dominio flojo.</Senal>
          )}
        </Tarjeta>

        <div className="flex flex-col gap-3.5">
          <Tarjeta titulo="Casos subidos por mes">
            {/* gráfica real: casos de bitácora agregados por mes (Recharts vía wrapper §5A) */}
            <div className="mt-3.5">
              <Chart height={120}>
                <BarChart data={casosMesSerie} margin={{ top: 6, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="x" {...EJE} />
                  <YAxis allowDecimals={false} {...EJE} width={28} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
                  <Bar dataKey="v" name="Casos" fill="var(--primary)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </Chart>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Casos por dominio I-AIM">
            {casosPorDominio.length > 0 ? (
              <Barras filas={casosPorDominio} />
            ) : (
              <p className="mt-3 text-[12px] text-muted-foreground">Aún no hay casos subidos.</p>
            )}
          </Tarjeta>
        </div>
      </div>

      <Tarjeta titulo="Decaimiento y repaso espaciado">
        <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
          {(
            [
              [String(repaso.dominiosMedidos), 'proyecciones medidas', false],
              [String(repaso.conDecaimiento), 'dominios con decaimiento', repaso.conDecaimiento > 0],
              [String(repaso.repasos), 'repasos programados', false],
            ] as const
          ).map(([v, t, warn]) => (
            <div key={t} className={`rounded-[11px] border p-3.5 ${warn ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]' : 'border-border bg-muted'}`}>
              <span className={`${mono} block text-[22px] font-extrabold leading-none ${warn ? 'text-[color:var(--warning-foreground)]' : ''}`}>{v}</span>
              <span className={`mt-1.5 block text-[11px] font-semibold ${warn ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>{t}</span>
            </div>
          ))}
        </div>
        <Senal tono="info">El repaso espaciado lo agenda el worker (§8) a nivel de concepto; aquí se vigila el decaimiento detectado.</Senal>
      </Tarjeta>

      {/* ══════════════ CAPA 3 · OPERACIÓN ══════════════ */}
      <RotuloCapa color="var(--sidebar)" titulo="Operación, staff y comunidad" nota="quién sostiene la operación" />

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Tarjeta titulo="Desempeño docente · 30 días">
          {docentes.length > 0 ? (
            <div className="mt-2.5 flex flex-col">
              <div className="flex items-center gap-3 px-2 pb-2">
                {(
                  [
                    ['Docente', 'flex-1'],
                    ['Validados', 'shrink-0 w-[80px] text-right'],
                    ['En cola', 'shrink-0 w-[80px] text-right'],
                  ] as const
                ).map(([t, cls]) => (
                  <span key={t} className={`${cls} whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground`}>
                    {t}
                  </span>
                ))}
              </div>
              {docentes.map((d) => (
                <div key={d.id} className={`flex items-center gap-3 border-t border-border px-2 py-2.5 ${d.alerta ? 'bg-[color:var(--warning-surface)]' : ''}`}>
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sidebar text-[10px] font-bold text-sidebar-foreground">{d.ini}</span>
                    <span className="min-w-0 truncate text-[12px] font-bold">{d.nombre}</span>
                  </span>
                  <span className={`${mono} w-[80px] shrink-0 text-right text-[12.5px] font-bold`}>{d.validados}</span>
                  <span className={`${mono} w-[80px] shrink-0 text-right text-[12.5px] font-bold ${d.alerta ? 'text-[color:var(--warning-foreground)]' : ''}`}>{d.cola}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Stethoscope aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Sin validaciones en los últimos 30 días.
            </p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Salud del Ateneo">
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            {(
              [
                [String(ateneo.casosSemana), 'casos esta semana', true],
                [`${participacion}%`, 'participación de activos', participacion >= 40],
                [String(ateneo.comentarios), 'comentarios totales', true],
                [String(ateneo.sinResponder), 'sin responder', ateneo.sinResponder === 0],
              ] as const
            ).map(([v, t, ok]) => (
              <div key={t} className={`rounded-[11px] border p-3 ${ok ? 'border-border bg-card' : 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]'}`}>
                <span className={`${mono} block text-[20px] font-extrabold leading-none ${ok ? '' : 'text-[color:var(--warning-foreground)]'}`}>{v}</span>
                <span className={`mt-1.5 block text-[11px] font-bold ${ok ? '' : 'text-[color:var(--warning-foreground)]'}`}>{t}</span>
              </div>
            ))}
          </div>
          <Senal tono="info">
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              La comunidad la sostiene un núcleo de {ateneo.autores} autores de caso.
            </span>
          </Senal>
        </Tarjeta>
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 xl:grid-cols-2">
        {/* #14 Actividad de diseño (CSS · real: recursos + casos curados por autor) */}
        <Tarjeta titulo="Actividad de diseño">
          <div className="mt-3.5 flex items-baseline gap-2.5">
            <span className={`${mono} text-[30px] font-extrabold leading-none tracking-[-0.03em]`}>{diseno.total}</span>
            <span className="text-[12px] font-semibold text-muted-foreground">piezas publicadas</span>
          </div>
          {diseno.barras.length > 0 ? (
            <Barras filas={diseno.barras} color="sidebar" />
          ) : (
            <p className="mt-3 text-[12px] text-muted-foreground">Aún no hay contenido curado ni recursos subidos.</p>
          )}
          <p className="mt-3 text-[11.5px] text-muted-foreground">Recursos de la Biblioteca de Contenido y casos curados al banco.</p>
        </Tarjeta>

        {/* #16 Uso y calidad de Eco — parte real (correcciones §7A); el gasto = placeholder */}
        <Tarjeta
          titulo="Uso y calidad de Eco"
          extra={
            <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground">
              <Sparkles aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              §7A
            </span>
          }
        >
          <div className="mt-3.5 flex items-baseline gap-2.5">
            <span className={`${mono} text-[30px] font-extrabold leading-none tracking-[-0.03em]`}>{ecoCorrecciones}</span>
            <span className="text-[12px] font-semibold text-muted-foreground">correcciones docente→Eco (loop de mejora)</span>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
            Cada corrección del docente sobre una sugerencia de Eco se registra para afinar el modelo (§7A).
          </p>
          {/* gasto/costo por caso: telemetría de la orquestación de Eco (aún no cableada) */}
          <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-[11px] border border-dashed border-border bg-muted/40 px-3.5 py-2.5">
            <span className="min-w-0 flex-1 text-[11.5px] font-semibold leading-snug text-muted-foreground">
              Gasto y costo por caso de Eco
            </span>
            <span className={`${mono} shrink-0 text-[12px] font-bold text-muted-foreground`}>— placeholder</span>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}
