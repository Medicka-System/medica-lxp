import Link from 'next/link';
import { ArrowUpRight, BookOpen, Check, Clock } from 'lucide-react';
import { card, mono } from '@/components/tokens';
import { Badge } from '@/components/ui/badge';
import type { ProgramaCatalogo } from '@/lib/campus/cursos-contrato';

/**
 * Ficha de programa en el catálogo (Explorar). Muestra el desglose de módulos como
 * unidades acreditables (upsell modular). Componente de servidor: la inscripción/
 * checkout es del portal de CORA (§1).
 *
 * CTA "Inscribirme" → deep-link REAL al checkout de CORA, PARAMETRIZADO por
 * `NEXT_PUBLIC_CORA_URL` (mismo env que el resto del puente CORA↔LXP). Convención de
 * ruta: `<CORA_URL>/checkout?programa=<id>`. Si el env no está definido (dev/local o
 * hasta cerrar la ruta real en el Sprint 11), cae al placeholder interno `/pagos` que
 * explica dónde se paga — nunca a un enlace roto. Aquí no se cobra ni se inscribe.
 */
export function FichaCatalogo({ programa }: { programa: ProgramaCatalogo }) {
  const coraBase = (process.env.NEXT_PUBLIC_CORA_URL ?? '').replace(/\/+$/, '');
  const inscribirHref = coraBase
    ? `${coraBase}/checkout?programa=${encodeURIComponent(programa.programaId)}`
    : '/pagos';

  return (
    <article className={`${card} flex flex-col overflow-hidden`}>
      {/* Encabezado */}
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-sidebar text-sidebar-foreground">
              <BookOpen className="h-[21px] w-[21px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold leading-snug">{programa.nombre}</h2>
              {programa.descripcion && (
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">{programa.descripcion}</p>
              )}
            </div>
          </div>
          {programa.inscrito && (
            <Badge variant="accent" size="sm" className="shrink-0">
              <Check className="h-3 w-3" strokeWidth={2.5} /> Inscrito
            </Badge>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-[15px] w-[15px]" strokeWidth={1.75} />
            <span className={mono}>{programa.horas}</span> horas
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className={mono}>{programa.modulosLista.length}</span> módulos ·{' '}
            <span className={mono}>{programa.lecciones}</span> lecciones
          </span>
        </div>
      </div>

      {/* Desglose modular (upsell) */}
      <div className="flex-1 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Contenido por módulo</p>
        <ol className="mt-3 space-y-2">
          {programa.modulosLista.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-[10px] border border-border bg-muted/50 px-3 py-2.5">
              <span aria-hidden className={`${mono} grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-[12px] font-bold text-secondary`}>
                {m.orden}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{m.nombre}</span>
              <span className="shrink-0 text-[11.5px] text-muted-foreground">
                <span className={mono}>{m.lecciones}</span> lec · <span className={mono}>{m.horas}</span> h
              </span>
            </li>
          ))}
          {programa.modulosLista.length === 0 && (
            <li className="rounded-[10px] border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-muted-foreground">
              Este programa aún no tiene módulos publicados.
            </li>
          )}
        </ol>
      </div>

      {/* CTA */}
      <div className="border-t border-border p-5">
        {programa.inscrito ? (
          <Link
            href="/cursos"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-control border border-border bg-card text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Ir a mis cursos
          </Link>
        ) : coraBase ? (
          <a
            href={inscribirHref}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-secondary"
          >
            Inscribirme
            <ArrowUpRight className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </a>
        ) : (
          <Link
            href="/pagos"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-secondary"
          >
            Inscribirme
            <ArrowUpRight className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </Link>
        )}
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          La inscripción y el pago se gestionan en el portal de la escuela.
        </p>
      </div>
    </article>
  );
}
