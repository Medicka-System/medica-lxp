'use client';

/**
 * Vista por GRUPO × ACTIVIDAD para una tarea abierta (§5B) — fiel al mock. Bandeja de
 * trabajos por calificar: selectores, resumen, lista con estado + nota, y quién no
 * entregó. Datos reales. El botón de LOTE y el panel lateral son Eco (PLACEHOLDER):
 * violeta, nunca alerta (§5A/§7A).
 */

import { useMemo, useState } from 'react';
import { BellRing, ChevronRight, Search, Sparkles, TriangleAlert } from 'lucide-react';
import { mono, kicker, card, focusRing } from '@/lib/studio/estilos';
import { Avatar } from '@/components/avatar';
import { haceCuanto } from '@/lib/format';
import type { ActividadRef, EntregasVista } from '../../../_lib/contrato';
import { ChipEstado, Selector } from './ui';
import { PanelEco, ECO_LOTE_EJEMPLO } from './eco-placeholder';

export function VistaActividad({
  data,
  actividad,
  onElegirGrupo,
  onElegirActividad,
  onAbrir,
}: {
  data: EntregasVista;
  actividad: ActividadRef;
  onElegirGrupo: (id: string) => void;
  onElegirActividad: (id: string) => void;
  onAbrir: (id: string) => void;
}) {
  const { grupo, grupos, actividades, resumen, entregas, sinEntregar } = data;
  const [busca, setBusca] = useState('');
  const [soloPorCalificar, setSoloPorCalificar] = useState(false);
  const [avisoEco, setAvisoEco] = useState(false);
  const [avisoRecordar, setAvisoRecordar] = useState(false);

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return entregas.filter(
      (e) =>
        (!soloPorCalificar || e.estado === 'requiere-lectura') &&
        (!q || e.alumno.nombre.toLowerCase().includes(q)),
    );
  }, [entregas, soloPorCalificar, busca]);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-4 px-6 pb-8 pt-5">
      <div className="min-w-0 flex-1">
        {/* selectores + buscador + lote de Eco */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Selector
            rotulo="Grupo"
            valor={grupo?.nombre ?? '—'}
            opciones={grupos.map((g) => ({ id: g.id, etiqueta: g.nombre }))}
            onSelect={onElegirGrupo}
          />
          <Selector
            rotulo="Actividad"
            valor={`${actividad.clave} · ${actividad.titulo}`}
            opciones={actividades.map((a) => ({ id: a.id, etiqueta: `${a.clave} · ${a.titulo}` }))}
            onSelect={onElegirActividad}
          />
          <label className="flex h-10 w-[220px] items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alumno…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="button"
            onClick={() => setAvisoEco(true)}
            title="Eco aún no está conectado"
            className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 text-[13.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-foreground)] hover:text-white ${focusRing}`}
          >
            <Sparkles aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Confirmar {ECO_LOTE_EJEMPLO} de alta confianza
          </button>
        </div>

        {avisoEco && (
          <div className="mt-3 flex items-center gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
            <Sparkles aria-hidden className="h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
              El lote de Eco aún no está conectado. Cuando lo esté, aquí confirmará en bloque solo lo que Eco
              pre-calificó con alta confianza; el resto lo revisa usted una a una.
            </p>
          </div>
        )}

        {/* resumen de la actividad (real) */}
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          {(
            [
              ['Entregadas', `${resumen.entregadas} / ${resumen.delGrupo}`, `de ${resumen.delGrupo} alumnos del grupo`, 'plano'],
              ['Por confirmar', String(resumen.porConfirmar), 'tareas abiertas por calificar', resumen.porConfirmar > 0 ? 'warn' : 'plano'],
              ['Promedio del grupo', resumen.promedio == null ? '—' : resumen.promedio.toFixed(1), 'sobre lo ya calificado', 'plano'],
              ['Sin entregar', String(resumen.sinEntregar), resumen.vencio || 'del grupo', resumen.sinEntregar > 0 ? 'warn' : 'plano'],
            ] as const
          ).map(([rot, val, sub, tono]) => (
            <div
              key={rot}
              className={`min-w-[170px] flex-1 rounded-[11px] px-4 py-3.5 ${
                tono === 'warn'
                  ? 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]'
                  : 'border border-border bg-muted'
              }`}
            >
              <p
                className={`${kicker} text-[9.5px] tracking-[0.12em] ${
                  tono === 'warn' ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
                }`}
              >
                {rot}
              </p>
              <p
                className={`${mono} mt-1.5 text-[24px] font-extrabold leading-none tracking-[-0.02em] ${
                  tono === 'warn' ? 'text-[color:var(--warning-foreground)]' : 'text-foreground'
                }`}
              >
                {val}
              </p>
              <p
                className={`mt-1 text-[11px] leading-snug ${
                  tono === 'warn' ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
                }`}
              >
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* la regla del reparto, dicha una vez */}
        <div className="mt-4 flex items-center gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
          <Sparkles aria-hidden className="h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
            <span className="font-bold">Las autoevaluaciones se califican solas</span> (opción múltiple, sin Eco)
            y las tareas abiertas las califica usted. Eco propondrá nota y comentario contra la rúbrica — usted
            confirma; ninguna nota se asienta sola.
          </p>
        </div>

        {/* lista de entregas (real) */}
        <section className={`${card} mt-4 overflow-hidden`}>
          <div className="flex items-center gap-2.5 px-[18px] py-3.5">
            <h2 className={`${kicker} text-muted-foreground`}>Entregas</h2>
            <span className={`${mono} text-[11.5px] text-muted-foreground`}>
              {resumen.entregadas} · ordenadas por lo que requiere su lectura
            </span>
            <button
              type="button"
              onClick={() => setSoloPorCalificar((v) => !v)}
              aria-pressed={soloPorCalificar}
              className={`ml-auto h-8 rounded-lg border px-2.5 text-[11.5px] font-semibold transition-colors ${focusRing} ${
                soloPorCalificar
                  ? 'border-secondary bg-accent text-accent-foreground'
                  : 'border-border bg-card hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Solo por calificar
            </button>
          </div>

          {visibles.length === 0 ? (
            <p className="border-t border-border px-[18px] py-8 text-center text-[12.5px] text-muted-foreground">
              {entregas.length === 0 ? 'Aún no hay entregas de esta actividad.' : 'Sin coincidencias.'}
            </p>
          ) : (
            visibles.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onAbrir(e.id)}
                className={`flex w-full items-center gap-3.5 border-t border-border px-[18px] py-3 text-left transition-colors hover:bg-muted ${focusRing}`}
              >
                <Avatar ini={e.alumno.ini} />
                <span className="min-w-0 flex-[1.3]">
                  <span className="block text-[13.5px] font-bold leading-snug">{e.alumno.nombre}</span>
                  <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                    Tarea abierta · entregó {haceCuanto(e.creadoEn)}
                  </span>
                </span>
                <span className="w-[170px] shrink-0">
                  <ChipEstado estado={e.estado} />
                </span>
                <span
                  className={`min-w-0 flex-1 text-[11.5px] leading-snug ${
                    e.estado === 'requiere-lectura' ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
                  }`}
                >
                  {e.estado === 'requiere-lectura' ? 'Pendiente de su lectura' : e.estado === 'calificada' ? 'Ya calificada' : ''}
                </span>
                <span
                  className={`${mono} w-16 shrink-0 text-right text-[17px] font-extrabold ${
                    e.nota == null ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {e.nota == null ? '—' : e.nota.toFixed(e.nota % 1 ? 1 : 0)}
                </span>
                <ChevronRight aria-hidden className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={2} />
              </button>
            ))
          )}

          {/* quién no entregó (roster real de CORA) */}
          {sinEntregar.length > 0 && (
            <div className="flex flex-wrap items-center gap-3.5 border-t border-border bg-[color:var(--warning-surface)] px-[18px] py-3.5">
              <span
                aria-hidden
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
              >
                <TriangleAlert className="h-4 w-4" strokeWidth={2} />
              </span>
              <p className="min-w-[280px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
                <span className="font-bold">
                  {sinEntregar.length} alumno{sinEntregar.length === 1 ? '' : 's'} no{' '}
                  {sinEntregar.length === 1 ? 'ha' : 'han'} entregado
                </span>{' '}
                — {sinEntregar.map((a) => a.nombre).join(', ')}.
              </p>
              <button
                type="button"
                onClick={() => setAvisoRecordar(true)}
                title="Disponible pronto"
                className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[12.5px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
              >
                <BellRing aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Recordarles
              </button>
              {avisoRecordar && (
                <p className="w-full text-[11.5px] leading-snug text-[color:var(--warning-foreground)]">
                  El recordatorio automático se conecta con el motor de notificaciones (§8) — disponible pronto.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Eco: riel colapsado ↔ panel (PLACEHOLDER) */}
      <PanelEco />
    </div>
  );
}
