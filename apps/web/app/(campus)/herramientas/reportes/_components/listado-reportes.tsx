'use client';

/**
 * Mis reportes (§6.5) — HERRAMIENTA que reemplaza el reporte en Word. "Qué me falta"
 * + tabla filtrable + "Nuevo reporte". App real: lee de `lxp.reportes` bajo RLS y crea
 * borradores con un server action. Referencia visual: mock `alumno/reportes`.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, FileText, MoreHorizontal, Plus, Search, X } from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { crearReporte } from '../_acciones';
import { ETIQUETA_ESTADO, type EstadoReporte, type ReportesData } from '../_contrato';

const claseEstado: Record<EstadoReporte, string> = {
  borrador: 'border border-border bg-muted text-[color:var(--foreground-soft)]',
  finalizado: 'bg-accent text-accent-foreground',
  enviado:
    'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
};

export function ListadoReportes({ data }: { data: ReportesData }) {
  const { resumen, conteos, items, plantillas } = data;
  const router = useRouter();
  const [estado, setEstado] = useState<'todos' | EstadoReporte>('todos');
  const [tipo, setTipo] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creando, iniciarCrear] = useTransition();

  // Tipos de estudio para el filtro: los que traen las plantillas publicadas.
  const tiposEstudio = useMemo(
    () => Array.from(new Set(plantillas.map((p) => p.tipoEstudio).filter(Boolean))),
    [plantillas],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((r) => {
      if (estado !== 'todos' && r.estado !== estado) return false;
      if (tipo !== 'Todos' && r.tipoEstudio !== tipo) return false;
      if (!q) return true;
      return [r.folio, r.paciente, r.plantilla, r.tipoEstudio].join(' ').toLowerCase().includes(q);
    });
  }, [items, estado, tipo, busqueda]);

  function crear(plantillaId: string) {
    setError(null);
    iniciarCrear(async () => {
      const res = await crearReporte(plantillaId);
      if (res.ok) {
        setNuevoAbierto(false);
        router.push(`/herramientas/reportes/${res.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  const tarjetas = [
    {
      t: 'Borradores',
      n: resumen.borradores,
      m: 'Termínelos antes de cerrar el día',
      clase:
        'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
    },
    {
      t: 'Listos para enviar',
      n: resumen.listos,
      m: 'Finalizados sin enviar',
      clase: 'border-transparent bg-accent text-accent-foreground',
    },
    {
      t: 'Enviados esta semana',
      n: resumen.enviadosSemana,
      m: 'Con acuse de correo',
      clase:
        'border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
    },
    {
      t: 'Reportes del mes',
      n: resumen.delMes,
      m: 'Su producción reciente',
      clase: 'border-border bg-card text-[color:var(--foreground-soft)]',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Mis reportes</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Genere el reporte clínico aquí, embeba sus imágenes DICOM y envíelo al paciente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setNuevoAbierto(true);
          }}
          className={`ml-auto inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
          Nuevo reporte
        </button>
      </div>

      {/* qué me falta */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((c) => (
          <section
            key={c.t}
            className={`rounded-xl border p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ${c.clase}`}
          >
            <p className={kicker}>{c.t}</p>
            <p className={`${mono} mt-2.5 text-[30px] font-extrabold leading-none tracking-[-0.03em]`}>
              {c.n}
            </p>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">{c.m}</p>
          </section>
        ))}
      </div>

      {/* filtros */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Estado del reporte"
          className="flex gap-1.5 rounded-full border border-border bg-card p-1"
        >
          {(
            [
              ['todos', 'Todos', conteos.todos],
              ['borrador', 'Borradores', conteos.borradores],
              ['finalizado', 'Finalizados', conteos.finalizados],
              ['enviado', 'Enviados', conteos.enviados],
            ] as const
          ).map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={estado === id}
              onClick={() => setEstado(id)}
              className={`inline-flex h-10 items-center gap-[7px] whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                estado === id
                  ? 'bg-sidebar text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} ${estado === id ? 'opacity-70' : 'text-muted-foreground'}`}>
                {n}
              </span>
            </button>
          ))}
        </div>

        <label className="flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5">
          <span className="text-[12.5px] text-muted-foreground">Estudio</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="appearance-none bg-transparent text-[13.5px] font-semibold text-foreground outline-none"
          >
            <option value="Todos">Todos</option>
            {tiposEstudio.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        </label>

        <label className="ml-auto flex h-12 min-w-[280px] items-center gap-2.5 rounded-full border border-border bg-card px-5 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar reportes</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por paciente, folio o estudio…"
            className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* tabla / vacío */}
      {items.length === 0 ? (
        <div className={`${card} mt-4 grid place-items-center gap-3 px-6 py-16 text-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
            <FileText aria-hidden className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="text-[15px] font-bold">Aún no tiene reportes</p>
          <p className={`max-w-[420px] text-[13px] ${softText}`}>
            Cree su primer reporte clínico: elija el tipo de estudio, embeba sus imágenes y redacte los
            hallazgos con la guía de la plantilla.
          </p>
          <button
            type="button"
            onClick={() => setNuevoAbierto(true)}
            className={`mt-1 inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
            Nuevo reporte
          </button>
        </div>
      ) : (
        <div className={`${card} mt-4 overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-muted">
                  {['Folio', 'Paciente', 'Estudio', 'Fecha', 'Estado', ''].map((h, i) => (
                    <th
                      key={h || i}
                      className={`px-4 py-3 ${kicker} text-muted-foreground ${i === 5 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={r.id} className="border-t border-border transition-colors hover:bg-accent">
                    <td className="px-4 py-3.5">
                      <span className={`${mono} block text-[12.5px] font-bold`}>{r.folio}</span>
                      <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                        {r.imagenes} {r.imagenes === 1 ? 'imagen' : 'imágenes'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block text-[14px] font-bold">{r.paciente}</span>
                      <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                        {r.edadSexo}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 text-[13.5px] ${softText}`}>
                      <span className="block font-semibold text-foreground">{r.plantilla}</span>
                      {r.tipoEstudio && (
                        <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{r.tipoEstudio}</span>
                      )}
                    </td>
                    <td className={`${mono} px-4 py-3.5 text-[12.5px] text-muted-foreground`}>{r.fecha}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseEstado[r.estado]}`}
                      >
                        {ETIQUETA_ESTADO[r.estado]}
                      </span>
                      <span className="mt-1 block text-[11.5px] text-muted-foreground">{r.nota}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/herramientas/reportes/${r.id}`}
                          className={`inline-flex h-10 items-center rounded-full border border-border bg-card px-3.5 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                        >
                          {r.estado === 'borrador' ? 'Continuar' : 'Abrir'}
                        </Link>
                        <button
                          type="button"
                          aria-label="Más acciones"
                          className={`grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                        >
                          <MoreHorizontal aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                      Ningún reporte coincide con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <span className={`${mono} text-[12px] text-muted-foreground`}>
            {visibles.length} de {conteos.todos}
          </span>
        </div>
      )}

      {/* diálogo: nuevo reporte (elegir plantilla) */}
      {nuevoAbierto && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,45,82,0.32)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo reporte"
          onClick={() => !creando && setNuevoAbierto(false)}
        >
          <div
            className={`${card} w-full max-w-[520px] p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold tracking-[-0.01em]">Nuevo reporte</h2>
                <p className={`mt-1 text-[12.5px] ${softText}`}>
                  Elija una plantilla. Guía la redacción por secciones para no omitir nada.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setNuevoAbierto(false)}
                disabled={creando}
                className={`ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 ${focusRing}`}
              >
                <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
              </button>
            </div>

            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Plantillas publicadas
            </p>
            {plantillas.length === 0 ? (
              <p className="mt-2 rounded-xl border border-border bg-muted px-4 py-6 text-center text-[13px] text-muted-foreground">
                No hay plantillas publicadas todavía. El diseñador las publica desde el Studio.
              </p>
            ) : (
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                {plantillas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={creando}
                    onClick={() => crear(p.id)}
                    className={`rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-secondary hover:bg-accent disabled:opacity-60 ${focusRing}`}
                  >
                    <span className="block text-[14px] font-bold">{p.nombre}</span>
                    <span className={`${mono} mt-1 block text-[11.5px] text-muted-foreground`}>
                      {p.tipoEstudio ? `${p.tipoEstudio} · ` : ''}
                      {p.secciones} secciones · {p.campos} campos
                    </span>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2 text-[12.5px] text-[color:var(--warning-foreground)]">
                {error}
              </p>
            )}
            {creando && (
              <p className="mt-3 text-[12.5px] text-muted-foreground">Creando el reporte…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
