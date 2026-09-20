'use client';

/**
 * Selector de RECURSOS EXISTENTES (§5C) — inserta como bloque un recurso que YA existe,
 * de dos fuentes: la Biblioteca de Contenido (video/H5P/PDF/docs/xAPI) y el Banco de
 * Casos (casos DICOM curados). Busca en ambas y devuelve el sub-tipo de bloque + su
 * config prellenada (referenciando el recurso/caso); el editor crea la fila en
 * `lxp.bloques`. La URL firmada del media y el estudio DICOM se resuelven después
 * (PENDIENTE DE API) — aquí solo se referencia el recurso.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Loader2,
  Package,
  ScanLine,
  Search,
  SlidersHorizontal,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { kicker, mono, softText, focusRing } from '@/lib/studio/estilos';
import type { Recurso, TipoRecurso } from '@/lib/studio/contenido-contrato';
import { DOMINIO_LABEL, type CasoResumen } from '@/lib/studio/casos-contrato';
import { buscarCasosBanco, buscarRecursosBiblioteca } from './recursos-acciones';
import type { TipoBloqueTeoria } from './tipos-bloque';

export type InsercionBloque = { tipoBloque: TipoBloqueTeoria; config: Record<string, unknown> };

/** Recurso de Biblioteca → sub-tipo de bloque + config (null si no mapea a un bloque). */
function recursoABloque(r: Recurso): InsercionBloque | null {
  switch (r.tipo) {
    case 'video':
      return { tipoBloque: 'video', config: { src: '', poster: '', titulo: r.nombre, hitos: [], recursoId: r.id } };
    case 'h5p':
      return { tipoBloque: 'h5p', config: { contentId: '', titulo: r.nombre, recursoId: r.id } };
    case 'xapi':
      return { tipoBloque: 'xapi', config: { paqueteId: '', titulo: r.nombre, recursoId: r.id } };
    case 'pdf':
    case 'word':
    case 'ppt':
      return { tipoBloque: 'pdf', config: { src: '', titulo: r.nombre, recursoId: r.id } };
    default:
      // scorm/imagen no tienen bloque de teoría propio (SCORM es tipo de lección; la
      // imagen se agrega por URL con el bloque "Imagen").
      return null;
  }
}

const ICONO_RECURSO: Record<TipoRecurso, LucideIcon> = {
  video: Video,
  h5p: SlidersHorizontal,
  scorm: Package,
  xapi: Package,
  pdf: FileText,
  word: FileText,
  ppt: FileText,
  imagen: FileText,
};

type Fuente = 'biblioteca' | 'casos';

export function SelectorRecurso({
  onCerrar,
  onInsertar,
}: {
  onCerrar: () => void;
  onInsertar: (insercion: InsercionBloque) => void;
}) {
  const [fuente, setFuente] = useState<Fuente>('biblioteca');
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const [pendienteDb, setPendienteDb] = useState(false);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [casos, setCasos] = useState<CasoResumen[]>([]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    Promise.all([buscarRecursosBiblioteca(), buscarCasosBanco()])
      .then(([bib, cs]) => {
        if (!vivo) return;
        setRecursos(bib.recursos.filter((r) => recursoABloque(r) !== null));
        setPendienteDb(bib.pendienteDb);
        setCasos(cs);
      })
      .catch((e) => {
        console.error('[SelectorRecurso] fallo al cargar recursos/casos:', e);
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const recursosFiltrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return recursos;
    return recursos.filter((r) => r.nombre.toLowerCase().includes(t) || r.etiquetas.some((e) => e.toLowerCase().includes(t)));
  }, [recursos, q]);

  const casosFiltrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return casos;
    return casos.filter(
      (c) => c.titulo.toLowerCase().includes(t) || (c.organo ?? '').toLowerCase().includes(t),
    );
  }, [casos, q]);

  function insertarCaso(c: CasoResumen) {
    onInsertar({
      tipoBloque: 'caso',
      config: {
        casoId: c.id,
        titulo: c.titulo,
        organo: c.organo ?? undefined,
        dominio: c.dominio ? DOMINIO_LABEL[c.dominio] : undefined,
      },
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Insertar un recurso existente"
      className="fixed inset-0 z-50 grid place-items-center p-6"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="flex max-h-[82vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-start gap-3 border-b border-border px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>Insertar recurso existente</p>
            <h2 className="mt-2 text-[19px] font-extrabold leading-snug tracking-[-0.02em]">
              Elige de la Biblioteca o del Banco de Casos
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Tabs + búsqueda */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <div role="tablist" aria-label="Fuente del recurso" className="flex gap-1.5">
            {(
              [
                ['biblioteca', 'Biblioteca de Contenido'],
                ['casos', 'Banco de Casos'],
              ] as const
            ).map(([f, rot]) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={fuente === f}
                onClick={() => setFuente(f)}
                className={`inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-bold transition-colors ${focusRing} ${
                  fuente === f ? 'bg-primary text-[color:var(--sidebar)]' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {rot}
              </button>
            ))}
          </div>
          <div className="relative ml-auto min-w-[180px] flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={fuente === 'biblioteca' ? 'Buscar recurso o etiqueta…' : 'Buscar caso u órgano…'}
              aria-label="Buscar"
              className={`h-8 w-full rounded-full border border-border bg-card pl-8 pr-3 text-[12.5px] outline-none focus:border-secondary ${focusRing}`}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="min-h-[220px] flex-1 overflow-y-auto p-4">
          {cargando ? (
            <div className="grid place-items-center gap-2 py-10 text-center">
              <Loader2 aria-hidden className="h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.75} />
              <p className={`text-[12.5px] ${softText}`}>Cargando…</p>
            </div>
          ) : fuente === 'biblioteca' ? (
            <ListaBiblioteca pendienteDb={pendienteDb} recursos={recursosFiltrados} onInsertar={onInsertar} />
          ) : (
            <ListaCasos casos={casosFiltrados} onInsertar={insertarCaso} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Lista: Biblioteca ─────────────────────────── */

function ListaBiblioteca({
  pendienteDb,
  recursos,
  onInsertar,
}: {
  pendienteDb: boolean;
  recursos: Recurso[];
  onInsertar: (insercion: InsercionBloque) => void;
}) {
  if (pendienteDb) {
    return (
      <div className="rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-4">
        <p className="text-[12px] font-bold text-[color:var(--info-foreground)]">Biblioteca aún no disponible</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
          La tabla <span className={mono}>lxp.recursos</span> aún no existe (pendiente de DB · ver
          contenido-contrato). Mientras tanto puedes insertar casos del Banco o agregar bloques por URL.
        </p>
      </div>
    );
  }
  if (recursos.length === 0) {
    return <p className={`px-2 py-6 text-center text-[13px] ${softText}`}>No hay recursos que coincidan.</p>;
  }
  return (
    <ul className="grid gap-2">
      {recursos.map((r) => {
        const Icono = ICONO_RECURSO[r.tipo] ?? FileText;
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => {
                const ins = recursoABloque(r);
                if (ins) onInsertar(ins);
              }}
              className={`flex w-full items-center gap-3 rounded-[11px] border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
            >
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
                <Icono className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold leading-snug">{r.nombre}</span>
                <span className={`block truncate text-[11.5px] ${softText}`}>{r.meta}</span>
              </span>
              <span className={`${mono} shrink-0 text-[10.5px] uppercase text-muted-foreground`}>{r.tipo}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────── Lista: Banco de Casos ─────────────────────────── */

function ListaCasos({
  casos,
  onInsertar,
}: {
  casos: CasoResumen[];
  onInsertar: (caso: CasoResumen) => void;
}) {
  if (casos.length === 0) {
    return <p className={`px-2 py-6 text-center text-[13px] ${softText}`}>No hay casos que coincidan.</p>;
  }
  return (
    <ul className="grid gap-2">
      {casos.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onInsertar(c)}
            className={`flex w-full items-center gap-3 rounded-[11px] border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
          >
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
              <ScanLine className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-bold leading-snug">{c.titulo}</span>
              <span className={`block truncate text-[11.5px] ${softText}`}>
                {[c.organo, c.dominio ? DOMINIO_LABEL[c.dominio] : null].filter(Boolean).join(' · ') || 'Caso DICOM'}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                c.estado === 'biblioteca'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
              }`}
            >
              {c.estado === 'biblioteca' ? 'En biblioteca' : 'Por curar'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
