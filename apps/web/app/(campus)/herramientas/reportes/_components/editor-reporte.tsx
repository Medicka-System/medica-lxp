'use client';

/**
 * Editor de reporte clínico (§6.5) — FASE 1 cableada.
 *
 * La forma sale de la plantilla real (`plantillas_reporte.estructura`): card de "Datos
 * del estudio" (encabezado, campos del paciente) + cards de hallazgos por sección, cada
 * campo renderizado por su tipo con `<CampoReporte>` (la MISMA pieza del constructor →
 * se ve igual). El campo `imagen/dicom` monta el visor Cornerstone3D real insertando un
 * estudio de la bitácora del médico. Los valores se persisten en `contenido.valores`.
 *
 * DOMINIO (stubs · `apps/api`): generar PDF, enviar por correo, "guardar como caso".
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Download,
  FileWarning,
  Mail,
  MoreHorizontal,
  NotebookText,
  Printer,
  Save,
  Search,
  X,
} from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { CampoReporte, claseSpan } from '@/components/reportes/campo-reporte';
import {
  campoCompleto,
  CAMPOS_PACIENTE_CATALOGO,
  esCampoEstatico,
  type CampoPlantilla,
  type SeccionPlantilla,
} from '@/lib/reportes/estructura';
import {
  enviarReporte,
  finalizarReporte,
  generarPdf,
  guardarBorrador,
  guardarComoCaso,
} from '../_acciones';
import {
  ETIQUETA_ESTADO,
  type CasoDicomOpcion,
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

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

/** Campos del paciente por defecto si la plantilla no trae card de encabezado. */
function encabezadoPorDefecto(): CampoPlantilla[] {
  return CAMPOS_PACIENTE_CATALOGO.map((p) => ({
    id: p.id,
    tipo: 'texto' as const,
    nombre: p.nombre,
    ...(p.span ? { span: p.span } : {}),
  }));
}

export function EditorReporte({
  reporte,
  casosDicom,
}: {
  reporte: ReporteDetalle;
  casosDicom: CasoDicomOpcion[];
}) {
  const router = useRouter();
  const estructura = reporte.plantilla?.estructura ?? { secciones: [] };

  const encabezado = estructura.secciones.find((s) => s.tipo === 'encabezado');
  const camposPaciente = encabezado?.campos.length ? encabezado.campos : encabezadoPorDefecto();
  const columnasEnc = encabezado?.columnas ?? 3;
  const secciones = estructura.secciones.filter((s) => s.tipo === 'hallazgos');

  const [paciente, setPaciente] = useState<DatosPaciente>(reporte.datosPaciente);
  const [valores, setValores] = useState<Record<string, unknown>>(reporte.contenido.valores ?? {});
  const [impresion, setImpresion] = useState(reporte.contenido.impresion);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pickerCampo, setPickerCampo] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const estado = reporte.estado;

  function setValor(campoId: string, v: unknown) {
    setValores((prev) => ({ ...prev, [campoId]: v }));
  }
  function setPacienteCampo(id: string, v: unknown) {
    setPaciente((p) => ({ ...p, [id]: typeof v === 'string' ? v : '' }));
  }

  const camposLlenables = useMemo(
    () => secciones.flatMap((s) => s.campos).filter((c) => !esCampoEstatico(c.tipo)),
    [secciones],
  );
  const imagenes = useMemo(
    () => camposLlenables.filter((c) => c.tipo === 'imagen' && c.origen === 'dicom' && campoCompleto(c, valores[c.id])).length,
    [camposLlenables, valores],
  );

  const checklist = useMemo(() => {
    const base = [
      { item: 'Datos del paciente', listo: paciente.paciente.trim() !== '' && paciente.edadSexo.trim() !== '' },
    ];
    const porCampo = camposLlenables.map((c) => ({
      item: c.nombre || 'Campo sin nombre',
      listo: campoCompleto(c, valores[c.id]),
    }));
    return [...base, ...porCampo, { item: 'Impresión diagnóstica', listo: impresion.trim() !== '' }];
  }, [paciente, camposLlenables, valores, impresion]);
  const hechos = checklist.filter((c) => c.listo).length;

  function armarContenido(): ContenidoReporte {
    return {
      folio: reporte.contenido.folio,
      plantillaId: reporte.plantilla?.id ?? reporte.contenido.plantillaId,
      valores,
      impresion,
    };
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

  function elegirEstudio(casoId: string) {
    if (pickerCampo) setValor(pickerCampo, { casoId, tabla: 'bitacora_casos' });
    setPickerCampo(null);
  }

  const tituloReporte = reporte.plantilla?.nombre ?? 'Reporte clínico';

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* barra */}
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
            <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">{tituloReporte}</h1>
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

      {!reporte.plantilla && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3">
          <FileWarning aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning-foreground)]" strokeWidth={1.75} />
          <p className="text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
            La plantilla de este reporte ya no está publicada. Puedes editar los datos del paciente y la
            impresión, pero la estructura de hallazgos no está disponible.
          </p>
        </div>
      )}

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ══════ documento ══════ */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* card de encabezado: datos del estudio */}
          <section className={`${card} p-5`}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>{encabezado?.titulo ?? 'Datos del estudio'}</p>
              <span className="ml-auto text-[12px] text-muted-foreground">
                Documento clínico · sí lleva datos del paciente
              </span>
            </div>
            <div className={`mt-4 grid gap-3.5 ${GRID_COLS[columnasEnc] ?? GRID_COLS[3]}`}>
              {camposPaciente.map((c) => (
                <div key={c.id} className={claseSpan(c, columnasEnc)}>
                  <CampoReporte
                    campo={c}
                    valor={(paciente as Record<string, unknown>)[c.id] ?? ''}
                    modo="llenar"
                    onCambio={(v) => setPacienteCampo(c.id, v)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* cards de hallazgos por sección */}
          {secciones.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>Hallazgos por sección</p>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {reporte.plantilla?.nombre?.toLowerCase()} · {secciones.length} secciones
              </span>
            </div>
          )}

          {secciones.map((s) => (
            <SeccionCard key={s.id} seccion={s} valores={valores} onValor={setValor} onPicker={setPickerCampo} />
          ))}

          {/* impresión diagnóstica (fija) */}
          <section className={`${card} p-5`}>
            <p className={`${kicker} text-secondary`}>Impresión diagnóstica</p>
            <textarea
              rows={3}
              value={impresion}
              onChange={(e) => setImpresion(e.target.value)}
              placeholder="Cierre con su conclusión: qué encontró, del lado que corresponda, y qué sugiere."
              className="mt-3 w-full resize-y rounded-[10px] border border-border bg-card p-3.5 text-[15px] font-medium leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
            />
          </section>
        </div>

        {/* ══════ estación: checklist + puente académico ══════ */}
        <aside className="flex min-w-0 flex-col gap-5">
          <section className={`${card} p-5`}>
            <div className="flex items-baseline gap-2.5">
              <p className={`${kicker} text-muted-foreground`}>Antes de finalizar</p>
              <span className={`${mono} ml-auto text-[12px] font-bold text-[color:var(--warning-foreground)]`}>
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
                style={{ width: `${(hechos / Math.max(1, checklist.length)) * 100}%`, background: 'var(--warning)' }}
              />
            </div>
            <ul className="mt-4 flex max-h-[280px] flex-col gap-2.5 overflow-y-auto">
              {checklist.map((c, i) => (
                <li key={`${c.item}-${i}`} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                      c.listo ? 'bg-primary text-[color:var(--sidebar)]' : 'border-2 border-[color:var(--warning)] bg-card'
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
              {imagenes} {imagenes === 1 ? 'imagen DICOM insertada' : 'imágenes DICOM insertadas'}. La plantilla
              evita omisiones: mientras falte algo, conviene dejar el reporte en borrador.
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

      {/* diálogo: elegir estudio DICOM de la bitácora */}
      {pickerCampo && (
        <PickerEstudio casos={casosDicom} onElegir={elegirEstudio} onCerrar={() => setPickerCampo(null)} />
      )}
    </div>
  );
}

/* ── card de una sección de hallazgos: grid de campos vía CampoReporte ── */
function SeccionCard({
  seccion,
  valores,
  onValor,
  onPicker,
}: {
  seccion: SeccionPlantilla;
  valores: Record<string, unknown>;
  onValor: (campoId: string, v: unknown) => void;
  onPicker: (campoId: string) => void;
}) {
  return (
    <section className={`${card} p-5`}>
      <p className="text-[14.5px] font-bold leading-snug">{seccion.titulo}</p>
      <div className={`mt-3.5 grid gap-3.5 ${GRID_COLS[seccion.columnas] ?? GRID_COLS[1]}`}>
        {seccion.campos.map((c) => (
          <div key={c.id} className={claseSpan(c, seccion.columnas)}>
            <CampoReporte
              campo={c}
              valor={valores[c.id]}
              modo="llenar"
              onCambio={(v) => onValor(c.id, v)}
              onElegirEstudio={() => onPicker(c.id)}
              onQuitarEstudio={() => onValor(c.id, null)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── selector de estudio de la bitácora ── */
function PickerEstudio({
  casos,
  onElegir,
  onCerrar,
}: {
  casos: CasoDicomOpcion[];
  onElegir: (casoId: string) => void;
  onCerrar: () => void;
}) {
  const [busca, setBusca] = useState('');
  const visibles = busca.trim()
    ? casos.filter((c) => c.titulo.toLowerCase().includes(busca.trim().toLowerCase()))
    : casos;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,45,82,0.32)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Elegir estudio DICOM"
      onClick={onCerrar}
    >
      <div className={`${card} w-full max-w-[520px] p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold tracking-[-0.01em]">Insertar imagen del estudio</h2>
            <p className={`mt-1 text-[12.5px] ${softText}`}>
              Elige un estudio de tu bitácora. Se muestra anonimizado en el visor del reporte.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onCerrar}
            className={`ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
          >
            <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>

        <label className="mt-4 flex h-10 items-center gap-2 rounded-[9px] border border-border bg-card px-3 focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar estudio por órgano o hallazgo…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-3 max-h-[320px] overflow-y-auto">
          {visibles.length === 0 ? (
            <p className="px-2 py-8 text-center text-[13px] text-muted-foreground">
              {casos.length === 0
                ? 'No tienes estudios con imágenes en tu bitácora todavía.'
                : 'Ningún estudio coincide con la búsqueda.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibles.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onElegir(c.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-secondary hover:bg-accent ${focusRing}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold">{c.titulo}</span>
                      <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
                        {c.series} {c.series === 1 ? 'serie' : 'series'} · {c.fecha}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
