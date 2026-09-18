import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  ClipboardCheck,
  MessageSquare,
  ScanLine,
  Sparkles,
  TriangleAlert,
  Users,
  Video,
} from 'lucide-react';
import { requireDocente } from '../_lib/session';
import { getDashboard } from '../_lib/datos';
import type { PostAteneoResumen } from '../_lib/contrato';
import { mono, kicker, softText, card, focusRing } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import { EcoPanel } from '../_components/eco-panel';

export const dynamic = 'force-dynamic';

/**
 * Inicio del DOCENTE — la BANDEJA de trabajo (no un dashboard de vanidad · §5B). Lo
 * primero son las colas que dependen de él, cada una con su conteo real (RLS) y un
 * CTA. Eco arriba como copiloto (placeholder · §7A). Un solo color de atención:
 * ÁMBAR para lo que urge; sin rojo (nada aquí es dinero vencido · §5A).
 */
export default async function DocenteInicio() {
  const { userId } = await requireDocente();
  const data = await getDashboard(userId);
  const { pendientes, grupos, ateneo, totalGrupos } = data;

  const totalPendientes = pendientes.casos + pendientes.entregas + pendientes.foros;
  const sinPendientes = totalPendientes === 0;

  const colas = [
    {
      tipo: 'casos' as const,
      titulo: 'Casos por validar',
      n: pendientes.casos,
      unidad: 'de sus alumnos',
      Icono: ScanLine,
      href: '/docente/validacion',
      cta: 'Ir a validar',
      urgente: pendientes.casos > 0,
    },
    {
      tipo: 'entregas' as const,
      titulo: 'Entregas por revisar',
      n: pendientes.entregas,
      unidad: 'tareas y autoevaluaciones',
      Icono: ClipboardCheck,
      href: '/docente/entregas',
      cta: 'Revisar entregas',
      urgente: false,
    },
    {
      tipo: 'foros' as const,
      titulo: 'Foros con actividad',
      n: pendientes.foros,
      unidad: 'hilos sin respuesta',
      Icono: MessageSquare,
      href: '/docente/grupos',
      cta: 'Ver grupos',
      urgente: false,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-6">
      {/* Eco — copiloto (placeholder) */}
      <EcoPanel
        resumen="Cuando se conecte, Eco pre-analiza sus casos y entregas y le deja el trabajo listo para confirmar."
        sugerencias={[
          'Resúmeme las entregas del Grupo B',
          'Dame los mejores casos de esta semana',
          'Redacta el feedback para los que reprobaron',
        ]}
      />

      <div className="mt-1 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {/* ══════ PENDIENTES · protagonista ══════ */}
          <section className="mt-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className={`${kicker} text-muted-foreground`}>Pendientes de hoy</h2>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {totalPendientes} en total · {totalGrupos} grupos
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] font-semibold text-[color:var(--info-foreground)]">
                <Sparkles aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                Eco propone; usted confirma. Nada se asienta sin su aprobación.
              </span>
            </div>

            {sinPendientes ? (
              <div className="mt-3.5 rounded-[14px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-9 py-11 text-center">
                <span
                  aria-hidden
                  className="inline-grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-accent-foreground"
                >
                  <Check className="h-[26px] w-[26px]" strokeWidth={2.2} />
                </span>
                <h3 className="mt-3.5 text-[18px] font-extrabold tracking-[-0.015em]">Bandeja al día</h3>
                <p className={`mx-auto mt-2 max-w-[52ch] text-[13.5px] leading-relaxed ${softText}`}>
                  No hay casos, entregas ni foros esperando. Cuando un alumno suba un caso o entregue
                  una tarea, aparecerá aquí.
                </p>
              </div>
            ) : (
              <ul className="mt-3.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {colas.map((p) => (
                  <li key={p.tipo}>
                    <article
                      className={`flex h-full flex-col rounded-xl border bg-card p-5 shadow-rest transition-colors hover:border-primary ${
                        p.urgente ? 'border-[color:var(--warning-border)]' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] ${
                            p.urgente
                              ? 'bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                              : 'bg-accent text-accent-foreground'
                          }`}
                        >
                          <p.Icono className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </span>
                        <p className="min-w-0 flex-1 text-[14px] font-bold leading-snug">{p.titulo}</p>
                        {p.urgente && (
                          <span className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                            <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} />
                            Atender
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-baseline gap-2.5">
                        <span className={`${mono} text-[44px] font-extrabold leading-none tracking-[-0.03em]`}>
                          {p.n}
                        </span>
                        <span className="text-[13px] font-semibold text-muted-foreground">{p.unidad}</span>
                      </div>

                      <div className="mt-3.5 flex items-center gap-1.5 rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 py-2">
                        <Sparkles
                          aria-hidden
                          className="h-3.5 w-3.5 shrink-0 text-[color:var(--info-foreground)]"
                          strokeWidth={1.75}
                        />
                        <span className="min-w-0 flex-1 text-[11.5px] font-bold text-[color:var(--info-foreground)]">
                          Eco los analizará al conectarse
                        </span>
                      </div>

                      <div className="flex-1" />

                      <Link
                        href={p.href}
                        className={`mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-bold transition-colors ${focusRing} ${
                          p.urgente
                            ? 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
                            : 'bg-accent text-accent-foreground hover:bg-[color:var(--track)]'
                        }`}
                      >
                        {p.cta}
                        <ArrowRight aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ══════ MIS GRUPOS · solo los que imparte ══════ */}
          <section className="mt-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className={`${kicker} text-muted-foreground`}>Mis grupos</h2>
              <Link
                href="/docente/grupos"
                className={`ml-auto inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Ver todos
                <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>

            {grupos.length === 0 ? (
              <div className={`${card} mt-3.5 px-6 py-8 text-center text-[13px] ${softText}`}>
                Aún no tiene grupos asignados. El admin le asigna grupos desde el Studio.
              </div>
            ) : (
              <div className={`${card} mt-3.5 overflow-hidden`}>
                {grupos.map((g) => (
                  <Link
                    key={g.id}
                    href={`/docente/grupos/${g.id}`}
                    className={`flex items-center gap-4 border-t border-border px-[18px] py-4 first:border-t-0 transition-colors hover:bg-muted ${focusRing}`}
                  >
                    <span className="min-w-0 flex-[1.4]">
                      <span className="block text-[14px] font-bold leading-snug">{g.nombre}</span>
                      <span className="mt-0.5 block text-[12px] text-muted-foreground">
                        {g.programa} · {g.modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono'}
                      </span>
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold ${softText}`}>
                      <Users aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      {g.alumnos === null ? (
                        <span className="text-muted-foreground">— alumnos</span>
                      ) : (
                        <>
                          <span className={`${mono} font-bold text-foreground`}>{g.alumnos}</span> alumnos
                        </>
                      )}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="h-[17px] w-[17px] shrink-0 text-muted-foreground"
                      strokeWidth={2}
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ══════ RAIL: próxima clase (PENDIENTE Zoom) + Ateneo ══════ */}
        <div className="mt-5 min-w-0 space-y-5">
          {/* Próxima clase — PENDIENTE de integración Zoom (Sprint 6 · §9). */}
          <section className={`${card} p-5`}>
            <span
              className={`inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[11px] font-bold ${softText}`}
            >
              <Calendar aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              Clases
            </span>
            <p className="mt-3.5 text-[14.5px] font-bold leading-snug">Clases en vivo por Zoom</p>
            <p className={`mt-1.5 text-[12.5px] leading-relaxed ${softText}`}>
              La agenda e «Iniciar clase» se activan al conectar Zoom (Sprint 6). Por ahora, revise
              sus grupos y prepare la sesión.
            </p>
            <Link
              href="/docente/clases"
              className={`mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              <Video aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
              Ver mis clases
            </Link>
          </section>

          {/* Ateneo: vistazo accionable de sus grupos */}
          <section className={`${card} p-5`}>
            <div className="flex items-center gap-2.5">
              <h2 className={`${kicker} text-muted-foreground`}>Ateneo · de sus grupos</h2>
            </div>
            {ateneo.length === 0 ? (
              <p className={`mt-3 text-[12.5px] ${softText}`}>Sin actividad reciente en el Ateneo.</p>
            ) : (
              <ul className="mt-2.5 flex flex-col gap-0.5">
                {ateneo.map((p) => (
                  <AteneoFila key={p.id} post={p} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function AteneoFila({ post }: { post: PostAteneoResumen }) {
  const tipoLabel =
    post.tipo === 'caso' ? 'Caso' : post.tipo === 'encuesta' ? 'Encuesta' : 'Anuncio';
  return (
    <li className="flex gap-2.5 rounded-[10px] px-2.5 py-3">
      <span
        aria-hidden
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-sidebar text-[11.5px] font-bold text-sidebar-foreground"
      >
        {post.iniciales}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] font-bold">{post.autor}</span>
          <span className="inline-flex h-[19px] items-center rounded-full border border-border bg-muted px-1.5 text-[10px] font-semibold text-foreground-soft">
            {tipoLabel}
          </span>
          {post.estado === 'pendiente' && (
            <span className="inline-flex h-[19px] items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[10px] font-bold text-[color:var(--warning-foreground)]">
              Por moderar
            </span>
          )}
        </span>
        <span className="mt-1 block text-[12.5px] font-medium leading-relaxed text-foreground-soft" style={{ textWrap: 'pretty' }}>
          {post.titulo}
        </span>
        <span className={`${mono} mt-1 block text-[11px] text-muted-foreground`}>
          {post.comentarios} comentarios · {haceCuanto(post.creadoEn)}
        </span>
      </span>
    </li>
  );
}
