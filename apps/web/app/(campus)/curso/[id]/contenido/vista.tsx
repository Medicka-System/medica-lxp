'use client';

/**
 * Curso · CONTENIDO — un card por módulo. Banda navy 16:7 con el número en mono y un
 * degradado cuyo origen cambia por módulo. El módulo actual lleva borde teal + halo y
 * "Continuar". Los módulos y su avance son datos reales (RLS · §2); no hay portada ni
 * tarjetas de Inicio/Cierre (no existen en el modelo).
 */

import { useRouter } from 'next/navigation';
import { ArrowRight, Check, GraduationCap, Lightbulb, Lock, LogIn } from 'lucide-react';
import type { Modulo } from '../_components/curso';
import { CabeceraPagina, Chip, card, focusRing, mono } from '../_components/curso';

const ICONO = { bombilla: Lightbulb, entrada: LogIn, birrete: GraduationCap } as const;

function TarjetaModulo({ m, onAbrir }: { m: Modulo; onAbrir: (id: string) => void }) {
  const actual = m.estado === 'actual';
  const pct = m.total ? Math.round((m.hechos / m.total) * 100) : 0;
  const Icono = m.icono ? ICONO[m.icono] : null;
  const bloqueado = m.estado === 'bloqueado';

  return (
    <button
      type="button"
      onClick={() => !bloqueado && onAbrir(m.id)}
      aria-disabled={bloqueado}
      className={`flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-primary ${focusRing} ${
        actual ? 'border-primary shadow-[0_0_0_3px_rgba(83,195,190,0.18)]' : 'border-border shadow-[0_1px_3px_rgba(17,24,39,0.06)]'
      } ${bloqueado ? 'cursor-not-allowed' : ''}`}
    >
      <span aria-hidden className="relative grid w-full place-items-center overflow-hidden" style={{ aspectRatio: '16 / 7', background: 'var(--sidebar)' }}>
        {m.portadaUrl ? (
          <img src={m.portadaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0" style={{ background: `radial-gradient(90% 140% at ${m.luz}, rgba(26,136,128,.72) 0%, rgba(15,45,82,0) 62%)` }} />
        )}
        {m.numero !== undefined ? (
          <span className={`${mono} relative text-[52px] font-extrabold leading-none tracking-[-0.04em] text-white`}>
            {String(m.numero).padStart(2, '0')}
          </span>
        ) : (
          Icono && (
            <span className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10 text-primary">
              <Icono className="h-7 w-7" strokeWidth={1.75} />
            </span>
          )
        )}
        {m.estado === 'completado' && (
          <span className="absolute right-2.5 top-2.5 grid h-[26px] w-[26px] place-items-center rounded-full bg-primary text-[color:var(--sidebar)]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
          </span>
        )}
      </span>

      <span className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <span className={`text-[10.5px] font-semibold uppercase tracking-[0.14em] ${actual ? 'text-secondary' : 'text-muted-foreground'}`}>
          {m.kicker}
        </span>
        <span className="mt-1.5 text-[14.5px] font-bold leading-snug" style={{ textWrap: 'pretty' }}>
          {m.titulo}
        </span>
        <span className={`${mono} mt-1 text-[11.5px] text-muted-foreground`}>{m.meta}</span>

        {m.total > 0 ? (
          <span className="mt-3.5 flex items-center gap-2.5">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Avance de ${m.titulo}`}>
              <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </span>
            <span className={`${mono} shrink-0 text-[11px] font-bold`}>
              {m.hechos}/{m.total}
            </span>
          </span>
        ) : (
          <span className="mt-3.5 block h-1.5" />
        )}

        <span className="mt-3.5 flex items-center gap-2 border-t border-border pt-3">
          {m.estado === 'completado' && <Chip tono="ok" icono={<Check className="h-[11px] w-[11px]" strokeWidth={2.2} />}>Completado</Chip>}
          {m.estado === 'actual' && <Chip tono="ok">En curso</Chip>}
          {m.estado === 'en-curso' && <Chip tono="neutro">En curso</Chip>}
          {m.estado === 'por-empezar' && <Chip tono="neutro">Por empezar</Chip>}
          {bloqueado && <Chip tono="neutro" icono={<Lock className="h-[11px] w-[11px]" strokeWidth={2.2} />}>Bloqueado</Chip>}
          {actual && (
            <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-secondary">
              Continuar
              <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export function ContenidoVista({
  cursoId,
  contexto,
  avancePct,
  completos,
  modulos,
}: {
  cursoId: string;
  contexto: string;
  avancePct: number;
  completos: number;
  modulos: Modulo[];
}) {
  const router = useRouter();
  const onAbrir = (id: string) => router.push(`/curso/${cursoId}/modulo/${id}`);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina
        titulo="Contenido"
        contexto={contexto}
        sub={
          modulos.length
            ? `${completos} de ${modulos.length} módulos completados · ${avancePct}% del programa.`
            : 'Este programa aún no tiene módulos publicados.'
        }
        acciones={
          <span className={`${card} flex h-10 items-center gap-2.5 px-3.5`}>
            <span className="h-1.5 w-[120px] overflow-hidden rounded-full bg-[color:var(--track)]">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${avancePct}%` }} />
            </span>
            <span className={`${mono} text-[12px] font-bold`}>{avancePct}%</span>
            <span className="text-[11.5px] text-muted-foreground">del programa</span>
          </span>
        }
      />
      {modulos.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modulos.map((m) => (
            <TarjetaModulo key={m.id} m={m} onAbrir={onAbrir} />
          ))}
        </div>
      ) : (
        <div className={`${card} px-6 py-14 text-center text-[13px] text-muted-foreground`}>
          No hay módulos que mostrar todavía.
        </div>
      )}
    </div>
  );
}
