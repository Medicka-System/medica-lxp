import { Video } from 'lucide-react';
import { requireDocente } from '../../_lib/session';
import { getClases } from '../../_lib/datos';
import { mono, kicker, softText, card, focusRing } from '@/lib/studio/estilos';

export const dynamic = 'force-dynamic';

/**
 * Clases en vivo (§5B). El docente inicia la clase desde el Studio (lanza Zoom; el
 * video corre en Zoom · §9). La creación/agenda de reuniones y el botón «Iniciar
 * clase» real son PENDIENTE DE API (integración Zoom · Sprint 6): aquí se listan sus
 * grupos como base de la agenda, con el hueco listo para el CTA de lanzamiento.
 */
export default async function ClasesPage() {
  const { userId } = await requireDocente();
  const grupos = await getClases(userId);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 pb-10 pt-7">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Clases en vivo</h1>
        <p className={`mt-1 text-[13px] ${softText}`}>
          Inicie la clase de cada grupo por Zoom. La grabación cae luego en la videoteca del grupo.
        </p>
      </div>

      {/* Aviso: integración Zoom pendiente (Sprint 6) */}
      <section className="mt-6 flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-3.5">
        <Video aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <div>
          <p className="text-[13px] font-bold text-[color:var(--info-foreground)]">Zoom — en preparación</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
            Crear/agendar reuniones e «Iniciar clase» se activan al conectar Zoom (Sprint 6). Las
            grabaciones no se quedan en Zoom Cloud: pasan a la videoteca ligadas al grupo/lección.
          </p>
        </div>
      </section>

      <section className="mt-6">
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
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="Disponible al conectar Zoom (Sprint 6)"
                    className={`mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border bg-muted text-[13.5px] font-semibold text-muted-foreground ${focusRing}`}
                  >
                    <Video aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    Iniciar clase
                  </button>
                  <p className={`${mono} mt-2 text-center text-[10.5px] text-muted-foreground`}>
                    Se habilita con Zoom (Sprint 6)
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
