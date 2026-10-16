'use client';

/**
 * Studio · Grupos — lista de instancias (§5B/§6). Un PROGRAMA es la plantilla; un
 * GRUPO es una instancia (programa + fechas + docente + personalizaciones). El
 * grupo NO copia el contenido: lo hereda y guarda solo lo suyo. Datos reales por
 * RLS. Los grupos NO se crean a mano aquí: nacen de CORA y se reflejan solos en el
 * LXP (PUENTE 1 · mig 0082). Alumnos/inscripciones son fuente de verdad de CORA; aquí
 * el staff edita lo del grupo ya reflejado (docente, portada, personalizaciones).
 *
 * UNA señal de herencia (§ mock): gris+eslabón = Estándar/heredado · violeta =
 * Personalizado. El rojo nunca aparece (personalizar no es un error).
 */

import { useMemo, useState, useTransition } from 'react';
import { ImgDerivada } from '@/components/img-derivada';
import { useRouter } from 'next/navigation';
import {
  Link2,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { Select } from '@/components/ui/select';
import { fechaCorta } from '@/lib/format';
import type { EstadoGrupo, GrupoResumen } from '@/lib/studio/datos';
import { crearGrupo } from '@/lib/studio/acciones';

const ESTADO: Record<EstadoGrupo, { texto: string; clase: string }> = {
  curso: { texto: 'En curso', clase: 'bg-accent text-accent-foreground' },
  proximo: {
    texto: 'Próximo',
    clase:
      'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
  },
  finalizado: { texto: 'Finalizado', clase: 'border border-border bg-muted text-muted-foreground' },
};

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
      Personalizado · {overrides}
    </span>
  );
}

function rango(inicio: Date | null, fin: Date | null): string {
  if (!inicio && !fin) return '—';
  return `${inicio ? fechaCorta(inicio) : '—'} – ${fin ? fechaCorta(fin) : '—'}`;
}

export function GruposTabla({
  grupos,
  programasNativos,
}: {
  grupos: GrupoResumen[];
  /** Programas NATIVOS del LXP (sin CORA): únicos sobre los que se crea un grupo nativo. */
  programasNativos: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [programa, setPrograma] = useState('Todos');
  const [estado, setEstado] = useState<'todos' | EstadoGrupo>('todos');
  // Grupo NATIVO del LXP: se crea sobre un programa nativo (no CORA). Independiente de CORA.
  const [nativoSel, setNativoSel] = useState(programasNativos[0]?.id ?? '');
  const [creando, iniciarCreacion] = useTransition();

  const conteos = useMemo(
    () => ({
      todos: grupos.length,
      curso: grupos.filter((g) => g.estado === 'curso').length,
      proximo: grupos.filter((g) => g.estado === 'proximo').length,
      finalizado: grupos.filter((g) => g.estado === 'finalizado').length,
    }),
    [grupos],
  );

  const personalizados = grupos.filter((g) => g.overrides > 0).length;
  const nombresPrograma = useMemo(
    () => ['Todos', ...new Set(grupos.map((g) => g.programaNombre))],
    [grupos],
  );

  const visibles = useMemo(
    () =>
      grupos.filter(
        (g) =>
          (estado === 'todos' || g.estado === estado) &&
          (programa === 'Todos' || g.programaNombre === programa) &&
          (!busca.trim() || g.nombre.toLowerCase().includes(busca.trim().toLowerCase())),
      ),
    [grupos, estado, programa, busca],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Grupos</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Cada grupo es una instancia de un programa: hereda su temario y guarda solo lo suyo.
            Los de CORA se reflejan solos; los nativos del LXP se crean aquí.
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
                onClick={() => nativoSel && iniciarCreacion(() => crearGrupo(nativoSel))}
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
        <label className="flex h-10 w-[290px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar grupo</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar grupo…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <label className="flex h-10 items-center gap-2 rounded-[9px] border border-border bg-card px-3">
          <span className={`${kicker} tracking-[0.1em] text-muted-foreground`}>Programa</span>
          <Select
            aria-label="Filtrar por programa"
            value={programa}
            onChange={(v) => setPrograma(v)}
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
                estado === id
                  ? 'bg-sidebar text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${estado === id ? 'text-white/70' : 'text-muted-foreground'}`}>
                {conteos[id]}
              </span>
            </button>
          ))}
        </div>

        {personalizados > 0 && (
          <span className="ml-auto inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 text-[12px] font-semibold text-[color:var(--info-foreground)]">
            <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            {personalizados} con personalizaciones
          </span>
        )}
      </div>

      {/* tabla */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {(
                [
                  ['Grupo · programa base', 'left'],
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
            {visibles.map((g) => (
              <tr key={g.id} className="border-t border-border">
                <td className="p-0">
                  <button
                    type="button"
                    onClick={() => router.push(`/studio/grupos/${g.id}`)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className="relative w-14 shrink-0 overflow-hidden rounded-[7px] bg-sidebar"
                      style={{ aspectRatio: '16 / 9' }}
                    >
                      {g.portadaUrl ? (
                        // <img>: URL firmada de object storage (portada del grupo), no asset local.
                        <ImgDerivada url={g.portadaUrl} srcset={g.portadaSrcset} sizes="120px" className="absolute inset-0 h-full w-full object-cover" />
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
                <td className="px-3 py-3.5">
                  <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold ${softText}`}>
                    {g.modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono'}
                  </span>
                </td>
                <td className={`${mono} whitespace-nowrap px-3 py-3.5 text-[12px] ${g.fechaInicio || g.fechaFin ? softText : 'text-muted-foreground'}`}>
                  {rango(g.fechaInicio, g.fechaFin)}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-[12.5px]">
                  {g.docente ? (
                    <span className={softText}>{g.docente}</span>
                  ) : (
                    <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                      Sin asignar
                    </span>
                  )}
                </td>
                <td className={`${mono} px-3 py-3.5 text-right text-[13px] font-semibold ${g.alumnos > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {g.alumnos}
                </td>
                <td className="px-3 py-3.5">
                  <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${ESTADO[g.estado].clase}`}>
                    {ESTADO[g.estado].texto}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <SelloHerencia overrides={g.overrides} />
                </td>
                <td className="px-3 py-3.5 text-right">
                  <button
                    type="button"
                    aria-label={`Más acciones de ${g.nombre}`}
                    className={`grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                  >
                    <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
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
                ? 'Los grupos se abren en CORA y se reflejan aquí al entrar sus alumnos.'
                : 'Quita los filtros para ver todos los grupos.'}
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
          Alumnos, inscripciones y calificaciones son fuente de verdad de{' '}
          <span className="font-bold text-foreground">CORA</span>: aquí se{' '}
          <span className="font-bold text-foreground">consultan en solo lectura</span>. El conteo de
          alumnos y el roster de cada grupo se leen ya vía el puente de inscripción (CORA→LXP). Lo
          editable del grupo es sus datos, el docente y sus personalizaciones de contenido.
        </p>
      </div>
    </div>
  );
}
