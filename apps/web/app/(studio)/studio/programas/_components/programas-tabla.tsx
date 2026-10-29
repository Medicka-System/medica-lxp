'use client';

/**
 * Studio · Programas — UNA sola lista (§5B · PUENTE 1), sin tab de origen.
 * Mezcla programas NATIVOS del LXP y el ESPEJO de CORA; cada fila lleva un CHIP de origen.
 * NADA de grupos anidados (los grupos viven en su propia vista). Acción por fila:
 *   • LXP            → abrir el builder (editar).
 *   • CORA con shell → "Abrir contenido" (abre el builder ya provisionado).
 *   • CORA sin shell → "Construir contenido" → `abrirProgramaCora` (shell idempotente).
 * "Nuevo programa" crea un programa NATIVO del LXP.
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Hammer, Loader2, MoreVertical, Pencil, Plus, Search, Trash2, TriangleAlert, X } from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import type { EstadoContenido, OrigenPrograma, ProgramaListaItem } from '@/lib/studio/datos';
import { abrirProgramaCora, borrarPrograma, crearPrograma } from '@/lib/studio/acciones';

const ESTADO: Record<EstadoContenido, { texto: string; clase: string }> = {
  publicado: { texto: 'Publicado', clase: 'bg-accent text-accent-foreground' },
  borrador: {
    texto: 'Borrador',
    clase: 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  },
  'sin-contenido': { texto: 'Sin contenido aún', clase: 'border border-border bg-muted text-muted-foreground' },
};

function ChipOrigen({ origen }: { origen: OrigenPrograma }) {
  return origen === 'cora' ? (
    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11px] font-bold text-secondary">
      <GraduationCap aria-hidden className="h-3 w-3" strokeWidth={1.75} />
      CORA
    </span>
  ) : (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-bold text-muted-foreground">
      LXP
    </span>
  );
}

export function ProgramasTabla({ programas }: { programas: ProgramaListaItem[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [origen, setOrigen] = useState<'todos' | OrigenPrograma>('todos');
  const [creando, iniciarCreacion] = useTransition();
  const [abriendo, iniciarApertura] = useTransition();
  // Menú de fila (tres puntos) + modal de borrado. Solo programas NATIVOS son borrables.
  const [menu, setMenu] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<ProgramaListaItem | null>(null);

  const conteos = useMemo(
    () => ({
      todos: programas.length,
      cora: programas.filter((p) => p.origen === 'cora').length,
      lxp: programas.filter((p) => p.origen === 'lxp').length,
    }),
    [programas],
  );

  const visibles = useMemo(
    () =>
      programas.filter(
        (p) =>
          (origen === 'todos' || p.origen === origen) &&
          (!busca.trim() ||
            p.nombre.toLowerCase().includes(busca.trim().toLowerCase()) ||
            (p.slug ?? '').toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [programas, origen, busca],
  );

  // Abre la fila: LXP/CORA-con-shell → builder; CORA-sin-shell → provisiona shell y entra.
  const abrir = (p: ProgramaListaItem) => {
    if (p.lxpProgramaId) {
      router.push(`/studio/programas/${p.lxpProgramaId}`);
    } else if (p.coraProgramaId) {
      iniciarApertura(() => abrirProgramaCora(p.coraProgramaId!));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Programas</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Una sola lista: los de CORA (espejo) y los nativos del LXP. Construye contenido sobre cualquiera.
            Los grupos viven en su propia vista.
          </p>
        </div>
        <button
          type="button"
          onClick={() => iniciarCreacion(() => crearPrograma())}
          disabled={creando}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          {creando ? 'Creando…' : 'Nuevo programa (LXP)'}
        </button>
      </div>

      {/* filtros (origen = FILTRO dentro de la lista única, no un tab que la parte) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[320px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar programa</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar programa…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ['todos', 'Todos'],
              ['cora', 'CORA'],
              ['lxp', 'LXP'],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setOrigen(id)}
              aria-pressed={origen === id}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                origen === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${origen === id ? 'text-white/70' : 'text-muted-foreground'}`}>{conteos[id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* tabla */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {(
                [
                  ['Programa', 'left'],
                  ['Origen', 'left'],
                  ['Estado', 'left'],
                  ['Módulos', 'right'],
                  ['Horas', 'right'],
                  ['Última edición', 'left'],
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
            {visibles.map((p) => (
              <tr key={p.clave} className="border-t border-border">
                <td className="p-0">
                  <button
                    type="button"
                    onClick={() => abrir(p)}
                    disabled={abriendo}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted disabled:opacity-60 ${focusRing}`}
                  >
                    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-muted text-muted-foreground">
                      <GraduationCap className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold leading-snug">{p.nombre}</span>
                      <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                        {p.slug ? p.slug : `${p.horas} h${p.version ? ` · v${p.version}` : ''}`}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <ChipOrigen origen={p.origen} />
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${ESTADO[p.estado].clase}`}>
                    {ESTADO[p.estado].texto}
                  </span>
                </td>
                <td className={`${mono} px-4 py-3.5 text-right text-[13px] font-semibold ${p.modulos > 0 ? '' : 'text-muted-foreground'}`}>
                  {p.modulos || '—'}
                </td>
                <td className={`${mono} px-4 py-3.5 text-right text-[13px] font-semibold ${p.horas > 0 ? '' : 'text-muted-foreground'}`}>
                  {p.horas ? `${p.horas} h` : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-muted-foreground">
                  {p.actualizado ? haceCuanto(p.actualizado) : '—'}
                </td>
                <td className="px-3 py-3.5 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => abrir(p)}
                      disabled={abriendo}
                      className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-bold transition-colors disabled:opacity-60 ${
                        p.lxpProgramaId
                          ? `border border-border bg-card ${softText} hover:bg-muted`
                          : 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
                      } ${focusRing}`}
                    >
                      {p.lxpProgramaId ? (
                        <>
                          <Pencil aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
                          {p.origen === 'cora' ? 'Abrir contenido' : 'Editar'}
                        </>
                      ) : (
                        <>
                          <Hammer aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
                          {abriendo ? 'Abriendo…' : 'Construir contenido'}
                        </>
                      )}
                    </button>

                    {/* Tres puntos: SOLO programas NATIVOS del LXP son borrables (los reflejados
                        de CORA son de CORA — sin opción, igual que el patrón de borrar grupo). */}
                    {p.origen === 'lxp' && p.lxpProgramaId && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenu(menu === p.clave ? null : p.clave)}
                          aria-haspopup="menu"
                          aria-expanded={menu === p.clave}
                          aria-label={`Más acciones de ${p.nombre}`}
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                        >
                          <MoreVertical aria-hidden className="h-4 w-4" strokeWidth={2} />
                        </button>
                        {menu === p.clave && (
                          <>
                            <button
                              type="button"
                              aria-label="Cerrar menú"
                              onClick={() => setMenu(null)}
                              className="fixed inset-0 z-20 cursor-default"
                            />
                            <div
                              role="menu"
                              className="absolute right-0 top-full z-30 mt-1.5 w-[180px] overflow-hidden rounded-[11px] border border-border bg-card py-1 shadow-2xl"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenu(null);
                                  setBorrar(p);
                                }}
                                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold text-destructive transition-colors hover:bg-[color:var(--destructive-surface)] ${focusRing}`}
                              >
                                <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} /> Borrar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibles.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-[15px] font-bold">
              {programas.length === 0 ? 'Aún no hay programas' : 'Ningún programa con ese filtro'}
            </p>
            <p className={`mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed ${softText}`}>
              {programas.length === 0
                ? 'Los programas de CORA aparecen solos; crea uno nativo con “Nuevo programa”.'
                : 'Quita el filtro o cambia la búsqueda.'}
            </p>
          </div>
        )}
      </section>

      {borrar && (
        <ModalBorrarPrograma
          programa={borrar}
          onCerrar={() => setBorrar(null)}
          onBorrado={() => {
            setBorrar(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Modal: borrar programa nativo ───────────────────────── */

function ModalBorrarPrograma({
  programa,
  onCerrar,
  onBorrado,
}: {
  programa: ProgramaListaItem;
  onCerrar: () => void;
  onBorrado: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  function confirmar() {
    if (!programa.lxpProgramaId) return;
    setError(null);
    iniciar(async () => {
      const r = await borrarPrograma(programa.lxpProgramaId!);
      if (!r.ok) {
        setError(r.error ?? 'No se pudo borrar el programa.');
        return;
      }
      onBorrado();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Borrar programa"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 px-6 pb-4 pt-6">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[color:var(--destructive-surface)] text-destructive">
            <Trash2 className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-destructive`}>Borrar programa</p>
            <h2 className="mt-1.5 text-[18px] font-extrabold leading-snug tracking-[-0.015em]">
              ¿Borrar «{programa.nombre}»?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            disabled={pendiente}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted disabled:opacity-40 ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <p className={`px-6 text-[13px] leading-relaxed ${softText}`}>
          Se borra el programa y <span className="font-bold text-foreground">todo su contenido</span>{' '}
          (módulos, lecciones y bloques). Esta acción no se puede deshacer. Si el programa tiene grupos
          que derivan, se bloqueará el borrado.
        </p>

        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-[11px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-3">
            <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
            <p className="text-[12.5px] font-medium leading-relaxed text-[color:var(--destructive-foreground)]">{error}</p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-border bg-muted px-6 py-4">
          <button
            type="button"
            onClick={onCerrar}
            disabled={pendiente}
            className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pendiente}
            className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-destructive px-5 text-[13.5px] font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
          >
            {pendiente ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Trash2 aria-hidden className="h-4 w-4" strokeWidth={2} />}
            Borrar programa
          </button>
        </div>
      </div>
    </div>
  );
}
