'use client';

/**
 * Mis reportes (§6.5) — HERRAMIENTA que reemplaza el reporte en Word. "Qué me falta"
 * + tabla filtrable + "Nuevo reporte". App real: lee de `lxp.reportes` bajo RLS y crea
 * borradores con un server action. Referencia visual: mock `alumno/reportes`.
 */

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { crearReporte, datosReportePdf, eliminarReporte, enviarReporte } from '../_acciones';
import { construirPdfReporte, descargarPdfBlob } from '../_pdf-cliente';
import { ETIQUETA_ESTADO, TAMANOS_PAGINA, type EstadoReporte, type ReporteListItem, type ReportesData } from '../_contrato';
import { Selector } from './selector';

const claseEstado: Record<EstadoReporte, string> = {
  borrador: 'border border-border bg-muted text-[color:var(--foreground-soft)]',
  finalizado: 'bg-accent text-accent-foreground',
  enviado:
    'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
};

export function ListadoReportes({ data }: { data: ReportesData }) {
  // Todo paginado/filtrado en el SERVIDOR: `items` es solo la página; `total` es el conjunto YA
  // FILTRADO; `resumen`/`conteos` son GLOBALES (no cambian con filtro/página). `filtro` = URL.
  const { resumen, conteos, items, plantillas, total, page, size, filtro } = data;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [buscaPlantilla, setBuscaPlantilla] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creando, iniciarCrear] = useTransition();
  // Menú de 3 puntos por fila (posición fija para no recortarse con el overflow de la tabla).
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [mailItem, setMailItem] = useState<ReporteListItem | null>(null);
  const [mailTo, setMailTo] = useState('');
  const [mailAsunto, setMailAsunto] = useState('');
  const [mailBusy, setMailBusy] = useState(false);
  // Borrar borrador: confirmación previa (destructivo · §5A sin rojo fuera de dinero vencido).
  const [borrarItem, setBorrarItem] = useState<ReporteListItem | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  // Búsqueda local (se vuelca a la URL con debounce → el server re-consulta).
  const [busqueda, setBusqueda] = useState(filtro.q);

  // Escribe filtros/página en la URL (el server re-consulta). `push` para cambios explícitos;
  // `replace` para el debounce de búsqueda (no ensucia el historial en cada tecla).
  const setParams = useCallback(
    (patch: Record<string, string | null>, metodo: 'push' | 'replace' = 'push') => {
      const sp = new URLSearchParams(searchParams?.toString() ?? '');
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (metodo === 'replace') router.replace(url);
      else router.push(url);
    },
    [router, pathname, searchParams],
  );

  // Debounce de la búsqueda → URL (?q=…) volviendo a page 1. No empuja si no cambió.
  useEffect(() => {
    const t = setTimeout(() => {
      if (busqueda.trim() !== filtro.q) setParams({ q: busqueda.trim() || null, page: null }, 'replace');
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda, filtro.q, setParams]);

  // Tipos de estudio para el filtro: los que traen las plantillas publicadas.
  const tiposEstudio = useMemo(
    () => Array.from(new Set(plantillas.map((p) => p.tipoEstudio).filter(Boolean))),
    [plantillas],
  );

  // Filtro en vivo del modal "Nuevo reporte" por nombre o tipo de estudio (33 plantillas).
  const plantillasFiltradas = useMemo(() => {
    const q = buscaPlantilla.trim().toLowerCase();
    if (!q) return plantillas;
    return plantillas.filter((p) => `${p.nombre} ${p.tipoEstudio}`.toLowerCase().includes(q));
  }, [plantillas, buscaPlantilla]);

  function abrirNuevo() {
    setError(null);
    setBuscaPlantilla('');
    setNuevoAbierto(true);
  }

  const totalPaginas = Math.max(1, Math.ceil(total / size));
  // El paginador SOLO aparece si el conjunto filtrado no cabe en una página.
  const mostrarPaginador = total > size;

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

  // "Descargar PDF" desde la fila (borrador o finalizado): trae estructura+valores (RLS),
  // rasteriza las imágenes DICOM offscreen y pide el PDF al endpoint → descarga el blob.
  function descargarPdfFila(item: ReporteListItem) {
    setMenu(null);
    setAviso({ tipo: 'ok', texto: `Generando el PDF de ${item.folio}…` });
    setPdfBusy(item.id);
    void (async () => {
      try {
        const d = await datosReportePdf(item.id);
        if (!d.ok) {
          setAviso({ tipo: 'error', texto: d.error });
          return;
        }
        const res = await construirPdfReporte(item.id, d.estructura, d.valores);
        if (!res.ok) {
          setAviso({ tipo: 'error', texto: res.error });
          return;
        }
        descargarPdfBlob(res.pdfBase64, res.filename);
        setAviso({ tipo: 'ok', texto: `PDF de ${item.folio} descargado.` });
      } finally {
        setPdfBusy(null);
      }
    })();
  }

  function abrirMail(item: ReporteListItem) {
    setMenu(null);
    setAviso(null);
    setMailItem(item);
    setMailTo('');
    setMailAsunto(`Reporte ${item.folio}`);
  }

  // "Enviar por mail" (solo finalizados): captura correo+asunto, genera el PDF (mismo flujo) y lo
  // "adjunta". El envío real de correo es STUB (dominio pendiente §8/§9): se marca como enviado.
  function enviarMail() {
    const item = mailItem;
    const correo = mailTo.trim();
    if (!item || !correo) return;
    setMailBusy(true);
    void (async () => {
      try {
        const d = await datosReportePdf(item.id);
        if (!d.ok) {
          setAviso({ tipo: 'error', texto: d.error });
          return;
        }
        const res = await construirPdfReporte(item.id, d.estructura, d.valores);
        if (!res.ok) {
          setAviso({ tipo: 'error', texto: res.error });
          return;
        }
        const env = await enviarReporte(item.id);
        setMailItem(null);
        if (env.ok) {
          setAviso({
            tipo: 'ok',
            texto: `PDF de ${item.folio} generado y enviado a ${correo} (envío por correo pendiente de conectar).`,
          });
          router.refresh();
        } else {
          setAviso({ tipo: 'error', texto: env.error ?? 'No se pudo completar el envío.' });
        }
      } finally {
        setMailBusy(false);
      }
    })();
  }

  function abrirBorrar(item: ReporteListItem) {
    setMenu(null);
    setAviso(null);
    setBorrarItem(item);
  }

  // Elimina el BORRADOR tras confirmar. Solo borradores (el server action lo vuelve a exigir).
  function confirmarBorrar() {
    const item = borrarItem;
    if (!item) return;
    setBorrando(true);
    void (async () => {
      try {
        const res = await eliminarReporte(item.id);
        setBorrarItem(null);
        if (res.ok) {
          setAviso({ tipo: 'ok', texto: `Borrador ${item.folio} eliminado.` });
          router.refresh();
        } else {
          setAviso({ tipo: 'error', texto: res.error });
        }
      } finally {
        setBorrando(false);
      }
    })();
  }

  const menuItem = menu ? (items.find((i) => i.id === menu.id) ?? null) : null;

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
          onClick={abrirNuevo}
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

      {aviso && (
        <p
          className={`mt-4 rounded-[10px] px-3.5 py-2.5 text-[13px] font-medium ${
            aviso.tipo === 'ok'
              ? 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
              : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
          }`}
        >
          {aviso.texto}
        </p>
      )}

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
              aria-selected={filtro.estado === id}
              onClick={() => setParams({ estado: id === 'todos' ? null : id, page: null })}
              className={`inline-flex h-10 items-center gap-[7px] whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                filtro.estado === id
                  ? 'bg-sidebar text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} ${filtro.estado === id ? 'opacity-70' : 'text-muted-foreground'}`}>
                {n}
              </span>
            </button>
          ))}
        </div>

        {/* Filtro estudio: dropdown estilizado §5A (reemplaza el <select> nativo). Cambiar filtro
            vuelve a page 1 y conserva el resto de la URL. */}
        <Selector
          rotulo="Estudio"
          valor={filtro.estudio || 'Todos'}
          opciones={[{ id: '', etiqueta: 'Todos' }, ...tiposEstudio.map((t) => ({ id: t, etiqueta: t }))]}
          onSelect={(id) => setParams({ estudio: id || null, page: null })}
        />

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

      {/* tabla / vacío — el estado vacío global usa el TOTAL del usuario (conteos.todos), no la
          página: si hay reportes pero el filtro no devuelve nada, se muestra la tabla con su aviso. */}
      {conteos.todos === 0 ? (
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
            onClick={abrirNuevo}
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
                {items.map((r) => (
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
                          aria-haspopup="menu"
                          aria-expanded={menu?.id === r.id}
                          disabled={pdfBusy === r.id}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenu(
                              menu?.id === r.id
                                ? null
                                : { id: r.id, top: rect.bottom + 4, right: window.innerWidth - rect.right },
                            );
                          }}
                          className={`grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60 ${focusRing}`}
                        >
                          {pdfBusy === r.id ? (
                            <Loader2 aria-hidden className="h-[17px] w-[17px] animate-spin" strokeWidth={2} />
                          ) : (
                            <MoreHorizontal aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
                          )}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
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

      {/* paginador server-side: SOLO si el conjunto filtrado no cabe en una página. Tamaño de
          página (25/50/100) y nº de página viven en la URL; cambiar tamaño vuelve a page 1. */}
      {conteos.todos > 0 && mostrarPaginador && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-[12.5px] text-muted-foreground`}>Por página</span>
            <Selector
              rotulo=""
              valor={String(size)}
              opciones={TAMANOS_PAGINA.map((n) => ({ id: String(n), etiqueta: String(n) }))}
              onSelect={(id) => setParams({ size: id, page: null })}
            />
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`${mono} text-[12px] text-muted-foreground`}>
              Página {page} de {totalPaginas} · {total} {total === 1 ? 'reporte' : 'reportes'}
            </span>
            <button
              type="button"
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() => setParams({ page: page - 1 <= 1 ? null : String(page - 1) })}
              className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}
            >
              <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={page >= totalPaginas}
              onClick={() => setParams({ page: String(page + 1) })}
              className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}
            >
              <ChevronRight aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      {/* menú de 3 puntos de la fila (posición fija; no se recorta con el overflow de la tabla) */}
      {menu && menuItem && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setMenu(null)} />
          <div
            role="menu"
            style={{ position: 'fixed', top: menu.top, right: menu.right }}
            className="z-50 w-56 rounded-[12px] border border-border bg-card p-1.5 shadow-[0_8px_24px_rgba(17,24,39,.12)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => descargarPdfFila(menuItem)}
              className={`flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <Download aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Descargar PDF
            </button>
            {menuItem.estado !== 'borrador' && (
              <button
                type="button"
                role="menuitem"
                onClick={() => abrirMail(menuItem)}
                className={`flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Mail aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                Enviar por mail
              </button>
            )}
            {/* Eliminar: SOLO borradores (los finalizados/enviados son registro clínico). */}
            {menuItem.estado === 'borrador' && (
              <button
                type="button"
                role="menuitem"
                onClick={() => abrirBorrar(menuItem)}
                className={`mt-0.5 flex w-full items-center gap-2.5 border-t border-border px-3 py-2.5 pt-3 text-left text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted ${focusRing}`}
              >
                <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                Eliminar borrador
              </button>
            )}
          </div>
        </>
      )}

      {/* diálogo: enviar por mail (solo finalizados) — genera el PDF; envío real = stub (§8/§9) */}
      {mailItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,45,82,0.32)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Enviar por correo"
          onClick={() => !mailBusy && setMailItem(null)}
        >
          <div className={`${card} w-full max-w-[460px] p-6`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <Mail className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold tracking-[-0.01em]">Enviar por correo</h2>
                <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
                  Se genera el PDF de <strong>{mailItem.folio}</strong> y se adjunta. El envío real por
                  correo está pendiente de conectar (dominio de correo · §8/§9).
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="block">
                <span className="text-[11.5px] font-semibold text-foreground">Correo del destinatario</span>
                <input
                  type="email"
                  value={mailTo}
                  onChange={(e) => setMailTo(e.target.value)}
                  placeholder="paciente@correo.com"
                  className={`mt-1.5 h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary ${focusRing}`}
                />
              </label>
              <label className="block">
                <span className="text-[11.5px] font-semibold text-foreground">Asunto</span>
                <input
                  type="text"
                  value={mailAsunto}
                  onChange={(e) => setMailAsunto(e.target.value)}
                  placeholder="Asunto del correo"
                  className={`mt-1.5 h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary ${focusRing}`}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMailItem(null)}
                disabled={mailBusy}
                className={`inline-flex h-11 items-center rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60 ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviarMail}
                disabled={mailBusy || !mailTo.trim()}
                className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
              >
                <Mail aria-hidden className="h-4 w-4" strokeWidth={1.9} />
                {mailBusy ? 'Generando y enviando…' : 'Generar y enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* diálogo: eliminar borrador (destructivo · confirmación previa) */}
      {borrarItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,45,82,0.32)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Eliminar borrador"
          onClick={() => !borrando && setBorrarItem(null)}
        >
          <div className={`${card} w-full max-w-[440px] p-6`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-[color:var(--foreground-soft)]">
                <Trash2 className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold tracking-[-0.01em]">Eliminar borrador</h2>
                <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
                  Se eliminará el borrador <strong>{borrarItem.folio}</strong> de {borrarItem.paciente}. Esta
                  acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBorrarItem(null)}
                disabled={borrando}
                className={`inline-flex h-11 items-center rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60 ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarBorrar}
                disabled={borrando}
                className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-sidebar px-4 text-[13.5px] font-bold text-sidebar-foreground transition-opacity hover:opacity-90 disabled:opacity-60 ${focusRing}`}
              >
                {borrando ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.9} />
                )}
                {borrando ? 'Eliminando…' : 'Eliminar borrador'}
              </button>
            </div>
          </div>
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
            className={`${card} flex max-h-[70vh] w-full max-w-[760px] flex-col p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* cabecera fija */}
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

            {/* buscador fijo */}
            <label className="mt-4 flex h-11 shrink-0 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5 transition-colors focus-within:border-secondary">
              <Search aria-hidden className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <span className="sr-only">Buscar plantilla</span>
              <input
                type="search"
                autoFocus
                value={buscaPlantilla}
                onChange={(e) => setBuscaPlantilla(e.target.value)}
                placeholder="Buscar plantilla… (ej. renal, carótida, obstétrico)"
                className="w-full min-w-0 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>

            <p className="mt-3 shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {buscaPlantilla.trim()
                ? `${plantillasFiltradas.length} de ${plantillas.length} plantillas`
                : `${plantillas.length} plantillas publicadas`}
            </p>

            {/* grid con SCROLL INTERNO (el modal no se desborda) */}
            {plantillas.length === 0 ? (
              <p className="mt-2 rounded-xl border border-border bg-muted px-4 py-6 text-center text-[13px] text-muted-foreground">
                No hay plantillas publicadas todavía. El diseñador las publica desde el Studio.
              </p>
            ) : plantillasFiltradas.length === 0 ? (
              <p className="mt-2 rounded-xl border border-border bg-muted px-4 py-8 text-center text-[13px] text-muted-foreground">
                Ninguna plantilla coincide con “{buscaPlantilla.trim()}”.
              </p>
            ) : (
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {plantillasFiltradas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={creando}
                      onClick={() => crear(p.id)}
                      className={`rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-secondary hover:bg-accent disabled:opacity-60 ${focusRing}`}
                    >
                      <span className="block text-[14px] font-bold leading-snug">{p.nombre}</span>
                      <span className={`${mono} mt-1 block text-[11.5px] text-muted-foreground`}>
                        {p.tipoEstudio ? `${p.tipoEstudio} · ` : ''}
                        {p.secciones} secciones · {p.campos} campos
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* pie fijo */}
            {error && (
              <p className="mt-3 shrink-0 rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2 text-[12.5px] text-[color:var(--warning-foreground)]">
                {error}
              </p>
            )}
            {creando && (
              <p className="mt-3 shrink-0 text-[12.5px] text-muted-foreground">Creando el reporte…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
