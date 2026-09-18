'use client';

/**
 * Studio · Grupos (vista global del admin) — CONSULTA Y SEGUIMIENTO, solo lectura.
 * A diferencia de la vista de Grupos del diseñador (que instancia y personaliza),
 * aquí el admin ve TODOS los grupos de todos los programas para dar seguimiento.
 * Datos reales vía RLS (`lxp.grupos`, herencia §6). La edición vive en el Studio de
 * autoría; esta vista no crea ni modifica.
 */
import { useMemo, useState } from 'react';
import { CalendarDays, Layers, Lock, Search } from 'lucide-react';
import { mono, softText, focusRing } from '@/components/tokens';
import { fechaCorta } from '@/lib/format';
import type { GrupoResumen, EstadoGrupo } from '@/lib/studio/datos';

const ESTADO: Record<EstadoGrupo, { etiqueta: string; clase: string }> = {
  proximo: {
    etiqueta: 'Próximo',
    clase: 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
  },
  curso: { etiqueta: 'En curso', clase: 'bg-accent text-accent-foreground' },
  finalizado: { etiqueta: 'Finalizado', clase: `border border-border bg-muted text-muted-foreground` },
};

function rango(inicio: Date | null, fin: Date | null): string {
  if (!inicio && !fin) return 'sin fechas · asíncrono';
  const i = inicio ? fechaCorta(inicio) : '—';
  const f = fin ? fechaCorta(fin) : 'abierto';
  return `${i} → ${f}`;
}

export function GruposAdmin({ grupos }: { grupos: GrupoResumen[] }) {
  const [busca, setBusca] = useState('');
  const [estado, setEstado] = useState<'todos' | EstadoGrupo>('todos');

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return grupos.filter(
      (g) =>
        (estado === 'todos' || g.estado === estado) &&
        (!q || g.nombre.toLowerCase().includes(q) || g.programaNombre.toLowerCase().includes(q)),
    );
  }, [grupos, busca, estado]);

  const conteos = {
    total: grupos.length,
    curso: grupos.filter((g) => g.estado === 'curso').length,
    proximo: grupos.filter((g) => g.estado === 'proximo').length,
    finalizado: grupos.filter((g) => g.estado === 'finalizado').length,
  };

  const tabs: ['todos' | EstadoGrupo, string, number][] = [
    ['todos', 'Todos', conteos.total],
    ['curso', 'En curso', conteos.curso],
    ['proximo', 'Próximos', conteos.proximo],
    ['finalizado', 'Finalizados', conteos.finalizado],
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Grupos</h1>
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-muted-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Instancia y edición: Studio de autoría
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Todos los grupos de todos los programas. Vista global de consulta y seguimiento; instanciar y personalizar se hace en el Studio del diseñador.
          </p>
        </div>
      </div>

      <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ['Grupos', String(conteos.total), 'instancias creadas'],
            ['En curso', String(conteos.curso), 'con actividad ahora'],
            ['Próximos', String(conteos.proximo), 'por iniciar'],
            ['Finalizados', String(conteos.finalizado), 'ciclo cerrado'],
          ] as const
        ).map(([t, v, s]) => (
          <li key={t} className="rounded-xl border border-border bg-card p-4 shadow-rest">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t}</p>
            <p className={`${mono} mt-2.5 text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>{v}</p>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{s}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[280px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar grupo o programa</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar grupo o programa…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {tabs.map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setEstado(id)}
              aria-pressed={estado === id}
              className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                estado === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${estado === id ? 'text-white/70' : 'text-muted-foreground'}`}>{n}</span>
            </button>
          ))}
        </div>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {visibles.length} de {grupos.length}
        </span>
      </div>

      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
          {(
            [
              ['Grupo', 'flex-[1.5]'],
              ['Programa', 'flex-[1.4] min-w-0'],
              ['Modalidad', 'shrink-0 w-[110px]'],
              ['Fechas', 'shrink-0 w-[150px]'],
              ['Docente', 'shrink-0 w-[160px]'],
              ['Estado', 'shrink-0 w-[120px]'],
            ] as const
          ).map(([t, cls]) => (
            <span key={t} className={`${cls} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}>
              {t}
            </span>
          ))}
        </div>

        {visibles.length === 0 ? (
          <p className="border-t border-border px-[18px] py-8 text-center text-[12.5px] text-muted-foreground">
            No hay grupos que coincidan con el filtro.
          </p>
        ) : (
          visibles.map((g) => (
            <div key={g.id} className="flex items-center gap-3.5 border-t border-border px-[18px] py-3.5">
              <span className="min-w-0 flex-[1.5]">
                <span className="block truncate text-[13px] font-bold leading-snug">{g.nombre}</span>
                {g.overrides > 0 && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                    <Layers aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                    {g.overrides} personalización{g.overrides === 1 ? '' : 'es'}
                  </span>
                )}
              </span>

              <span className="min-w-0 flex-[1.4]">
                <span className="block truncate text-[12px] font-semibold">{g.programaNombre}</span>
                <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>v{g.programaVersion}</span>
              </span>

              <span className="w-[110px] shrink-0 text-[12px] capitalize text-foreground">
                {g.modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono'}
              </span>

              <span className={`${mono} flex w-[150px] shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground`}>
                <CalendarDays aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                {rango(g.fechaInicio, g.fechaFin)}
              </span>

              <span className="w-[160px] shrink-0 truncate text-[12px] text-foreground">
                {g.docente ?? <span className="text-muted-foreground">sin docente</span>}
              </span>

              <span className="w-[120px] shrink-0">
                <span className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[g.estado].clase}`}>
                  {ESTADO[g.estado].etiqueta}
                </span>
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
