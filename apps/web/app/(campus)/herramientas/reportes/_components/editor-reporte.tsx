'use client';

/**
 * Editor de reporte clínico (§6.5) — documento a la izquierda, estación (visor DICOM +
 * checklist + puente académico) a la derecha. App real: el cuerpo se persiste en
 * `lxp.reportes.contenido`/`.datos_paciente` (jsonb) bajo RLS vía server actions.
 *
 * PLACEHOLDERS (contenido clínico definido aparte con el equipo, §6.5 — NO inventado):
 *   · Guía de cada sección · Recomendaciones sugeridas · Membrete y firma.
 * El visor usa el hueco de DICOM (pipeline real de ingesta/anonimización = Sprint 4.7).
 * Generar PDF, enviar por correo y "Guardar como caso" son dominio (`apps/api`) — stubs.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Download,
  Images,
  Mail,
  MoreHorizontal,
  NotebookText,
  Printer,
  Save,
} from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { VisorDicomPlaceholder } from '../../../_components/visor-dicom';
import {
  enviarReporte,
  finalizarReporte,
  generarPdf,
  guardarBorrador,
  guardarComoCaso,
} from '../_acciones';
import {
  ETIQUETA_ESTADO,
  type ContenidoReporte,
  type DatosPaciente,
  type EstadoReporte,
  type ReporteDetalle,
} from '../_contrato';

const claseEstado: Record<EstadoReporte, string> = {
  borrador: 'border border-border bg-muted text-[color:var(--foreground-soft)]',
  finalizado: 'bg-accent text-accent-foreground',
  enviado:
    'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
};

const campoCls =
  'mt-1.5 h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary';

const CAMPOS_PACIENTE: { key: keyof DatosPaciente; etiqueta: string; mono?: boolean }[] = [
  { key: 'paciente', etiqueta: 'Paciente' },
  { key: 'edadSexo', etiqueta: 'Edad y sexo' },
  { key: 'expediente', etiqueta: 'Expediente', mono: true },
  { key: 'fechaEstudio', etiqueta: 'Fecha del estudio' },
  { key: 'solicitante', etiqueta: 'Médico solicitante' },
  { key: 'equipo', etiqueta: 'Equipo' },
];

/** Zona reservada: la estructura existe, el contenido clínico se define aparte (§6.5). */
function Zona({ titulo, nota, minAlto }: { titulo: string; nota: string; minAlto: number }) {
  return (
    <div
      className="rounded-[11px] border-[1.5px] border-dashed p-4"
      style={{
        minHeight: minAlto,
        borderColor: 'color-mix(in oklab, var(--secondary) 35%, white)',
        backgroundImage:
          'repeating-linear-gradient(135deg, color-mix(in oklab, var(--secondary) 7%, transparent) 0 6px, transparent 6px 13px)',
      }}
    >
      <p className={`${kicker} text-secondary`}>{titulo}</p>
      <p className={`mt-1.5 text-[12.5px] leading-relaxed ${softText}`}>{nota}</p>
    </div>
  );
}

export function EditorReporte({ reporte }: { reporte: ReporteDetalle }) {
  const router = useRouter();
  const [paciente, setPaciente] = useState<DatosPaciente>(reporte.datosPaciente);
  const [secciones, setSecciones] = useState(reporte.contenido.secciones);
  const [impresion, setImpresion] = useState(reporte.contenido.impresion);
  const [piezas, setPiezas] = useState(reporte.contenido.piezas);
  const [piezaSel, setPiezaSel] = useState(0);
  const [seccionSel, setSeccionSel] = useState(0);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const estado = reporte.estado;
  const insertadas = piezas.filter((p) => p.insertada).length;

  const checklist = useMemo(() => {
    const base = [
      { item: 'Datos del paciente', listo: paciente.paciente.trim() !== '' && paciente.edadSexo.trim() !== '' },
      { item: 'Al menos una imagen', listo: insertadas > 0 },
    ];
    const porSeccion = secciones.map((s) => ({ item: s.titulo, listo: s.texto.trim() !== '' }));
    return [...base, ...porSeccion, { item: 'Impresión diagnóstica', listo: impresion.trim() !== '' }];
  }, [paciente, insertadas, secciones, impresion]);
  const hechos = checklist.filter((c) => c.listo).length;

  function armarContenido(): ContenidoReporte {
    return {
      folio: reporte.contenido.folio,
      tipo: reporte.contenido.tipo,
      secciones,
      impresion,
      piezas,
    };
  }

  function insertarEnSeccion() {
    const objetivo = piezas.findIndex((_, i) => i === piezaSel);
    if (objetivo < 0) return;
    setPiezas((prev) => prev.map((p, i) => (i === piezaSel ? { ...p, insertada: true } : p)));
    setSecciones((prev) =>
      prev.map((s, i) => (i === seccionSel ? { ...s, imagenesInsertadas: s.imagenesInsertadas + 1 } : s)),
    );
    setMensaje({ tipo: 'ok', texto: `Imagen añadida a "${secciones[seccionSel]?.titulo ?? ''}".` });
  }

  function conAccion(fn: () => Promise<{ ok: boolean; error?: string }>, exito: string) {
    setMensaje(null);
    iniciar(async () => {
      const res = await fn();
      if (res.ok) {
        setMensaje({ tipo: 'ok', texto: exito });
        router.refresh();
      } else {
        setMensaje({ tipo: 'error', texto: res.error ?? 'No se pudo completar la acción.' });
      }
    });
  }

  const onGuardar = () =>
    conAccion(() => guardarBorrador(reporte.id, paciente, armarContenido()), 'Borrador guardado.');
  const onFinalizar = () =>
    conAccion(async () => {
      const g = await guardarBorrador(reporte.id, paciente, armarContenido());
      if (!g.ok) return g;
      return finalizarReporte(reporte.id);
    }, 'Reporte finalizado.');
  const onEnviar = () =>
    conAccion(async () => {
      const g = await guardarBorrador(reporte.id, paciente, armarContenido());
      if (!g.ok) return g;
      return enviarReporte(reporte.id);
    }, 'Reporte marcado como enviado al paciente.');
  const onPdf = () => conAccion(() => generarPdf(reporte.id), 'PDF generado.');
  const onCaso = () => conAccion(() => guardarComoCaso(reporte.id), 'Caso anonimizado guardado en su bitácora.');
  const onImprimir = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* barra del reporte */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/herramientas/reportes')}
          aria-label="Volver a mis reportes"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">
              Ultrasonido {reporte.contenido.tipo.toLowerCase()}
            </h1>
            <span
              className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseEstado[estado]}`}
            >
              {ETIQUETA_ESTADO[estado]}
            </span>
          </div>
          <p className={`${mono} mt-1 text-[12.5px] text-muted-foreground`}>
            {reporte.contenido.folio} · guardado {reporte.guardado}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGuardar}
            disabled={pendiente}
            className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={onImprimir}
            aria-label="Imprimir"
            className={`grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Printer aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onPdf}
            disabled={pendiente}
            className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
          >
            <Download aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            PDF
          </button>
          {estado === 'borrador' ? (
            <button
              type="button"
              onClick={onFinalizar}
              disabled={pendiente}
              className={`inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
            >
              Finalizar
            </button>
          ) : (
            <button
              type="button"
              onClick={onEnviar}
              disabled={pendiente || estado === 'enviado'}
              className={`inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
            >
              <Mail aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
              {estado === 'enviado' ? 'Enviado' : 'Enviar al paciente'}
            </button>
          )}
          <button
            type="button"
            aria-label="Más acciones"
            className={`grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <MoreHorizontal aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>
      </div>

      {mensaje && (
        <p
          className={`mt-4 rounded-[10px] px-3.5 py-2.5 text-[13px] font-medium ${
            mensaje.tipo === 'ok'
              ? 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
              : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ══════ documento ══════ */}
        <div className="flex min-w-0 flex-col gap-5">
          <section className={`${card} p-5`}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>Datos del estudio</p>
              <span className="ml-auto text-[12px] text-muted-foreground">
                Documento clínico · sí lleva datos del paciente
              </span>
            </div>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS_PACIENTE.map((c) => (
                <label key={c.key} className="block">
                  <span className="block text-[11.5px] font-semibold">{c.etiqueta}</span>
                  <input
                    type="text"
                    value={paciente[c.key]}
                    onChange={(e) => setPaciente((p) => ({ ...p, [c.key]: e.target.value }))}
                    className={`${campoCls} ${c.mono ? 'font-mono text-[13.5px]' : ''}`}
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="text-[12.5px] text-muted-foreground">Motivo del estudio</span>
              <input
                type="text"
                value={paciente.motivo}
                onChange={(e) => setPaciente((p) => ({ ...p, motivo: e.target.value }))}
                placeholder="Motivo o indicación clínica del estudio"
                className={`${campoCls} mt-0 min-w-[220px] flex-1`}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <p className={`${kicker} text-muted-foreground`}>Hallazgos por sección</p>
            <span className={`${mono} text-[11.5px] text-muted-foreground`}>
              plantilla: {reporte.contenido.tipo.toLowerCase()} · {secciones.length} secciones
            </span>
          </div>

          <div className="flex flex-col gap-3.5">
            {secciones.map((s, i) => {
              const listo = s.texto.trim() !== '';
              return (
                <section
                  key={s.id}
                  onFocusCapture={() => setSeccionSel(i)}
                  className={`overflow-hidden rounded-xl border ${
                    i === seccionSel ? 'border-secondary' : 'border-border'
                  } bg-card`}
                >
                  <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
                    <span
                      aria-hidden
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                        listo
                          ? 'bg-primary text-[color:var(--sidebar)]'
                          : 'border-2 border-[color:var(--track)] bg-card'
                      }`}
                    >
                      {listo && (
                        <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4 10-10" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-bold leading-snug">{s.titulo}</span>
                      <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                        sección {i + 1} de la plantilla · {s.imagenesInsertadas}{' '}
                        {s.imagenesInsertadas === 1 ? 'imagen' : 'imágenes'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSeccionSel(i);
                        insertarEnSeccion();
                      }}
                      className={`inline-flex h-10 items-center gap-[7px] rounded-full border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                    >
                      <Images aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      Insertar imagen
                    </button>
                  </div>
                  <div className="p-5">
                    <textarea
                      rows={3}
                      value={s.texto}
                      onFocus={() => setSeccionSel(i)}
                      onChange={(e) =>
                        setSecciones((prev) =>
                          prev.map((x, xi) => (xi === i ? { ...x, texto: e.target.value } : x)),
                        )
                      }
                      placeholder="Redacte los hallazgos de esta sección."
                      className="w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
                    />
                    <div className="mt-3">
                      <Zona
                        titulo="Guía de la plantilla"
                        nota="Aquí van los campos y sugerencias de esta sección (medidas esperadas, estructura y recordatorios para no omitir nada). El contenido clínico se define aparte."
                        minAlto={78}
                      />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-secondary`}>Impresión diagnóstica</p>
            <textarea
              rows={3}
              value={impresion}
              onChange={(e) => setImpresion(e.target.value)}
              placeholder="Cierre con su conclusión: qué encontró, del lado que corresponda, y qué sugiere."
              className="mt-3 w-full resize-y rounded-[10px] border border-border bg-card p-3.5 text-[15px] font-medium leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
            />
            <div className="mt-3.5">
              <Zona
                titulo="Recomendaciones sugeridas"
                nota="Zona reservada para las recomendaciones y el seguimiento que proponga la plantilla."
                minAlto={66}
              />
            </div>
          </section>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>Membrete y firma</p>
            <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
              <Zona
                titulo="Membrete del consultorio"
                nota="Logotipo, dirección y teléfono. Se configura una vez y aparece en todos sus reportes."
                minAlto={96}
              />
              <Zona
                titulo="Firma del médico"
                nota="Nombre, cédula profesional y firma digitalizada."
                minAlto={96}
              />
            </div>
          </section>
        </div>

        {/* ══════ estación: visor, checklist y puente académico ══════ */}
        <aside className="flex min-w-0 flex-col gap-5">
          <section className={`${card} overflow-hidden`}>
            <VisorDicomPlaceholder
              etiqueta={`visor DICOM · ${piezas[piezaSel]?.etiqueta ?? '—'}`}
              alto={280}
              loop
              piezas={piezas.length}
            />
            <div className="border-t border-border p-3.5">
              <div className="flex gap-2 overflow-x-auto">
                {piezas.map((p, i) => (
                  <button
                    key={`${p.etiqueta}-${i}`}
                    type="button"
                    onClick={() => setPiezaSel(i)}
                    aria-current={i === piezaSel}
                    className={`relative grid h-14 w-[78px] shrink-0 place-items-center overflow-hidden rounded-[9px] border-2 ${focusRing} ${
                      i === piezaSel ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ background: 'var(--wave-0)' }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)',
                      }}
                    />
                    <span
                      className={`relative ${mono} text-center text-[7px] uppercase tracking-[0.08em]`}
                      style={{ color: 'var(--hero-ink-muted)' }}
                    >
                      {p.etiqueta}
                    </span>
                    {p.insertada && (
                      <span
                        aria-label="Ya está en el reporte"
                        className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]"
                      >
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4 10-10" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] leading-snug text-muted-foreground">
                Hueco del visor DICOM (Cornerstone3D · Sprint 4.7). La ingesta y anonimización del
                estudio son parte del pipeline de dominio.
              </p>
              <div className="mt-3 flex items-center gap-2.5">
                <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-border bg-card px-3">
                  <span className="shrink-0 text-[11.5px] text-muted-foreground">Sección</span>
                  <select
                    value={seccionSel}
                    onChange={(e) => setSeccionSel(Number(e.target.value))}
                    className="w-full appearance-none bg-transparent text-[12.5px] font-semibold text-foreground outline-none"
                  >
                    {secciones.map((s, i) => (
                      <option key={s.id} value={i}>
                        {s.titulo}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={insertarEnSeccion}
                  className={`h-11 shrink-0 rounded-[10px] bg-accent px-3.5 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                >
                  Insertar
                </button>
              </div>
              <p className="mt-2.5 text-[12px] leading-snug text-muted-foreground">
                {insertadas} de {piezas.length} imágenes ya están en el reporte.
              </p>
            </div>
          </section>

          <section className={`${card} p-5`}>
            <div className="flex items-baseline gap-2.5">
              <p className={`${kicker} text-muted-foreground`}>Antes de finalizar</p>
              <span
                className={`${mono} ml-auto text-[12px] font-bold text-[color:var(--warning-foreground)]`}
              >
                {hechos} de {checklist.length}
              </span>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]"
              role="progressbar"
              aria-valuenow={hechos}
              aria-valuemin={0}
              aria-valuemax={checklist.length}
              aria-label="Avance del reporte"
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${(hechos / checklist.length) * 100}%`, background: 'var(--warning)' }}
              />
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {checklist.map((c) => (
                <li key={c.item} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                      c.listo
                        ? 'bg-primary text-[color:var(--sidebar)]'
                        : 'border-2 border-[color:var(--warning)] bg-card'
                    }`}
                  >
                    {c.listo && (
                      <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4 10-10" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-[13px] ${c.listo ? 'font-medium text-muted-foreground' : 'font-bold'}`}>
                    {c.item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
              La estructura de la plantilla evita omisiones: mientras falte algo, conviene dejar el
              reporte en borrador.
            </p>
          </section>

          <section className="rounded-xl bg-accent p-5">
            <p className={`${kicker} text-accent-foreground`}>Puente académico</p>
            <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
              Guarde este estudio como caso anonimizado y súmelo a su bitácora. Se quita nombre,
              expediente y fechas del paciente.
            </p>
            <button
              type="button"
              onClick={onCaso}
              disabled={pendiente}
              className={`mt-3.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border bg-card text-[13.5px] font-bold text-secondary transition-colors hover:bg-[color:var(--track)] disabled:opacity-60 ${focusRing}`}
              style={{ borderColor: 'color-mix(in oklab, var(--secondary) 35%, white)' }}
            >
              <NotebookText aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Guardar como caso
            </button>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              La anonimización corre en el dominio (pendiente de conectar con la API).
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
