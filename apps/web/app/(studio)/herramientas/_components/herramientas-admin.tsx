'use client';

/**
 * Studio · Herramientas — administrador de contenido clínico configurable (§5B).
 * Tres herramientas, un patrón: sub-nav + lista con estado/uso + crear. La ESTRUCTURA
 * de administración (crear/renombrar/publicar) es CRUD real bajo RLS es_autoria; el
 * CONTENIDO CLÍNICO (estructura de reporte, fórmula, casos base/prompts) se edita en
 * sus sprints propios (6.5 · 7 · 8) → marcado como placeholder, no se finge.
 */

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Calculator, LayoutTemplate, MonitorPlay, Plus, Search } from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import type { ConteosHerramientas, HerramientaItem, TipoHerramienta } from '@/lib/studio/datos';
import { crearHerramienta, publicarHerramienta, renombrarHerramienta } from '@/lib/studio/acciones';

const META: Record<TipoHerramienta, { etiqueta: string; icono: typeof Calculator; cta: string; unidad: string; placeholder: string; nota: string }> = {
  plantillas: {
    etiqueta: 'Plantillas de reporte',
    icono: LayoutTemplate,
    cta: 'Nueva plantilla',
    unidad: 'reportes',
    placeholder: 'Buscar plantilla…',
    nota: 'La estructura del reporte (secciones, campos, guía) se arma en el generador de reportes (Sprint 6.5).',
  },
  calculadoras: {
    etiqueta: 'Calculadoras',
    icono: Calculator,
    cta: 'Nueva calculadora',
    unidad: 'usos',
    placeholder: 'Buscar calculadora…',
    nota: 'La definición clínica (inputs, fórmula, rangos, salida) se arma en el editor de calculadoras (Sprint 8).',
  },
  simuladores: {
    etiqueta: 'Simuladores',
    icono: MonitorPlay,
    cta: 'Nuevo simulador',
    unidad: 'sesiones',
    placeholder: 'Buscar simulador…',
    nota: 'Los casos base y los parámetros de la sesión con Eco se arman en el editor de simuladores (Sprint 7).',
  },
};

const TABS: TipoHerramienta[] = ['plantillas', 'calculadoras', 'simuladores'];

function ChipEstado({ publicado }: { publicado: boolean }) {
  return publicado ? (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
      Publicada
    </span>
  ) : (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
      Borrador
    </span>
  );
}

export function HerramientasAdmin({
  tipo,
  items,
  conteos,
}: {
  tipo: TipoHerramienta;
  items: HerramientaItem[];
  conteos: ConteosHerramientas;
}) {
  const meta = META[tipo];
  const Icono = meta.icono;
  const [busca, setBusca] = useState('');
  const [pendiente, iniciar] = useTransition();

  const visibles = useMemo(
    () => (busca.trim() ? items.filter((i) => i.nombre.toLowerCase().includes(busca.trim().toLowerCase())) : items),
    [items, busca],
  );

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-7">
      <div>
        <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Herramientas</h1>
        <p className={`mt-1 text-[13px] ${softText}`}>
          Contenido clínico configurable: se administra aquí y el alumno lo consume en el campus.
        </p>
      </div>

      {/* sub-nav */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {TABS.map((t) => {
            const M = META[t];
            const TIcono = M.icono;
            const on = t === tipo;
            return (
              <Link
                key={t}
                href={`/herramientas/${t}`}
                aria-current={on ? 'page' : undefined}
                className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                  on ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <TIcono aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                {M.etiqueta}
                <span className={`${mono} font-bold ${on ? 'text-white/70' : 'text-muted-foreground'}`}>{conteos[t]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* barra: búsqueda + crear */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[280px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">{meta.placeholder}</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={meta.placeholder}
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="button"
          onClick={() => iniciar(() => crearHerramienta(tipo))}
          disabled={pendiente}
          className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          {pendiente ? 'Creando…' : meta.cta}
        </button>
      </div>

      {/* nota de contenido clínico (placeholder honesto) */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-3">
        <Icono aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
          Aquí administras el catálogo (crear, nombrar, publicar) — real bajo RLS. {meta.nota}
        </p>
      </div>

      {/* tabla */}
      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {([['Nombre', 'left'], ['Estado', 'left'], ['Contenido clínico', 'left'], ['', 'right']] as const).map(([t, a], i) => (
                <th key={t || `c${i}`} style={{ textAlign: a }} className={`${kicker} whitespace-nowrap px-4 py-2.5 text-muted-foreground`}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((it) => (
              <FilaHerramienta key={it.id} tipo={tipo} item={it} icono={Icono} onPendiente={iniciar} />
            ))}
          </tbody>
        </table>

        {visibles.length === 0 && (
          <div className="px-6 py-14 text-center">
            <span aria-hidden className="inline-grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <Icono className="h-6 w-6" strokeWidth={1.6} />
            </span>
            <p className="mt-3 text-[15px] font-bold">
              {items.length === 0 ? `Sin ${meta.etiqueta.toLowerCase()}` : 'Nada con ese nombre'}
            </p>
            <p className={`mx-auto mt-1.5 max-w-[46ch] text-[13px] leading-relaxed ${softText}`}>
              {items.length === 0 ? `Crea la primera con "${meta.cta}".` : 'Prueba con otra búsqueda.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function FilaHerramienta({
  tipo,
  item,
  icono: Icono,
  onPendiente,
}: {
  tipo: TipoHerramienta;
  item: HerramientaItem;
  icono: typeof Calculator;
  onPendiente: (fn: () => void) => void;
}) {
  const [nombre, setNombre] = useState(item.nombre);
  const [editando, setEditando] = useState(false);

  function guardarNombre() {
    setEditando(false);
    if (nombre.trim() && nombre.trim() !== item.nombre) {
      onPendiente(() => renombrarHerramienta(tipo, item.id, nombre.trim()));
    } else {
      setNombre(item.nombre);
    }
  }

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted text-muted-foreground">
            <Icono className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            {editando ? (
              <input
                value={nombre}
                autoFocus
                onChange={(e) => setNombre(e.target.value)}
                onBlur={guardarNombre}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') guardarNombre();
                  if (e.key === 'Escape') {
                    setNombre(item.nombre);
                    setEditando(false);
                  }
                }}
                aria-label="Nombre"
                className="w-[280px] max-w-full rounded-[7px] border border-secondary bg-card px-2 py-1 text-[14px] font-bold outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className={`block truncate rounded-[6px] px-1 -mx-1 text-left text-[14px] font-bold leading-snug hover:bg-muted ${focusRing}`}
                title="Renombrar"
              >
                {item.nombre}
              </button>
            )}
            <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>{item.submeta}</span>
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <ChipEstado publicado={item.publicado} />
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10px] font-bold text-[color:var(--info-foreground)]">
          Se define aparte
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={() => onPendiente(() => publicarHerramienta(tipo, item.id, !item.publicado))}
          className={`h-9 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          {item.publicado ? 'Despublicar' : 'Publicar'}
        </button>
      </td>
    </tr>
  );
}
