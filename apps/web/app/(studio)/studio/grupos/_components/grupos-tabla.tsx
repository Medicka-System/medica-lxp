'use client';

/**
 * Studio · Grupos — lista de instancias (§5B/§6 · PUENTE 1).
 *
 * Aquí viven los grupos (antes la sección quedaba vacía porque sólo leía lxp.grupos
 * reflejados). Dos orígenes en UNA tabla, con chip:
 *   • CORA → TODOS los grupos de CORA visibles al staff (read-only · mig 0084), con su
 *     programa, modalidad, fechas y conteo; el ROSTER de alumnos se expande (lazy).
 *   • LXP  → grupos NATIVOS del LXP (sobre un programa nativo), con su editor propio.
 * Alumnos/inscripciones son fuente de verdad de CORA (solo lectura). Lo editable de un
 * grupo nativo vive en su detalle.
 */

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, GraduationCap, Lock, Plus, Search, Users } from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { Select } from '@/components/ui/select';
import { fechaCortaDia } from '@/lib/format';
import type { GrupoCoraStaff, GrupoResumen } from '@/lib/studio/datos';
import { crearGrupo, getRosterGrupoCora, type AlumnoRoster } from '@/lib/studio/acciones';

const MODALIDAD_CORA: Record<string, string> = {
  online: 'En línea',
  presencial: 'Presencial',
  hibrida: 'Híbrida',
};

/** Rango de fechas de columnas DATE (UTC-safe → sin off-by-one; inicio–fin en orden). */
function rango(inicio: Date | null, fin: Date | null): string {
  if (!inicio && !fin) return 'Sin fechas';
  return `${inicio ? fechaCortaDia(inicio) : '—'} – ${fin ? fechaCortaDia(fin) : '—'}`;
}

/** Fila unificada de la tabla (CORA | LXP nativo). */
type Fila =
  | {
      origen: 'cora';
      key: string;
      coraGrupoId: string;
      nombre: string;
      programa: string;
      modalidad: string | null;
      ini: Date | null;
      fin: Date | null;
      alumnos: number;
    }
  | {
      origen: 'lxp';
      key: string;
      lxpId: string;
      nombre: string;
      programa: string;
      modalidad: 'sincrono' | 'asincrono';
      ini: Date | null;
      fin: Date | null;
      alumnos: number;
    };

function ChipOrigen({ origen }: { origen: 'cora' | 'lxp' }) {
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

export function GruposTabla({
  grupos,
  gruposCora,
  programasNativos,
}: {
  grupos: GrupoResumen[];
  gruposCora: GrupoCoraStaff[];
  programasNativos: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [origen, setOrigen] = useState<'todos' | 'cora' | 'lxp'>('todos');
  const [nativoSel, setNativoSel] = useState(programasNativos[0]?.id ?? '');
  const [creando, setCreando] = useState(false);
  // Roster lazy por grupo CORA: estado de expansión + cache (undefined = sin cargar).
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [rosters, setRosters] = useState<Map<string, AlumnoRoster[] | 'cargando'>>(new Map());

  const filas: Fila[] = useMemo(() => {
    const cora: Fila[] = gruposCora.map((g) => ({
      origen: 'cora',
      key: `cora:${g.coraGrupoId}`,
      coraGrupoId: g.coraGrupoId,
      nombre: g.nombre,
      programa: g.programaNombre,
      modalidad: g.modalidad,
      ini: g.fechaInicio,
      fin: g.fechaFin,
      alumnos: g.alumnos,
    }));
    const lxp: Fila[] = grupos.map((g) => ({
      origen: 'lxp',
      key: `lxp:${g.id}`,
      lxpId: g.id,
      nombre: g.nombre,
      programa: g.programaNombre,
      modalidad: g.modalidad,
      ini: g.fechaInicio,
      fin: g.fechaFin,
      alumnos: g.alumnos,
    }));
    return [...cora, ...lxp];
  }, [gruposCora, grupos]);

  const conteos = useMemo(
    () => ({ todos: filas.length, cora: gruposCora.length, lxp: grupos.length }),
    [filas.length, gruposCora.length, grupos.length],
  );

  const visibles = useMemo(
    () =>
      filas.filter(
        (f) =>
          (origen === 'todos' || f.origen === origen) &&
          (!busca.trim() ||
            f.nombre.toLowerCase().includes(busca.trim().toLowerCase()) ||
            f.programa.toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [filas, origen, busca],
  );

  const totalAlumnos = gruposCora.reduce((s, g) => s + g.alumnos, 0);

  const toggleRoster = async (coraGrupoId: string) => {
    setAbiertos((prev) => {
      const n = new Set(prev);
      if (n.has(coraGrupoId)) n.delete(coraGrupoId);
      else n.add(coraGrupoId);
      return n;
    });
    if (!rosters.has(coraGrupoId)) {
      setRosters((prev) => new Map(prev).set(coraGrupoId, 'cargando'));
      try {
        const r = await getRosterGrupoCora(coraGrupoId);
        setRosters((prev) => new Map(prev).set(coraGrupoId, r));
      } catch {
        setRosters((prev) => new Map(prev).set(coraGrupoId, []));
      }
    }
  };

  const etiquetaModalidad = (f: Fila): string =>
    f.origen === 'cora'
      ? f.modalidad
        ? MODALIDAD_CORA[f.modalidad] ?? f.modalidad
        : '—'
      : f.modalidad === 'sincrono'
        ? 'Síncrono'
        : 'Asíncrono';

  const crear = () => {
    if (!nativoSel) return;
    setCreando(true);
    void crearGrupo(nativoSel).catch(() => setCreando(false));
  };

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Grupos</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Los grupos de CORA (espejo, con su roster de alumnos) y los nativos del LXP. Expande un grupo de CORA para ver sus alumnos.
          </p>
        </div>

        {/* Crear grupo NATIVO del LXP (sobre un programa nativo · independiente de CORA). */}
        <div className="flex items-center gap-2">
          {programasNativos.length > 0 ? (
            <>
              <label className="flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3">
                <span className={`${kicker} tracking-[0.1em] text-muted-foreground`}>Programa nativo</span>
                <Select
                  aria-label="Programa nativo para el grupo"
                  value={nativoSel}
                  onChange={setNativoSel}
                  className="flex items-center gap-2 bg-transparent pr-1 text-[13px] font-semibold text-foreground outline-none"
                  options={programasNativos.map((p) => ({ value: p.id, label: p.nombre }))}
                />
              </label>
              <button
                type="button"
                onClick={crear}
                disabled={creando || !nativoSel}
                className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
              >
                <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
                {creando ? 'Creando…' : 'Nuevo grupo'}
              </button>
            </>
          ) : (
            <span className={`text-[12px] ${softText}`}>Crea un programa LXP nativo para poder abrir un grupo propio.</span>
          )}
        </div>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[300px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
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

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {gruposCora.length} grupos CORA · {totalAlumnos.toLocaleString('es-MX')} alumnos
        </span>
      </div>

      {/* tabla */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {(
                [
                  ['Grupo · programa', 'left'],
                  ['Origen', 'left'],
                  ['Modalidad', 'left'],
                  ['Fechas', 'left'],
                  ['Alumnos', 'right'],
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
            {visibles.map((f) => {
              const abierto = f.origen === 'cora' && abiertos.has(f.coraGrupoId);
              const roster = f.origen === 'cora' ? rosters.get(f.coraGrupoId) : undefined;
              return (
                <Fragment key={f.key}>
                  <tr className="border-t border-border">
                    <td className="p-0">
                      <button
                        type="button"
                        onClick={() => (f.origen === 'cora' ? toggleRoster(f.coraGrupoId) : router.push(`/studio/grupos/${f.lxpId}`))}
                        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted ${focusRing}`}
                      >
                        {f.origen === 'cora' ? (
                          abierto ? (
                            <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                          ) : (
                            <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                          )
                        ) : (
                          <span aria-hidden className="h-4 w-4 shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block text-[14px] font-bold leading-snug">{f.nombre}</span>
                          <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>{f.programa}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChipOrigen origen={f.origen} />
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold ${softText}`}>
                        {etiquetaModalidad(f)}
                      </span>
                    </td>
                    <td className={`${mono} whitespace-nowrap px-3 py-3.5 text-[12px] ${f.ini || f.fin ? softText : 'text-muted-foreground'}`}>
                      {rango(f.ini, f.fin)}
                    </td>
                    <td className={`${mono} px-3 py-3.5 text-right text-[13px] font-semibold ${f.alumnos > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {f.alumnos}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      {f.origen === 'cora' ? (
                        <button
                          type="button"
                          onClick={() => toggleRoster(f.coraGrupoId)}
                          className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold ${softText} transition-colors hover:bg-muted ${focusRing}`}
                        >
                          <Users aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
                          {abierto ? 'Ocultar' : 'Ver alumnos'}
                        </button>
                      ) : (
                        <span className={`text-[11.5px] ${softText}`}>Grupo nativo</span>
                      )}
                    </td>
                  </tr>
                  {abierto && (
                    <tr className="border-t border-border bg-muted/40">
                      <td colSpan={6} className="px-5 py-3">
                        {roster === 'cargando' || roster === undefined ? (
                          <p className={`text-[12.5px] ${softText}`}>Cargando alumnos…</p>
                        ) : roster.length === 0 ? (
                          <p className={`text-[12.5px] ${softText}`}>Este grupo no tiene alumnos inscritos en CORA.</p>
                        ) : (
                          <div>
                            <p className={`${kicker} mb-2 text-muted-foreground`}>Roster · {roster.length} alumnos</p>
                            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                              {roster.map((al, i) => (
                                <li key={`${al.matricula ?? ''}-${i}`} className="flex items-center gap-2.5 rounded-[9px] border border-border bg-card px-3 py-2">
                                  <span aria-hidden className={`${mono} grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground`}>
                                    {(al.nombre || '—').slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[12.5px] font-semibold">{al.nombre}</span>
                                    {al.matricula && <span className={`${mono} block text-[10.5px] text-muted-foreground`}>{al.matricula}</span>}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {visibles.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-[15px] font-bold">
              {filas.length === 0 ? 'Aún no hay grupos' : 'Ningún grupo con ese filtro'}
            </p>
            <p className={`mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed ${softText}`}>
              {filas.length === 0
                ? 'Los grupos de CORA aparecen aquí automáticamente; crea uno nativo con “Nuevo grupo”.'
                : 'Quita los filtros o cambia la búsqueda.'}
            </p>
          </div>
        )}
      </section>

      {/* CORA es la fuente de verdad de inscripciones */}
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card px-5 py-3.5">
        <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <Lock className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </span>
        <p className={`text-[12.5px] leading-relaxed ${softText}`}>
          Alumnos, inscripciones y fechas son fuente de verdad de{' '}
          <span className="font-bold text-foreground">CORA</span>: aquí se{' '}
          <span className="font-bold text-foreground">consultan en solo lectura</span>. Los grupos nativos del LXP son
          instancias propias, independientes de CORA.
        </p>
      </div>
    </div>
  );
}
