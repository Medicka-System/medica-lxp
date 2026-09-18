import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { requireDocente } from '../../_lib/session';
import { getGrupos } from '../../_lib/datos';
import { mono, kicker, softText, card, focusRing } from '@/lib/studio/estilos';
import { fechaCorta } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * Grupos del docente (seguimiento · §5B). Solo los grupos que imparte (RLS + filtro
 * `docente_id`). El nº de alumnos y el avance del programa son PENDIENTE (inscripción
 * de CORA · Sprint 11 + proyección de competencia · worker §8).
 */
export default async function GruposDocentePage() {
  const { userId } = await requireDocente();
  const grupos = await getGrupos(userId);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Mis grupos</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>Los grupos que imparte y su seguimiento.</p>
        </div>
        <span className={`${mono} text-[12px] text-muted-foreground`}>{grupos.length} grupos</span>
      </div>

      {grupos.length === 0 ? (
        <div className={`${card} mt-6 px-6 py-10 text-center text-[13px] ${softText}`}>
          Aún no tiene grupos asignados. El admin le asigna grupos desde el Studio.
        </div>
      ) : (
        <div className={`${card} mt-6 overflow-hidden`}>
          <div className="flex items-center gap-4 bg-muted px-[18px] py-2.5">
            {(
              [
                ['Grupo', 'flex-[1.6]'],
                ['Modalidad', 'w-[120px] shrink-0'],
                ['Inicio', 'w-[90px] shrink-0'],
                ['Alumnos', 'w-[110px] shrink-0 text-right'],
                ['', 'w-[17px] shrink-0'],
              ] as const
            ).map(([t, cls]) => (
              <span key={t || 'chev'} className={`${kicker} ${cls} whitespace-nowrap text-muted-foreground`}>
                {t}
              </span>
            ))}
          </div>
          {grupos.map((g) => (
            <Link
              key={g.id}
              href={`/docente/grupos/${g.id}`}
              className={`flex items-center gap-4 border-t border-border px-[18px] py-4 transition-colors hover:bg-muted ${focusRing}`}
            >
              <span className="min-w-0 flex-[1.6]">
                <span className="block text-[14px] font-bold leading-snug">{g.nombre}</span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">{g.programa}</span>
              </span>
              <span className="w-[120px] shrink-0 text-[12.5px] font-semibold text-foreground-soft">
                {g.modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono'}
              </span>
              <span className={`${mono} w-[90px] shrink-0 text-[12.5px] text-muted-foreground`}>
                {g.fechaInicio ? fechaCorta(g.fechaInicio) : '—'}
              </span>
              <span className="flex w-[110px] shrink-0 items-center justify-end gap-1.5 text-[12.5px] font-semibold text-foreground-soft">
                <Users aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                <span className="text-muted-foreground">—</span>
              </span>
              <ChevronRight aria-hidden className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={2} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
