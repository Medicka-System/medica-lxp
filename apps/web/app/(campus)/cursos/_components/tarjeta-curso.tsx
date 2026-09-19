import Link from 'next/link';
import { BookOpen, Clock, Layers, Play } from 'lucide-react';
import { card, mono } from '@/components/tokens';
import type { CursoResumen } from '@/lib/campus/cursos-contrato';

/** Tarjeta de curso en Mis cursos: avance, meta y "Continuar". Componente de servidor. */
export function TarjetaCurso({ curso }: { curso: CursoResumen }) {
  const iniciado = curso.completados > 0;
  const destino = curso.continuar ? `/leccion/${curso.continuar.leccionId}` : null;

  return (
    <article className={`${card} flex flex-col overflow-hidden`}>
      {/* Franja de marca (sin gradientes salvo hero · §5A) */}
      <div className="h-1.5 w-full bg-primary" aria-hidden />

      <div className="flex min-h-0 flex-1 flex-col p-[18px]">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-accent text-accent-foreground">
            <BookOpen className="h-[21px] w-[21px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-bold leading-snug">{curso.nombre}</h2>
            {curso.descripcion && (
              <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted-foreground">{curso.descripcion}</p>
            )}
          </div>
        </div>

        {/* Meta del temario */}
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-[10px] bg-muted py-2">
            <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Módulos</dt>
            <dd className={`${mono} text-[15px] font-bold`}>{curso.modulos}</dd>
          </div>
          <div className="rounded-[10px] bg-muted py-2">
            <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Lecciones</dt>
            <dd className={`${mono} text-[15px] font-bold`}>{curso.lecciones}</dd>
          </div>
          <div className="rounded-[10px] bg-muted py-2">
            <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Horas</dt>
            <dd className={`${mono} text-[15px] font-bold`}>{curso.horas}</dd>
          </div>
        </dl>

        {/* Avance */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11.5px] font-semibold">
            <span className="text-muted-foreground">Avance</span>
            <span className={`${mono} text-foreground`}>{curso.avancePct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-pill bg-[color:var(--track)]" role="progressbar" aria-valuenow={curso.avancePct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-pill bg-primary transition-[width] duration-300" style={{ width: `${curso.avancePct}%` }} />
          </div>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">
            {curso.completados} de {curso.contenidos} contenidos completados
          </p>
        </div>

        <div className="mt-auto pt-4">
          {destino ? (
            <Link
              href={destino}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-secondary"
            >
              {iniciado ? <Play className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Layers className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              {iniciado ? 'Continuar' : 'Comenzar curso'}
            </Link>
          ) : (
            <span className="flex h-11 w-full items-center justify-center gap-2 rounded-control border border-border bg-muted text-[13px] font-semibold text-muted-foreground">
              <Clock className="h-[17px] w-[17px]" strokeWidth={1.75} />
              Sin lecciones publicadas
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
