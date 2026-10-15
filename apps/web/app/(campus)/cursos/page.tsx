import Link from 'next/link';
import { Compass, Clock } from 'lucide-react';
import { getSesionAlumno } from '@/lib/session';
import { getMisCursos, getCursosPendientes } from '@/lib/campus/cursos-datos';
import { kicker } from '@/components/tokens';
import { EntradaLista } from '@/components/ui/entrada-lista';
import { TarjetaCurso } from './_components/tarjeta-curso';

export const dynamic = 'force-dynamic';

/**
 * Mis cursos (§ Sprint 8) — programas en los que el alumno participa, con avance
 * y "Continuar donde lo dejaste". Lee lxp.programas/modulos + su progreso con RLS
 * (comoAlumno). Ver cursos-contrato para inscripción REAL vs heurística (PENDIENTE).
 */
export default async function CursosPage() {
  const alumno = await getSesionAlumno();
  // `getMisCursos` corre el reflejo CORA→LXP antes de resolver; `getCursosPendientes`
  // lee después (grupos cuyo programa el diseñador aún no ligó · PUENTE 1).
  const cursos = await getMisCursos(alumno.userId);
  const pendientes = await getCursosPendientes(alumno.userId);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`${kicker} text-secondary`}>Aprender</p>
          <h1 className="mt-1 text-[22px] font-bold leading-tight">Mis cursos</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Retoma donde lo dejaste. Tu avance se mide por lo que completas, no por el tiempo.
          </p>
        </div>
        <Link
          href="/explorar"
          className="inline-flex h-11 items-center gap-2 rounded-control border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent"
        >
          <Compass className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
          Explorar el catálogo
        </Link>
      </header>

      {cursos.length === 0 && pendientes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-[15px] font-bold">Aún no tienes cursos activos</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13.5px] text-muted-foreground">
            Explora el catálogo para inscribirte en un programa y comenzar a acumular horas.
          </p>
          <Link
            href="/explorar"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-secondary"
          >
            <Compass className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Ver programas
          </Link>
        </div>
      ) : (
        <>
          {cursos.length > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {/* Entrada escalonada de las tarjetas (§5A · EntradaLista). */}
              <EntradaLista>
                {cursos.map((c) => (
                  <TarjetaCurso key={c.programaId} curso={c} />
                ))}
              </EntradaLista>
            </div>
          )}

          {/* Contenido pendiente: inscrito en CORA, pero su programa aún no tiene
              contenido ligado en el LXP (PUENTE 1). No es un curso ni el catálogo. */}
          {pendientes.length > 0 && (
            <section className="mt-9">
              <p className={`${kicker} text-muted-foreground`}>Contenido pendiente</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Ya estás inscrito, pero aún estamos preparando el contenido de{' '}
                {pendientes.length === 1 ? 'este curso' : 'estos cursos'}. Te avisaremos cuando esté listo.
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {pendientes.map((p) => (
                  <li
                    key={p.coraGrupoId}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3.5"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
                    >
                      <Clock className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-foreground">{p.programaNombre}</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                        {p.grupoNombre} · contenido en preparación
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
