'use client';

/**
 * Biblioteca de casos — acervo curado del alumno (§6/§7A). Filtros por órgano y
 * dominio I-AIM + búsqueda; grid de casos; detalle con la verdad estructurada
 * (hallazgos clave, diagnóstico, puntos de aprendizaje, errores comunes) y el visor
 * DICOM placeholder (4.7). Datos reales por RLS (solo casos publicados).
 */

import { useEffect, useMemo, useState } from 'react';
import { BookMarked, GraduationCap, Library, Search, Stethoscope, TriangleAlert, X } from 'lucide-react';
import { card, kicker, mono } from '@/components/tokens';
import { Badge } from '@/components/ui/badge';
import { fechaCorta } from '@/lib/format';
import { VisorDicomPlaceholder } from '../../_components/visor-dicom';
import { DOMINIO_LABEL, DOMINIOS, type DominioIaim } from '@/lib/campus/bitacora-contrato';
import type { BibliotecaData, CasoAcervo } from '@/lib/campus/biblioteca-contrato';

const TODOS = '__todos__';

export function BibliotecaCasos({ data }: { data: BibliotecaData }) {
  const [q, setQ] = useState('');
  const [organo, setOrgano] = useState<string>(TODOS);
  const [dominio, setDominio] = useState<DominioIaim | typeof TODOS>(TODOS);
  const [abierto, setAbierto] = useState<CasoAcervo | null>(null);

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return data.casos.filter((c) => {
      if (organo !== TODOS && c.organo !== organo) return false;
      if (dominio !== TODOS && c.dominio !== dominio) return false;
      if (!texto) return true;
      const heno = [c.titulo, c.organo ?? '', c.diagnostico ?? '', ...c.hallazgosClave]
        .join(' ')
        .toLowerCase();
      return heno.includes(texto);
    });
  }, [data.casos, q, organo, dominio]);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <header>
        <p className={`${kicker} text-secondary`}>Mis casos y comunidad</p>
        <h1 className="mt-1 text-[22px] font-bold leading-tight">Biblioteca de casos</h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-muted-foreground">
          Acervo curado por los docentes: cada caso trae su verdad estructurada — hallazgos clave,
          diagnóstico y puntos de aprendizaje.
        </p>
      </header>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="flex h-11 min-w-[240px] flex-1 items-center gap-2.5 rounded-full border border-border bg-card px-4 transition-colors focus-within:border-secondary">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar casos</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, órgano, diagnóstico…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </label>
        <select
          value={organo}
          onChange={(e) => setOrgano(e.target.value)}
          aria-label="Filtrar por órgano"
          className="h-11 rounded-control border border-border bg-card px-3 text-[13.5px] font-semibold outline-none focus:border-secondary"
        >
          <option value={TODOS}>Todos los órganos</option>
          {data.organos.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select
          value={dominio}
          onChange={(e) => setDominio(e.target.value as DominioIaim | typeof TODOS)}
          aria-label="Filtrar por dominio I-AIM"
          className="h-11 rounded-control border border-border bg-card px-3 text-[13.5px] font-semibold outline-none focus:border-secondary"
        >
          <option value={TODOS}>Todos los dominios</option>
          {DOMINIOS.map((d) => (
            <option key={d} value={d}>{DOMINIO_LABEL[d]}</option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-[12.5px] text-muted-foreground">
        <span className={mono}>{filtrados.length}</span> {filtrados.length === 1 ? 'caso' : 'casos'}
      </p>

      {/* Grid */}
      {filtrados.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <Library className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="mt-3 text-[15px] font-bold">No hay casos con estos filtros</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Ajusta la búsqueda o quita filtros.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((c) => (
            <TarjetaCaso key={c.id} caso={c} onAbrir={() => setAbierto(c)} />
          ))}
        </div>
      )}

      {abierto && <DetalleCaso caso={abierto} onCerrar={() => setAbierto(null)} />}
    </div>
  );
}

/* ─────────────────────────── Tarjeta ─────────────────────────── */

function TarjetaCaso({ caso, onAbrir }: { caso: CasoAcervo; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`${card} group flex flex-col overflow-hidden text-left transition-shadow hover:shadow-[0_8px_24px_rgba(17,24,39,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2`}
    >
      <VisorDicomPlaceholder etiqueta={caso.organo ?? caso.titulo} alto={148} loop={caso.tieneDicom} />
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {caso.dominio && <Badge variant="accent" size="sm">{DOMINIO_LABEL[caso.dominio]}</Badge>}
          {caso.organo && <Badge variant="neutral" size="sm">{caso.organo}</Badge>}
        </div>
        <h2 className="mt-2 text-[14.5px] font-bold leading-snug">{caso.titulo}</h2>
        {caso.hallazgosClave[0] && (
          <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{caso.hallazgosClave[0]}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BookMarked className="h-[14px] w-[14px]" strokeWidth={1.75} />
            {caso.hallazgosClave.length} hallazgos
          </span>
          {caso.curador && <span className="truncate">{caso.curador}</span>}
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────── Detalle ─────────────────────────── */

function Seccion({
  titulo,
  icono: Icono,
  items,
  vacio,
}: {
  titulo: string;
  icono: typeof Stethoscope;
  items: string[];
  vacio: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-secondary">
        <Icono className="h-[15px] w-[15px]" strokeWidth={2} />
        {titulo}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((t, i) => (
            <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-foreground">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[12.5px] text-muted-foreground">{vacio}</p>
      )}
    </div>
  );
}

function DetalleCaso({ caso, onCerrar }: { caso: CasoAcervo; onCerrar: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={caso.titulo}>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-[color:var(--sidebar)]/55" />
      <div className="relative flex max-h-[92dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-[0_20px_60px_rgba(17,24,39,0.25)] sm:rounded-2xl">
        <div className="flex items-start gap-3 border-b border-border p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {caso.dominio && <Badge variant="accent" size="sm">{DOMINIO_LABEL[caso.dominio]}</Badge>}
              {caso.organo && <Badge variant="neutral" size="sm">{caso.organo}</Badge>}
            </div>
            <h2 className="mt-2 text-[18px] font-bold leading-tight">{caso.titulo}</h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {caso.curador ? `Curado por ${caso.curador} · ` : ''}
              {fechaCorta(caso.fecha)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <VisorDicomPlaceholder etiqueta={caso.organo ?? caso.titulo} alto={220} loop={caso.tieneDicom} radio="rounded-xl" />
          {!caso.tieneDicom && (
            <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
              Este caso aún no tiene estudio DICOM asociado.
            </p>
          )}

          <div className="mt-6 space-y-6">
            <Seccion titulo="Hallazgos clave" icono={BookMarked} items={caso.hallazgosClave} vacio="Sin hallazgos capturados." />
            <div>
              <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-secondary">
                <Stethoscope className="h-[15px] w-[15px]" strokeWidth={2} />
                Diagnóstico
              </p>
              <p className="mt-1.5 text-[14px] font-semibold leading-relaxed">
                {caso.diagnostico ?? <span className="font-normal text-muted-foreground">Sin diagnóstico registrado.</span>}
              </p>
            </div>
            <Seccion titulo="Puntos de aprendizaje" icono={GraduationCap} items={caso.puntosAprendizaje} vacio="Sin puntos de aprendizaje." />
            <Seccion titulo="Errores comunes" icono={TriangleAlert} items={caso.erroresComunes} vacio="Sin errores comunes registrados." />
          </div>
        </div>
      </div>
    </div>
  );
}
