'use client';

/**
 * Studio · Grupos — lista UNIVERSAL de instancias (§5B/§6 · 19a).
 *
 * TODOS los grupos se ven idénticos: una sola población de filas de `lxp.grupos`
 * (nativos del LXP + reflejos de CORA · mig 0082/0086). El origen es plomería interna,
 * invisible en la UI — no hay chips CORA/LXP ni segmentado de origen. Mismas 8 columnas,
 * todas las filas clickeables a su detalle, todas con su menú ⋯.
 *
 * El dato rico (portada, docente, estado, overrides, versión) YA viaja en `getGrupos`.
 * Alumnos/inscripciones son fuente de verdad de CORA (solo lectura). Lo editable del grupo
 * vive en su detalle; aquí se crea (modal 2 pasos) y se borra (solo nativos · §10).
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Link2,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { Select } from '@/components/ui/select';
import { ImgDerivada } from '@/components/img-derivada';
import { fechaCortaDia } from '@/lib/format';
import type { EstadoGrupo, GrupoResumen, ProgramaResumen } from '@/lib/studio/datos';
import { crearGrupo, borrarGrupo } from '@/lib/studio/acciones';
import { firmarSubidaImagenContenido } from '@/lib/studio/media-acciones';

/* ───────────────────────── Estilo de estado (mismo que el detalle) ───────────────────────── */

const ESTADO: Record<EstadoGrupo, { texto: string; clase: string }> = {
  curso: { texto: 'En curso', clase: 'bg-accent text-accent-foreground' },
  proximo: {
    texto: 'Próximo',
    clase:
      'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
  },
  finalizado: { texto: 'Finalizado', clase: 'border border-border bg-muted text-muted-foreground' },
};

/** Fechas de columnas DATE (UTC-safe · fechaCortaDia). "—" si asíncrono o sin fechas. */
function rango(ini: Date | null, fin: Date | null, modalidad: GrupoResumen['modalidad']): string {
  if (modalidad === 'asincrono') return '—';
  if (!ini && !fin) return '—';
  return `${ini ? fechaCortaDia(ini) : '—'} – ${fin ? fechaCortaDia(fin) : '—'}`;
}

/** La señal de herencia (§1): "Personalizado · N cambios" violeta, o "Estándar" gris. */
function SelloHerencia({ overrides }: { overrides: number }) {
  if (overrides === 0) {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold text-muted-foreground">
        <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
        Estándar
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--info-foreground)]">
      <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
      Personalizado · {overrides} {overrides === 1 ? 'cambio' : 'cambios'}
    </span>
  );
}

/** Filas por página de la lista (paginación CLIENTE · ver nota en el pie). */
const POR_PAGINA = 24;

/** Números de página a mostrar, con elipsis cuando son muchas (1 … 4 5 6 … 12). */
function numerosPagina(actual: number, total: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= actual - 1 && i <= actual + 1)) {
      out.push(i);
    } else if (out[out.length - 1] !== '…') {
      out.push('…');
    }
  }
  return out;
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export function GruposTabla({
  grupos,
  programas,
  docentes,
}: {
  grupos: GrupoResumen[];
  programas: ProgramaResumen[];
  docentes: { userId: string; nombre: string }[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [programa, setPrograma] = useState('Todos');
  const [estado, setEstado] = useState<'todos' | EstadoGrupo>('todos');
  const [nuevo, setNuevo] = useState(false);
  const [aBorrar, setABorrar] = useState<GrupoResumen | null>(null);

  const programasPublicados = useMemo(
    () => programas.filter((p) => p.estado === 'publicado'),
    [programas],
  );

  const nombresPrograma = useMemo(
    () => ['Todos', ...Array.from(new Set(grupos.map((g) => g.programaNombre)))],
    [grupos],
  );

  const conteos = useMemo(
    () => ({
      todos: grupos.length,
      curso: grupos.filter((g) => g.estado === 'curso').length,
      proximo: grupos.filter((g) => g.estado === 'proximo').length,
      finalizado: grupos.filter((g) => g.estado === 'finalizado').length,
    }),
    [grupos],
  );

  const personalizados = useMemo(() => grupos.filter((g) => g.overrides > 0).length, [grupos]);

  const visibles = useMemo(
    () =>
      grupos.filter(
        (g) =>
          (estado === 'todos' || g.estado === estado) &&
          (programa === 'Todos' || g.programaNombre === programa) &&
          (!busca.trim() ||
            g.nombre.toLowerCase().includes(busca.trim().toLowerCase()) ||
            g.programaNombre.toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [grupos, estado, programa, busca],
  );

  // Paginación (cliente): se recalcula sobre el resultado FILTRADO; al cambiar
  // búsqueda/filtros se vuelve a la página 1.
  const [pagina, setPagina] = useState(1);
  useEffect(() => setPagina(1), [busca, programa, estado]);
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = useMemo(
    () => visibles.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [visibles, paginaActual],
  );
  const desde = visibles.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1;
  const hasta = Math.min(paginaActual * POR_PAGINA, visibles.length);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Grupos</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Cada grupo es una instancia de un programa. Ábrelo para ver su contenido, docente y
            personalizaciones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNuevo(true)}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Nuevo grupo
        </button>
      </div>

      {/* filtros (cliente) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[290px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar grupo</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar grupo o programa…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <label className="flex h-10 items-center gap-2 rounded-[9px] border border-border bg-card px-3">
          <span className={`${kicker} tracking-[0.1em] text-muted-foreground`}>Programa</span>
          <Select
            aria-label="Filtrar por programa"
            value={programa}
            onChange={setPrograma}
            className="flex items-center gap-2 bg-transparent pr-1 text-[13px] font-semibold text-foreground outline-none"
            options={nombresPrograma.map((p) => ({ value: p, label: p }))}
          />
        </label>

        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ['todos', 'Todos'],
              ['curso', 'En curso'],
              ['proximo', 'Próximos'],
              ['finalizado', 'Finalizados'],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setEstado(id)}
              aria-pressed={estado === id}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                estado === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${estado === id ? 'text-white/70' : 'text-muted-foreground'}`}>
                {conteos[id]}
              </span>
            </button>
          ))}
        </div>

        <span className="ml-auto inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 text-[12px] font-semibold text-[color:var(--info-foreground)]">
          <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          <span className={mono}>{personalizados}</span> con personalizaciones
        </span>
      </div>

      {/* tabla */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {(
                [
                  ['Portada · grupo · programa base', 'left'],
                  ['Modalidad', 'left'],
                  ['Fechas', 'left'],
                  ['Docente', 'left'],
                  ['Alumnos', 'right'],
                  ['Estado', 'left'],
                  ['Contenido', 'left'],
                  ['', 'right'],
                ] as const
              ).map(([t, a], i) => (
                <th
                  key={t || `col-${i}`}
                  style={{ textAlign: a }}
                  className="whitespace-nowrap px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginados.map((g) => (
              <tr
                key={g.id}
                onClick={() => router.push(`/studio/grupos/${g.id}`)}
                className="cursor-pointer border-t border-border transition-colors hover:bg-muted"
              >
                {/* Portada · grupo · programa base */}
                <td className="p-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/studio/grupos/${g.id}`);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className="relative w-14 shrink-0 overflow-hidden rounded-[7px] bg-sidebar"
                      style={{ aspectRatio: '16 / 9' }}
                    >
                      {g.portadaUrl ? (
                        <ImgDerivada
                          url={g.portadaUrl}
                          srcset={g.portadaSrcset}
                          sizes="56px"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span
                          className="absolute inset-0"
                          style={{
                            background:
                              'repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)',
                          }}
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold leading-snug">{g.nombre}</span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <Link2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                        <span className="text-[11.5px] text-muted-foreground">{g.programaNombre}</span>
                        <span className={`${mono} text-[11px] text-muted-foreground`}>v{g.programaVersion}</span>
                      </span>
                    </span>
                  </button>
                </td>

                {/* Modalidad */}
                <td className="px-3 py-3.5">
                  <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold ${softText}`}>
                    {g.modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono'}
                  </span>
                </td>

                {/* Fechas */}
                <td className={`${mono} whitespace-nowrap px-3 py-3.5 text-[12px] ${g.modalidad === 'sincrono' && (g.fechaInicio || g.fechaFin) ? softText : 'text-muted-foreground'}`}>
                  {rango(g.fechaInicio, g.fechaFin, g.modalidad)}
                </td>

                {/* Docente */}
                <td className="whitespace-nowrap px-3 py-3.5 text-[12.5px]">
                  {g.docente ? (
                    <span className={softText}>{g.docente}</span>
                  ) : g.estado === 'proximo' ? (
                    <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                      Sin asignar
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sin asignar</span>
                  )}
                </td>

                {/* Alumnos (CORA) */}
                <td className={`${mono} px-3 py-3.5 text-right text-[13px] font-semibold ${g.alumnos > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {g.alumnos || '—'}
                </td>

                {/* Estado */}
                <td className="px-3 py-3.5">
                  <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${ESTADO[g.estado].clase}`}>
                    {ESTADO[g.estado].texto}
                  </span>
                </td>

                {/* Contenido (herencia) */}
                <td className="px-3 py-3.5">
                  <SelloHerencia overrides={g.overrides} />
                </td>

                {/* ⋯ — solo "Borrar grupo", solo en nativos */}
                <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  {g.esNativo ? (
                    <MenuFila nombre={g.nombre} onBorrar={() => setABorrar(g)} />
                  ) : (
                    <span aria-hidden className="inline-block h-9 w-9" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibles.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-[15px] font-bold">
              {grupos.length === 0 ? 'Aún no hay grupos' : 'Ningún grupo con ese filtro'}
            </p>
            <p className={`mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed ${softText}`}>
              {grupos.length === 0
                ? 'Los grupos de CORA aparecen aquí automáticamente; crea uno con “Nuevo grupo”.'
                : 'Quita los filtros o cambia la búsqueda.'}
            </p>
          </div>
        )}

        {/* Paginación numerada — convive con búsqueda/filtros (recalcula sobre lo filtrado) */}
        {visibles.length > 0 && totalPaginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className={`text-[12px] ${softText}`}>
              <span className={mono}>{desde}</span>–<span className={mono}>{hasta}</span> de{' '}
              <span className={mono}>{visibles.length}</span> grupos
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                aria-label="Página anterior"
                className={`grid h-8 w-8 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
              >
                <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              {numerosPagina(paginaActual, totalPaginas).map((n, i) =>
                n === '…' ? (
                  <span key={`e${i}`} className="px-1.5 text-[12.5px] text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPagina(n)}
                    aria-label={`Página ${n}`}
                    aria-current={n === paginaActual ? 'page' : undefined}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-[9px] px-2 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                      n === paginaActual
                        ? 'bg-sidebar text-sidebar-foreground'
                        : 'border border-border bg-card text-foreground hover:bg-muted'
                    }`}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                aria-label="Página siguiente"
                className={`grid h-8 w-8 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
              >
                <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* CORA es la fuente de verdad de inscripciones (texto del mock) */}
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card px-5 py-3.5">
        <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <Link2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </span>
        <p className={`text-[12.5px] leading-relaxed ${softText}`}>
          Alumnos, inscripciones y calificaciones son fuente de verdad de{' '}
          <span className="font-bold text-foreground">CORA</span>: aquí se consultan. Lo editable del
          grupo es sus datos, el calendario de liberación, el docente y sus personalizaciones de
          contenido.
        </p>
      </div>

      {nuevo && (
        <ModalNuevoGrupo
          programas={programasPublicados}
          docentes={docentes}
          onCerrar={() => setNuevo(false)}
        />
      )}
      {aBorrar && <ModalBorrar grupo={aBorrar} onCerrar={() => setABorrar(null)} onBorrado={() => router.refresh()} />}
    </div>
  );
}

/* ───────────────────────── Menú ⋯ de fila (solo Borrar) ───────────────────────── */

function MenuFila({ nombre, onBorrar }: { nombre: string; onBorrar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-label={`Más acciones de ${nombre}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
      >
        <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      {abierto && (
        <>
          {/* backdrop para cerrar al clicar fuera */}
          <span className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <span
            role="menu"
            className="absolute right-0 top-[calc(100%+4px)] z-50 w-[180px] overflow-hidden rounded-[11px] border border-border bg-card py-1 text-left shadow-[0_12px_28px_rgba(17,24,39,0.16)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAbierto(false);
                onBorrar();
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold text-destructive transition-colors hover:bg-[color:var(--destructive-surface)] ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Borrar grupo
            </button>
          </span>
        </>
      )}
    </span>
  );
}

/* ───────────────────────── Modal: confirmar borrado ───────────────────────── */

function ModalBorrar({
  grupo,
  onCerrar,
  onBorrado,
}: {
  grupo: GrupoResumen;
  onCerrar: () => void;
  onBorrado: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [borrando, iniciar] = useTransition();

  function confirmar() {
    setError(null);
    iniciar(async () => {
      const r = await borrarGrupo(grupo.id);
      if (!r.ok) {
        setError(r.error ?? 'No se pudo borrar el grupo.');
        return;
      }
      onBorrado();
      onCerrar();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Borrar grupo"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="px-6 pb-5 pt-6">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--destructive-surface)] text-destructive">
              <Trash2 className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-extrabold leading-snug tracking-[-0.015em]">Borrar grupo</h2>
              <p className={`mt-1.5 text-[13.5px] leading-relaxed ${softText}`}>
                Se eliminará <span className="font-bold text-foreground">{grupo.nombre}</span> y todas sus
                personalizaciones. El programa base y su contenido no se tocan. Esta acción no se puede
                deshacer.
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-medium text-[color:var(--destructive-foreground)]">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-border bg-muted px-6 py-4">
          <button
            type="button"
            onClick={onCerrar}
            disabled={borrando}
            className={`h-11 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={borrando}
            className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-destructive px-5 text-[13.5px] font-bold text-white transition-colors hover:brightness-95 disabled:opacity-60 ${focusRing}`}
          >
            {borrando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Trash2 aria-hidden className="h-4 w-4" strokeWidth={2} />}
            Borrar grupo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Modal: Nuevo grupo (2 pasos · §5) ───────────────────────── */

function ModalNuevoGrupo({
  programas,
  docentes,
  onCerrar,
}: {
  programas: ProgramaResumen[];
  docentes: { userId: string; nombre: string }[];
  onCerrar: () => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [programaId, setProgramaId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [modalidad, setModalidad] = useState<'sincrono' | 'asincrono'>('sincrono');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [docenteId, setDocenteId] = useState('');
  const [portadaRef, setPortadaRef] = useState<string | null>(null);
  const [portadaUrl, setPortadaUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorPortada, setErrorPortada] = useState<string | null>(null);
  const [creando, iniciar] = useTransition();

  const programaSel = programas.find((p) => p.id === programaId) ?? null;
  const invalido = !programaId || !nombre.trim();

  function extDe(n: string): string {
    const m = /\.([a-zA-Z0-9]+)$/.exec(n);
    const e = (m?.[1] ?? 'jpg').toLowerCase();
    return e === 'jpeg' ? 'jpg' : e;
  }

  async function subirPortada(file: File) {
    setErrorPortada(null);
    setSubiendo(true);
    try {
      const sol = await firmarSubidaImagenContenido(extDe(file.name));
      if (!sol.ok) {
        setErrorPortada(sol.error);
        return;
      }
      const put = await fetch(sol.datos.urlSubida, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'image/jpeg' },
        body: file,
      }).catch(() => null);
      if (!put || !put.ok) {
        setErrorPortada('No se pudo subir la imagen (URL firmada). Reintenta.');
        return;
      }
      setPortadaRef(sol.datos.ref);
      setPortadaUrl(sol.datos.urlLectura);
    } finally {
      setSubiendo(false);
    }
  }

  function crear() {
    if (invalido || !programaId) return;
    iniciar(() =>
      crearGrupo(programaId, {
        nombre,
        modalidad,
        fechaInicio: modalidad === 'sincrono' ? inicio : null,
        fechaFin: modalidad === 'sincrono' ? fin : null,
        docenteId: docenteId || null,
        imagenPortada: portadaRef,
      }),
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo grupo"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="flex max-h-[88vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>{paso === 1 ? 'Elegir programa base' : 'Datos del grupo'}</p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">Nuevo grupo</h2>
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

        {/* ── Paso 1: elegir programa publicado ── */}
        {paso === 1 && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
            <p className={`text-[13.5px] leading-relaxed ${softText}`}>
              El grupo nace apuntando a la versión publicada del programa, Estándar y sin
              personalizaciones. Elige el programa base.
            </p>
            {programas.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-[color:var(--track)] bg-card px-6 py-10 text-center">
                <p className="text-[14px] font-bold">No hay programas publicados</p>
                <p className={`mx-auto mt-1.5 max-w-[42ch] text-[12.5px] ${softText}`}>
                  Publica un programa en el course builder para poder abrir un grupo sobre él.
                </p>
              </div>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {programas.map((p) => {
                  const on = p.id === programaId;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setProgramaId(p.id)}
                        className={`flex w-full items-center gap-3 rounded-[11px] border p-3.5 text-left transition-colors ${focusRing} ${
                          on ? 'border-[color:var(--secondary)] bg-accent' : 'border-border hover:bg-muted'
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-bold leading-snug">{p.nombre}</span>
                          <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                            v{p.version} · {p.horas} h · {p.gruposActivos} {p.gruposActivos === 1 ? 'grupo' : 'grupos'}
                          </span>
                        </span>
                        {on && <Check aria-hidden className="h-[18px] w-[18px] shrink-0 text-secondary" strokeWidth={2.4} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── Paso 2: datos del grupo ── */}
        {paso === 2 && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
            <div className="flex items-center gap-2 rounded-[10px] border border-border bg-muted px-3 py-2.5">
              <Link2 aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{programaSel?.nombre}</span>
              <span className={`${mono} shrink-0 text-[11.5px] text-muted-foreground`}>v{programaSel?.version}</span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <label className="block">
                <span className="block text-[11.5px] font-semibold">Nombre del grupo</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Grupo A · Feb 2026"
                  className="mt-1.5 h-10 w-full rounded-[10px] border border-border bg-card px-3 text-[13.5px] font-medium text-foreground outline-none transition-colors focus:border-secondary"
                />
              </label>

              <label className="block">
                <span className="block text-[11.5px] font-semibold">Modalidad</span>
                <Select
                  aria-label="Modalidad"
                  value={modalidad}
                  onChange={(v) => setModalidad(v as 'sincrono' | 'asincrono')}
                  className={`mt-1.5 flex h-10 w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-[13.5px] font-medium text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
                  options={[
                    { value: 'sincrono', label: 'Síncrono · con fechas' },
                    { value: 'asincrono', label: 'Asíncrono · sin fechas' },
                  ]}
                />
              </label>

              {modalidad === 'sincrono' && (
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ['Inicio', inicio, setInicio] as const,
                      ['Fin', fin, setFin] as const,
                    ]
                  ).map(([l, val, set]) => (
                    <label key={l} className="block">
                      <span className="block text-[11.5px] font-semibold">{l}</span>
                      <span className="mt-1.5 flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3">
                        <Calendar aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                        <input
                          type="date"
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          className={`${mono} w-full bg-transparent text-[13px] text-foreground outline-none`}
                        />
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <label className="block">
                <span className="block text-[11.5px] font-semibold">Docente <span className="font-normal text-muted-foreground">(opcional)</span></span>
                <Select
                  aria-label="Docente asignado"
                  value={docenteId}
                  onChange={setDocenteId}
                  placeholder="Sin asignar"
                  className={`mt-1.5 flex h-10 w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-[13.5px] font-medium text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
                  options={[{ value: '', label: 'Sin asignar' }, ...docentes.map((d) => ({ value: d.userId, label: d.nombre }))]}
                />
              </label>

              <div className="block">
                <span className="block text-[11.5px] font-semibold">Portada <span className="font-normal text-muted-foreground">(opcional)</span></span>
                {errorPortada && (
                  <p className="mt-1.5 rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[11.5px] font-medium text-[color:var(--destructive-foreground)]">
                    {errorPortada}
                  </p>
                )}
                <div className="mt-1.5 overflow-hidden rounded-[11px] border border-border bg-muted">
                  {portadaUrl ? (
                    <ImgDerivada url={portadaUrl} className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[16/9] w-full place-items-center text-muted-foreground">
                      <span className="flex flex-col items-center gap-1.5">
                        <ImageIcon aria-hidden className="h-6 w-6" strokeWidth={1.5} />
                        <span className="text-[11px]">Hereda la del programa</span>
                      </span>
                    </div>
                  )}
                </div>
                <label
                  className={`mt-2 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${
                    subiendo ? 'pointer-events-none opacity-60' : ''
                  } ${focusRing}`}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={subiendo}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void subirPortada(f);
                      e.target.value = '';
                    }}
                  />
                  {subiendo ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Upload aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
                  {subiendo ? 'Subiendo…' : portadaUrl ? 'Reemplazar' : 'Subir portada'}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── Pie ── */}
        <div className="mt-4 flex items-center gap-2.5 border-t border-border bg-muted px-6 py-4">
          {paso === 2 && (
            <button
              type="button"
              onClick={() => setPaso(1)}
              className={`inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
              Atrás
            </button>
          )}
          <span className="ml-auto flex gap-2.5">
            <button
              type="button"
              onClick={onCerrar}
              className={`h-11 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Cancelar
            </button>
            {paso === 1 ? (
              <button
                type="button"
                onClick={() => setPaso(2)}
                disabled={!programaId}
                className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={crear}
                disabled={invalido || creando || subiendo}
                className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
              >
                {creando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />}
                Crear grupo
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
