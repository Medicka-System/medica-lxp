import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, TriangleAlert, Users } from 'lucide-react';
import { requireDocente } from '../../../_lib/session';
import { getGrupoSeguimiento } from '../../../_lib/datos';
import { mono, kicker, softText, card, focusRing } from '@/lib/studio/estilos';
import { fechaCorta } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * Seguimiento de un grupo (§5B). Cabecera + temario del programa (referencia). El
 * avance por alumno (quién va atrasado, competencia por dominio) es PENDIENTE: cruza
 * la inscripción de CORA (Sprint 11) con la proyección de competencia (worker · §8).
 */
export default async function GrupoSeguimientoPage({
  params,
}: {
  params: Promise<{ grupoId: string }>;
}) {
  const { userId } = await requireDocente();
  const { grupoId } = await params;
  const g = await getGrupoSeguimiento(userId, grupoId);
  if (!g) notFound();

  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 pb-10 pt-6">
      <Link
        href="/docente/grupos"
        className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-secondary transition-colors hover:text-sidebar ${focusRing}`}
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
        Mis grupos
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">{g.nombre}</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            {g.programa} · {g.modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono'}
            {g.fechaInicio ? ` · inicia ${fechaCorta(g.fechaInicio)}` : ''}
          </p>
        </div>
        <div className={`${mono} flex gap-4 text-[12px] text-muted-foreground`}>
          <span><b className="text-foreground">{g.totales.modulos}</b> módulos</span>
          <span><b className="text-foreground">{g.totales.lecciones}</b> lecciones</span>
          <span><b className="text-foreground">{g.totales.horas}</b> h</span>
        </div>
      </div>

      {/* Seguimiento por alumno — PENDIENTE (competencia + inscripción CORA) */}
      <section className="mt-6 flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-3.5">
        <Users aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <div>
          <p className="text-[13px] font-bold text-[color:var(--info-foreground)]">Seguimiento por alumno — en preparación</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
            El avance de cada alumno (competencia I-AIM por dominio, casos, atrasos) se activa al cruzar
            la inscripción de CORA (Sprint 11) con la proyección que calcula el worker de competencia (§8).
          </p>
        </div>
      </section>

      {/* Temario del programa (referencia real) */}
      <section className="mt-6">
        <div className="flex items-center gap-2.5">
          <h2 className={`${kicker} text-muted-foreground`}>Temario del programa</h2>
          <BookOpen aria-hidden className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        {g.temario.length === 0 ? (
          <div className={`${card} mt-3 flex items-center gap-2.5 px-4 py-6 text-[12.5px] ${softText}`}>
            <TriangleAlert aria-hidden className="h-4 w-4 text-[color:var(--warning-foreground)]" strokeWidth={2} />
            El programa aún no tiene módulos.
          </div>
        ) : (
          <ol className={`${card} mt-3 overflow-hidden`}>
            {g.temario.map((m) => (
              <li key={m.id} className="flex items-center gap-3.5 border-t border-border px-[18px] py-3.5 first:border-t-0">
                <span className={`${mono} grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted text-[12px] font-bold text-secondary`}>
                  {m.clave}
                </span>
                <span className="min-w-0 flex-1 text-[14px] font-semibold">{m.titulo}</span>
                <span className={`${mono} shrink-0 text-[12px] text-muted-foreground`}>
                  {m.lecciones} {m.lecciones === 1 ? 'lección' : 'lecciones'} · {m.horas} h
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
