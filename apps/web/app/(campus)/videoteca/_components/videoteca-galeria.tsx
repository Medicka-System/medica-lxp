'use client';

import { useMemo, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { LoopFrame } from '@/components/campus/loop-frame';
import type { VideoInstruccional, ProgramaFiltro } from '../_lib/datos';
import { Reproductor, type ContenidoReproducible } from './reproductor';

/**
 * Galería de la Videoteca (client): filtra por programa + búsqueda y abre el
 * reproductor. Los datos llegan ya resueltos del server (RLS aplicado en `datos.ts`).
 */
export function VideotecaGaleria({
  videos,
  programas,
}: {
  videos: VideoInstruccional[];
  programas: ProgramaFiltro[];
}) {
  const [programa, setPrograma] = useState<string>('todos');
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState<ContenidoReproducible | null>(null);

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (programa !== 'todos' && v.programaId !== programa) return false;
      if (!texto) return true;
      return (
        v.titulo.toLowerCase().includes(texto) ||
        v.modulo.toLowerCase().includes(texto) ||
        v.leccion.toLowerCase().includes(texto)
      );
    });
  }, [videos, programa, q]);

  return (
    <div>
      {/* Controles: búsqueda + píldoras de programa */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className={`flex h-11 min-w-[240px] flex-1 items-center gap-2.5 rounded-full border border-border bg-card px-4 ${focusRing}`}>
          <Search aria-hidden className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por tema, módulo o lección…"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            aria-label="Buscar en la videoteca"
          />
        </label>

        {programas.length > 0 && (
          <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-[3px]">
            <PildoraPrograma etiqueta="Todos" activa={programa === 'todos'} onClick={() => setPrograma('todos')} />
            {programas.map((p) => (
              <PildoraPrograma
                key={p.id}
                etiqueta={p.nombre}
                total={p.total}
                activa={programa === p.id}
                onClick={() => setPrograma(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Grid de videos */}
      {filtrados.length === 0 ? (
        <div className={`${card} mt-5 px-6 py-12 text-center text-[13px] ${softText}`}>
          {videos.length === 0
            ? 'Aún no hay videos instruccionales publicados.'
            : 'Ningún video coincide con el filtro.'}
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() =>
                  setActivo({
                    id: v.id,
                    titulo: v.titulo,
                    tipo: v.tipo,
                    recursoRef: v.recursoRef,
                    contexto: `${v.programa} · ${v.modulo} · ${v.leccion}`,
                  })
                }
                className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-rest transition-colors hover:border-primary ${focusRing}`}
              >
                <span
                  className="relative grid w-full place-items-center overflow-hidden bg-[color:var(--sidebar)]"
                  style={{ aspectRatio: '16 / 9' }}
                >
                  <LoopFrame />
                </span>
                <span className="flex min-w-0 flex-1 flex-col p-4">
                  <span className={`${kicker} text-secondary`}>{v.programa}</span>
                  <span className="mt-1.5 line-clamp-2 text-[13.5px] font-bold leading-snug">{v.titulo}</span>
                  <span className="mt-auto pt-2.5 text-[11.5px] text-muted-foreground">
                    {v.modulo} · {v.leccion}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {activo && <Reproductor contenido={activo} onCerrar={() => setActivo(null)} />}
    </div>
  );
}

function PildoraPrograma({
  etiqueta,
  total,
  activa,
  onClick,
}: {
  etiqueta: string;
  total?: number;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`inline-flex h-[30px] items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition-colors ${
        activa ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {etiqueta}
      {typeof total === 'number' && (
        <span className={`${mono} inline-flex items-center gap-1 text-[10px] ${activa ? 'opacity-80' : ''}`}>
          <Eye className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          {total}
        </span>
      )}
    </button>
  );
}
