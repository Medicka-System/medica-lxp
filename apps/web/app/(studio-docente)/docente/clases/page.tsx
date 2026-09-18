import { Video, Radio, Film, Info } from 'lucide-react';
import { requireDocente } from '../../_lib/session';
import { getClases } from '../../_lib/datos';
import { mono, kicker, softText, card, focusRing } from '@/lib/studio/estilos';

export const dynamic = 'force-dynamic';

/**
 * Clases en vivo (§5B, §9). El docente inicia la clase desde el Studio (lanza Zoom;
 * el video corre en Zoom, sin SDK embebido). Aquí los **grupos** del docente son la
 * base real de la agenda; cada uno ofrece dos formas de dar clase en vivo:
 *  · Zoom  → «Iniciar clase» (lanza la reunión).
 *  · MiCo+ (Mindray) → «Enlazar sesión» (plataforma cerrada; se agenda/enlaza).
 *
 * Los lanzamientos y la lista de grabaciones son PENDIENTE DE API con contrato
 * (`_lib/contrato-media.ts`): crear/iniciar reunión Zoom y el worker
 * `ingesta-grabacion-zoom` que deja la grabación en la videoteca del grupo.
 */
export default async function ClasesPage() {
  const { userId } = await requireDocente();
  const grupos = await getClases(userId);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 pb-10 pt-7">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Clases en vivo</h1>
        <p className={`mt-1 text-[13px] ${softText}`}>
          Inicie la clase de cada grupo por Zoom o enlace una sesión de MiCo+. La grabación cae
          luego en la videoteca del grupo.
        </p>
      </div>

      {/* Aviso: integración Zoom/MiCo+ pendiente (Sprint 6) */}
      <section className="mt-6 flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-3.5">
        <Info aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <div>
          <p className="text-[13px] font-bold text-[color:var(--info-foreground)]">
            Lanzamiento de clases — en preparación
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
            Crear/agendar reuniones e «Iniciar clase» se activan al conectar Zoom (Sprint 6). Las
            grabaciones no se quedan en Zoom Cloud: el worker <span className="font-semibold">ingesta-grabacion-zoom</span>{' '}
            las pasa a la videoteca ligadas al grupo/lección. MiCo+ (Mindray) es plataforma cerrada:
            por ahora se enlaza/agenda.
          </p>
        </div>
      </section>

      <section className="mt-7">
        <h2 className={`${kicker} text-muted-foreground`}>Sus grupos</h2>
        {grupos.length === 0 ? (
          <div className={`${card} mt-3 px-6 py-10 text-center text-[13px] ${softText}`}>
            No tiene grupos asignados todavía.
          </div>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {grupos.map((g) => (
              <li key={g.grupoId}>
                <article className={`${card} flex h-full flex-col p-5`}>
                  <span className="inline-flex h-6 w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-foreground-soft">
                    {g.modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono'}
                  </span>
                  <p className="mt-3 text-[15px] font-bold leading-snug">{g.grupo}</p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">{g.programa}</p>

                  <div className="flex-1" />

                  {/* Dos formas de dar clase en vivo (PENDIENTE DE API · Sprint 6) */}
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Disponible al conectar Zoom (Sprint 6)"
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border bg-muted text-[13.5px] font-semibold text-muted-foreground ${focusRing}`}
                    >
                      <Video aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                      Iniciar clase · Zoom
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Integración MiCo+ (Mindray) pendiente de acuerdo"
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-muted-foreground ${focusRing}`}
                    >
                      <Radio aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                      Enlazar sesión · MiCo+
                    </button>
                  </div>
                  <p className={`${mono} mt-2 text-center text-[10.5px] text-muted-foreground`}>
                    Se habilita con la API (Sprint 6)
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Clases pasadas y grabaciones — PENDIENTE DE API (ingesta Zoom) */}
      <section className="mt-9">
        <h2 className={`${kicker} text-muted-foreground`}>Clases pasadas y grabaciones</h2>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-3.5">
          <Film aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
          <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
            Las grabaciones llegan solas de Zoom unos minutos después de terminar (webhook{' '}
            <span className="font-semibold">recording.completed</span> → worker{' '}
            <span className="font-semibold">ingesta-grabacion-zoom</span>) y se ligan a la lección de
            la clase. <span className="font-bold">Pendiente de API/DB</span> (tabla de grabaciones e
            ingesta · Sprint 6).
          </p>
        </div>
        <div className={`${card} mt-3 px-6 py-10 text-center text-[13px] ${softText}`}>
          Aún no hay grabaciones de sus clases.
        </div>
      </section>
    </div>
  );
}
