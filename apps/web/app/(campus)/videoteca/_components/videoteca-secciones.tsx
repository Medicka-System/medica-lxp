'use client';

/**
 * Videoteca del alumno — DIVISIÓN en dos colecciones (§ Videoteca). El alumno distingue
 * de un vistazo qué es contenido instruccional de producción y qué es una grabación de su
 * propia clase en vivo, con dos pestañas píldora (§5A):
 *   · «Biblioteca de videos»  → videos instruccionales del catálogo/curso.
 *   · «Mis clases grabadas»    → sesiones en vivo (Zoom/stream) que fue acumulando.
 * Los datos llegan ya resueltos del server (RLS en `datos.ts`); aquí solo se conmuta la
 * sección activa y se filtra/abre el reproductor.
 */

import { useMemo, useState } from 'react';
import { Radio, Search, Clock, CalendarDays, Users } from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { LoopFrame } from '@/components/campus/loop-frame';
import type { VideoInstruccional, ProgramaFiltro, GrabacionClase } from '../_lib/datos';
import { VideotecaGaleria } from './videoteca-galeria';
import { Reproductor, type ContenidoReproducible } from './reproductor';

type Seccion = 'biblioteca' | 'clases';

export function VideotecaSecciones({
  videos,
  programas,
  grabaciones,
}: {
  videos: VideoInstruccional[];
  programas: ProgramaFiltro[];
  grabaciones: GrabacionClase[];
}) {
  const [seccion, setSeccion] = useState<Seccion>('biblioteca');

  const secciones = [
    { id: 'biblioteca' as const, etiqueta: 'Biblioteca de videos', total: videos.length, panel: 'panel-biblioteca' },
    { id: 'clases' as const, etiqueta: 'Mis clases grabadas', total: grabaciones.length, panel: 'panel-clases' },
  ];

  return (
    <div className="mt-6">
      {/* Pestañas píldora: separan las DOS colecciones (§5A). En móvil el grupo se
          desplaza horizontal edge-to-edge para no desbordar. */}
      <div
        role="tablist"
        aria-label="Colecciones de la videoteca"
        className="-mx-5 flex gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:inline-flex sm:overflow-visible sm:rounded-full sm:border sm:border-border sm:bg-muted sm:px-1 [&::-webkit-scrollbar]:hidden"
      >
        {secciones.map((s) => {
          const on = seccion === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={s.panel}
              onClick={() => setSeccion(s.id)}
              className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                on ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.id === 'clases' && <Radio aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
              {s.etiqueta}
              <span className={`${mono} text-[11px] ${on ? 'opacity-80' : 'text-muted-foreground'}`}>{s.total}</span>
            </button>
          );
        })}
      </div>

      {/* Panel: BIBLIOTECA (instruccional de producción) */}
      <div id="panel-biblioteca" role="tabpanel" hidden={seccion !== 'biblioteca'}>
        <p className={`mt-4 text-[12.5px] ${softText}`}>
          Contenido instruccional producido para el curso: videos del catálogo y sus lecciones.
        </p>
        <VideotecaGaleria videos={videos} programas={programas} />
      </div>

      {/* Panel: CLASES GRABADAS (sesiones en vivo) */}
      <div id="panel-clases" role="tabpanel" hidden={seccion !== 'clases'}>
        <p className={`mt-4 text-[12.5px] ${softText}`}>
          Grabaciones de tus clases en vivo (Zoom / stream), ligadas a tu grupo. Se agregan solas al
          terminar la sesión.
        </p>
        <GaleriaGrabaciones grabaciones={grabaciones} />
      </div>
    </div>
  );
}

/* ───────────────────── Galería de grabaciones de clase ───────────────────── */

function GaleriaGrabaciones({ grabaciones }: { grabaciones: GrabacionClase[] }) {
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState<ContenidoReproducible | null>(null);

  const filtradas = useMemo(() => {
    const texto = q.trim().toLowerCase();
    if (!texto) return grabaciones;
    return grabaciones.filter(
      (g) =>
        g.titulo.toLowerCase().includes(texto) ||
        (g.grupo?.toLowerCase().includes(texto) ?? false) ||
        (g.leccion?.toLowerCase().includes(texto) ?? false),
    );
  }, [grabaciones, q]);

  if (grabaciones.length === 0) {
    return (
      <div className={`${card} mt-5 flex flex-col items-center gap-2 px-6 py-12 text-center`}>
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground">
          <Radio className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="text-[13.5px] font-bold">Todavía no tienes clases grabadas</p>
        <p className={`max-w-[42ch] text-[12.5px] ${softText}`}>
          Cuando tu grupo tenga una sesión en vivo, su grabación aparecerá aquí automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className={`mt-5 flex h-11 min-w-[240px] max-w-[420px] items-center gap-2.5 rounded-full border border-border bg-card px-4 ${focusRing}`}>
        <Search aria-hidden className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por clase, grupo o lección…"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          aria-label="Buscar en las clases grabadas"
        />
      </label>

      {filtradas.length === 0 ? (
        <div className={`${card} mt-5 px-6 py-12 text-center text-[13px] ${softText}`}>
          Ninguna grabación coincide con el filtro.
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() =>
                  setActivo({
                    id: g.id,
                    titulo: g.titulo,
                    tipo: 'video',
                    recursoRef: g.recursoRef,
                    contexto: [g.grupo, g.leccion].filter(Boolean).join(' · ') || undefined,
                  })
                }
                className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-rest transition-colors hover:border-primary ${focusRing}`}
              >
                <span
                  className="relative grid w-full place-items-center overflow-hidden bg-[color:var(--sidebar)]"
                  style={{ aspectRatio: '16 / 9' }}
                >
                  <LoopFrame />
                  {/* Distintivo claro: es una GRABACIÓN de clase en vivo */}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--warning-surface)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[color:var(--warning-foreground)]">
                    <Radio aria-hidden className="h-3 w-3" strokeWidth={2} />
                    {g.origen === 'zoom' ? 'Clase · Zoom' : 'Clase · Stream'}
                  </span>
                  {g.duracionSeg != null && g.duracionSeg > 0 && (
                    <span className={`${mono} absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10.5px] font-semibold text-white`}>
                      <Clock aria-hidden className="h-3 w-3" strokeWidth={2} />
                      {minutos(g.duracionSeg)}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col p-4">
                  {g.grupo && <span className={`${kicker} text-secondary`}>{g.grupo}</span>}
                  <span className="mt-1.5 line-clamp-2 text-[13.5px] font-bold leading-snug">{g.titulo}</span>
                  <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2.5 text-[11.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {fechaLegible(g.fecha)}
                    </span>
                    {g.leccion && (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Users aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{g.leccion}</span>
                      </span>
                    )}
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

/** «45 min» / «1 h 05 min» a partir de segundos. */
function minutos(seg: number): string {
  const m = Math.round(seg / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r.toString().padStart(2, '0')} min` : `${h} h`;
}

/** Fecha corta en español (estable server/cliente vía locale explícito). */
function fechaLegible(fecha: Date): string {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(fecha),
  );
}
