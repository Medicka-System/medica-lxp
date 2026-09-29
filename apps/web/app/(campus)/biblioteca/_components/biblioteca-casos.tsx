'use client';

/**
 * Biblioteca de casos — acervo curado del alumno (§6/§7A). Filtros por órgano y
 * dominio I-AIM + búsqueda; grid de casos. Cada tarjeta abre el detalle a PANTALLA
 * COMPLETA (biblioteca/[id]) con el visor DICOM real y la verdad estructurada. Datos
 * reales por RLS (solo casos publicados).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookMarked, Library, Search } from 'lucide-react';
import { card, kicker, mono, focusRing } from '@/components/tokens';
import { Badge } from '@/components/ui/badge';
import { Select, type OpcionSelect } from '@/components/ui/select';
import { VisorDicomPlaceholder } from '../../_components/visor-dicom';
import { DOMINIO_LABEL, DOMINIOS, type DominioIaim } from '@/lib/campus/bitacora-contrato';
import type { BibliotecaData, CasoAcervo } from '@/lib/campus/biblioteca-contrato';

const TODOS = '__todos__';

export function BibliotecaCasos({ data }: { data: BibliotecaData }) {
  const [q, setQ] = useState('');
  const [organo, setOrgano] = useState<string>(TODOS);
  const [dominio, setDominio] = useState<DominioIaim | typeof TODOS>(TODOS);

  const opcionesOrgano: OpcionSelect[] = [
    { value: TODOS, label: 'Todos los órganos' },
    ...data.organos.map((o) => ({ value: o, label: o })),
  ];
  const opcionesDominio: OpcionSelect[] = [
    { value: TODOS, label: 'Todos los dominios' },
    ...DOMINIOS.map((d) => ({ value: d, label: DOMINIO_LABEL[d] })),
  ];

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
        <Select
          options={opcionesOrgano}
          value={organo}
          onChange={(v) => setOrgano(v)}
          aria-label="Filtrar por órgano"
          className={`flex h-11 items-center gap-2 rounded-control border border-border bg-card px-3 text-[13.5px] font-semibold text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
        />
        <Select
          options={opcionesDominio}
          value={dominio}
          onChange={(v) => setDominio(v as DominioIaim | typeof TODOS)}
          aria-label="Filtrar por dominio I-AIM"
          className={`flex h-11 items-center gap-2 rounded-control border border-border bg-card px-3 text-[13.5px] font-semibold text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
        />
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
            <TarjetaCaso key={c.id} caso={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Tarjeta ─────────────────────────── */

function TarjetaCaso({ caso }: { caso: CasoAcervo }) {
  return (
    <Link
      href={`/biblioteca/${caso.id}`}
      className={`${card} group flex flex-col overflow-hidden text-left transition-shadow hover:shadow-[0_8px_24px_rgba(17,24,39,0.10)] ${focusRing}`}
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
    </Link>
  );
}
