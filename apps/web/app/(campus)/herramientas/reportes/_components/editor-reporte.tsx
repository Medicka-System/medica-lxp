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

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Download,
  FileWarning,
  Mail,
  MoreHorizontal,
  NotebookText,
  Pencil,
  Printer,
  Save,
} from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { CampoReporte, claseSpan } from '@/components/reportes/campo-reporte';
import {
  campoCompleto,
  campoPacienteDesdeCatalogo,
  campoRequerido,
  CAMPOS_PACIENTE_CATALOGO,
  conDefectos,
  contarImagenesReporte,
  esCampoEstatico,
  type CampoPlantilla,
  type SeccionPlantilla,
} from '@/lib/reportes/estructura';
import { esIdFormula, evaluarCampoCalculado, recalcularFormulas } from '@/lib/reportes/formulas';
import {
  enviarReporte,
  finalizarReporte,
  generarPdf,
  guardarBorrador,
  guardarComoCaso,
  reabrirReporte,
  type ImagenDicomReporte,
  type ResultadoPdf,
} from '../_acciones';
import {
  rasterizarDicomDelReporte,
  rasterizarGaleriaDicomDelReporte,
  type ImagenGaleriaRasterizada,
} from '../_rasterizar-dicom';
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

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

/** Campos del paciente por defecto si la plantilla no trae card de encabezado. */
function encabezadoPorDefecto(): CampoPlantilla[] {
  return CAMPOS_PACIENTE_CATALOGO.map(campoPacienteDesdeCatalogo);
}

/** Decodifica el PDF (base64 del server action) a un Blob descargable/imprimible. */
function base64ABlob(b64: string, tipo: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/** Corre `p` con límite de tiempo; si no resuelve en `ms`, devuelve `fallback` (no cuelga). */
function conLimite<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

/**
 * Dispara el diálogo de impresión sobre un PDF (blob same-origin) usando un iframe oculto.
 * Devuelve `true` si logró llamar a `print()`, `false` si el navegador no lo permite (el
 * llamador cae entonces a abrir el PDF en una pestaña). El iframe se limpia tras un rato para
 * no cortar el diálogo de impresión abierto.
 */
function imprimirDesdeUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      let resuelto = false;
      const done = (ok: boolean) => {
        if (!resuelto) {
          resuelto = true;
          resolve(ok);
        }
      };
      iframe.onload = () => {
        try {
          const w = iframe.contentWindow;
          if (!w) return done(false);
          w.focus();
          w.print();
          done(true);
          setTimeout(() => iframe.remove(), 60_000);
        } catch {
          iframe.remove();
          done(false);
        }
      };
      // Si `onload` nunca dispara (algunos navegadores con PDF), cae al fallback.
      setTimeout(() => done(false), 8000);
      iframe.src = url;
      document.body.appendChild(iframe);
    } catch {
      resolve(false);
    }
  });
}

export function EditorReporte({ reporte }: { reporte: ReporteDetalle }) {
  const router = useRouter();
  // Referencia ESTABLE (viene de props): evita que el efecto de recálculo se dispare en cada render.
  const estructura = useMemo(() => reporte.plantilla?.estructura ?? { secciones: [] }, [reporte.plantilla]);

  const encabezado = estructura.secciones.find((s) => s.tipo === 'encabezado');
  const camposPaciente = encabezado?.campos.length ? encabezado.campos : encabezadoPorDefecto();
  const columnasEnc = encabezado?.columnas ?? 3;
  const secciones = estructura.secciones.filter((s) => s.tipo === 'hallazgos');
  // La plantilla puede EXCLUIR la impresión (el diseñador la quitó); ausente = incluida (retrocompat).
  const incluyeImpresion = estructura.incluyeImpresion !== false;

  // Al ABRIR, precarga el boilerplate (`valorDefecto`) en los campos vacíos/ausentes —igual que la
  // vista previa del constructor y el reporte recién creado— para que un default añadido a la
  // plantilla DESPUÉS de crear el reporte igual salga como base editable. Lo escrito no se pisa.
  const iniciales = conDefectos(estructura, reporte.contenido.valores ?? {}, reporte.datosPaciente);
  const [paciente, setPaciente] = useState<DatosPaciente>(iniciales.datosPaciente);
  const [valores, setValores] = useState<Record<string, unknown>>(iniciales.valores);
  const [impresion, setImpresion] = useState(reporte.contenido.impresion);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [casoDialog, setCasoDialog] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mailDialog, setMailDialog] = useState(false);
  const [mailTo, setMailTo] = useState('');
  const [mailAsunto, setMailAsunto] = useState('');
  const [pdfOcupado, setPdfOcupado] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const estado = reporte.estado;
  // Dos modos (§ciclo de vida): BORRADOR editable · FINALIZADO/ENVIADO read-only (bloquea toda
  // edición; solo se puede exportar/imprimir o pulsar "Editar reporte" para reabrir a borrador).
  const soloLectura = estado !== 'borrador';

  // Campos con FÓRMULA activa (numero/medida/calculado con `formula` del catálogo): su valor se
  // auto-calcula al llenar. `idsConFormula` = sus ids para marcar la edición manual del médico.
  const camposConFormula = useMemo(
    () =>
      estructura.secciones.flatMap((s) =>
        s.campos.filter((c) => esIdFormula(c.formula)).map((c) => ({ campo: c, enEncabezado: s.tipo === 'encabezado' })),
      ),
    [estructura],
  );
  const idsConFormula = useMemo(() => new Set(camposConFormula.map((f) => f.campo.id)), [camposConFormula]);

  // Marca de EDICIÓN MANUAL: ids de campos-fórmula que el médico escribió a mano (se respeta su
  // valor). Es un Set MUTADO en sitio (ref estable de useState, sin setter) que el efecto lee por
  // cierre. Semilla al abrir: un valor guardado que NO coincide con el que produce la fórmula desde
  // las fuentes guardadas ⇒ el médico lo había editado → se respeta (no se recomputa al reabrir).
  const [editadosManual] = useState<Set<string>>(() => {
    const fuente: Record<string, unknown> = { ...iniciales.datosPaciente, ...iniciales.valores };
    const set = new Set<string>();
    for (const s of estructura.secciones) {
      for (const c of s.campos) {
        if (!esIdFormula(c.formula)) continue;
        const store = s.tipo === 'encabezado' ? iniciales.datosPaciente[c.id] : iniciales.valores[c.id];
        const txt = typeof store === 'string' ? store.trim() : store;
        if (txt === undefined || txt === null || txt === '') continue;
        const calc = evaluarCampoCalculado(c, fuente);
        if (calc !== '' && String(store) !== calc) set.add(c.id);
      }
    }
    return set;
  });
  // Última fuente vista, para detectar QUÉ entrada cambió entre renders (null = primer render).
  const fuenteAnteriorRef = useRef<Record<string, unknown> | null>(null);

  function setValor(campoId: string, v: unknown) {
    // El médico escribió en un campo-fórmula ⇒ su valor manda hasta que cambie una entrada (regla A).
    if (idsConFormula.has(campoId)) editadosManual.add(campoId);
    setValores((prev) => ({ ...prev, [campoId]: v }));
  }
  function setPacienteCampo(id: string, v: unknown) {
    if (idsConFormula.has(id)) editadosManual.add(id);
    // Guarda el valor TAL CUAL (no coacciona a ""): el encabezado puede tener campos no-string
    // (sino/multiseleccion) y su boolean/array debe persistir igual que en hallazgos.
    setPaciente((p) => ({ ...p, [id]: v }));
  }

  // RECÁLCULO REACTIVO (regla A+B · §6.5) de los campos con FÓRMULA (numero/medida editable +
  // calculado legacy). Al cambiar CUALQUIER entrada mapeada se recalcula e INYECTA el resultado en el
  // campo (encabezado→paciente, hallazgos→valores). Reglas:
  //   · Si una entrada del campo CAMBIÓ desde el último render, se limpia su marca manual → gana el
  //     cálculo fresco (los insumos mandan).
  //   · Si el médico editó el valor a mano (marca manual) y ninguna entrada cambió, se RESPETA.
  //   · Sin insumos suficientes (cálculo vacío) no se pisa nada.
  // Solo en EDICIÓN: en un reporte finalizado (vista) NO se recomputa — se lee el valor persistido
  // (criterio §3). El guardia por diferencia evita el bucle de render.
  useEffect(() => {
    if (soloLectura) return;
    const fuente: Record<string, unknown> = { ...paciente, ...valores };
    // Núcleo puro (regla A+B): limpia marcas manuales de fuentes cambiadas y devuelve id→valor a inyectar.
    const upd = recalcularFormulas(
      camposConFormula.map((f) => ({ id: f.campo.id, campo: f.campo })),
      fuente,
      fuenteAnteriorRef.current,
      editadosManual,
    );
    fuenteAnteriorRef.current = fuente;
    // Enruta al store (encabezado→paciente, hallazgos→valores) y aplica solo los que cambian de verdad.
    let cambV: Record<string, unknown> | null = null;
    let cambP: Record<string, string> | null = null;
    for (const { campo, enEncabezado } of camposConFormula) {
      const nuevo = upd[campo.id];
      if (nuevo === undefined) continue;
      if (enEncabezado) {
        if (String(paciente[campo.id] ?? '') !== nuevo) (cambP ??= {})[campo.id] = nuevo;
      } else if (String(valores[campo.id] ?? '') !== nuevo) {
        (cambV ??= {})[campo.id] = nuevo;
      }
    }
    if (cambV) setValores((p) => ({ ...p, ...cambV }));
    if (cambP) setPaciente((p) => ({ ...p, ...cambP }));
  }, [paciente, valores, soloLectura, camposConFormula, editadosManual]);

  const camposLlenables = useMemo(
    () => secciones.flatMap((s) => s.campos).filter((c) => !esCampoEstatico(c.tipo)),
    [secciones],
  );
  // Imágenes REALES = galería (JPG/PNG/.dcm) + imagen/dicom clínico + imagen/referencia. Fuente
  // de verdad ÚNICA compartida con el listado (`contarImagenesReporte`).
  const imagenes = useMemo(() => contarImagenesReporte(estructura, valores), [estructura, valores]);

  const checklist = useMemo(() => {
    const base = [
      { item: 'Datos del paciente', listo: String(paciente.paciente ?? '').trim() !== '' },
    ];
    // Solo los campos OBLIGATORIOS entran al gate (1b-1). `campoRequerido` = obligatorio ?? true:
    // las plantillas actuales (sin el flag) siguen requiriendo TODO → gate idéntico.
    const porCampo = camposLlenables
      .filter((c) => campoRequerido(c))
      .map((c) => ({
        item: c.nombre || 'Campo sin nombre',
        listo: campoCompleto(c, valores[c.id]),
      }));
    return [
      ...base,
      ...porCampo,
      ...(incluyeImpresion ? [{ item: 'Impresión diagnóstica', listo: impresion.trim() !== '' }] : []),
    ];
  }, [paciente, camposLlenables, valores, impresion, incluyeImpresion]);
  const hechos = checklist.filter((c) => c.listo).length;
  // Fuente de verdad ÚNICA de completitud (la MISMA card): completo = todos los checks en verde.
  const completo = hechos === checklist.length;
  const faltan = checklist.filter((c) => !c.listo).map((c) => c.item);

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
      const f = await finalizarReporte(reporte.id);
      // Al finalizar: pregunta si quiere derivar el caso educativo (no automático). Este es el
      // ÚNICO modal de confirmación tras finalizar (se quitó el modal previo "¿finalizar?").
      if (f.ok && !reporte.casoGeneradoId) setCasoDialog(true);
      return f;
    }, 'Reporte finalizado.');
  // "Editar reporte" (desde finalizado): reabre a borrador y desbloquea la edición. Al terminar,
  // el botón vuelve a "Finalizar" y se re-sella SOBRESCRIBIENDO la misma versión (sin versionado).
  const onEditar = () =>
    conAccion(() => reabrirReporte(reporte.id), 'Reporte reabierto para edición.');
  // Enviar por correo (menú de 3 puntos · BUG 4): captura correo + asunto. El ENVÍO real por
  // mail es dominio PENDIENTE (§8/§9); por ahora se guarda, se marca como enviado y se confirma
  // la captura — nunca se fuerza el correo desde el botón principal.
  function onEnviarMail() {
    const correo = mailTo.trim();
    if (!correo) return;
    setMensaje(null);
    iniciar(async () => {
      const g = await guardarBorrador(reporte.id, paciente, armarContenido());
      if (!g.ok) {
        setMensaje({ tipo: 'error', texto: g.error ?? 'No se pudo guardar el reporte.' });
        return;
      }
      const res = await enviarReporte(reporte.id);
      setMailDialog(false);
      if (res.ok) {
        setMensaje({
          tipo: 'ok',
          texto: `Reporte marcado como enviado a ${correo} (envío por correo pendiente de conectar).`,
        });
        router.refresh();
      } else {
        setMensaje({ tipo: 'error', texto: res.error ?? 'No se pudo completar la acción.' });
      }
    });
  }
  // ── PDF / Imprimir: un solo documento (§6.5). Guarda el estado actual, rasteriza en el
  //    cliente las imágenes DICOM (campos imagen/dicom Y .dcm de galería · visor Cornerstone →
  //    PNG) y pide el PDF al `api`; el mismo blob se descarga o se imprime.
  async function construirPdf(): Promise<ResultadoPdf> {
    await guardarBorrador(reporte.id, paciente, armarContenido());
    let imagenesDicom: ImagenDicomReporte[] = [];
    let imagenesGaleriaDicom: ImagenGaleriaRasterizada[] = [];
    // La rasterización DICOM (visor Cornerstone) NUNCA debe congelar la generación: además del
    // timeout por imagen del motor, un guardia global cae a [] si el lote no termina a tiempo,
    // así el PDF SIEMPRE sale (con el texto/tabla/impresión aunque falten imágenes).
    try {
      imagenesDicom = await conLimite(rasterizarDicomDelReporte(estructura, valores), 60_000, []);
    } catch {
      /* si el visor no pudo rasterizar, el PDF sale con el resto del contenido */
    }
    try {
      imagenesGaleriaDicom = await conLimite(
        rasterizarGaleriaDicomDelReporte(reporte.id, estructura, valores),
        90_000,
        [],
      );
    } catch {
      /* idem para las imágenes .dcm de galería */
    }
    return generarPdf(reporte.id, imagenesDicom, imagenesGaleriaDicom);
  }

  function descargarPdf() {
    setMensaje(null);
    setPdfOcupado(true);
    void (async () => {
      try {
        const res = await construirPdf();
        if (!res.ok) {
          setMensaje({ tipo: 'error', texto: res.error });
          return;
        }
        const url = URL.createObjectURL(base64ABlob(res.pdfBase64, 'application/pdf'));
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setMensaje({ tipo: 'ok', texto: 'PDF descargado.' });
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } finally {
        setPdfOcupado(false);
      }
    })();
  }

  // Imprimir (BUG 4): abre el diálogo de impresión DIRECTO sobre el PDF vía un iframe oculto
  // same-origin (blob). En navegadores Chromium (Chrome/Edge) imprime el formato del PDF sin
  // pasos extra; si el navegador no deja disparar print() sobre el PDF (p. ej. Firefox), cae a
  // abrir el PDF en una pestaña para imprimir desde ahí.
  function imprimirPdf() {
    setMensaje(null);
    setPdfOcupado(true);
    void (async () => {
      try {
        const res = await construirPdf();
        if (!res.ok) {
          setMensaje({ tipo: 'error', texto: res.error });
          return;
        }
        const url = URL.createObjectURL(base64ABlob(res.pdfBase64, 'application/pdf'));
        const impreso = await imprimirDesdeUrl(url);
        if (impreso) {
          setMensaje({ tipo: 'ok', texto: 'Se abrió el diálogo de impresión.' });
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
          setMensaje({ tipo: 'ok', texto: 'PDF abierto en una pestaña nueva para imprimir.' });
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } finally {
        setPdfOcupado(false);
      }
    })();
  }
  const onPdf = descargarPdf;
  function onCaso() {
    setMensaje(null);
    iniciar(async () => {
      const res = await guardarComoCaso(reporte.id);
      setCasoDialog(false);
      if (res.ok) {
        setMensaje({
          tipo: 'ok',
          texto: res.yaExistia
            ? 'Este reporte ya tenía un caso en tu bitácora.'
            : res.conEstudio
              ? 'Caso generado en tu bitácora — se están anonimizando las imágenes (tags + píxeles).'
              : 'Caso generado en tu bitácora.',
        });
        router.refresh();
      } else {
        setMensaje({ tipo: 'error', texto: res.error });
      }
    });
  }
  const onImprimir = imprimirPdf;

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
          {/* "Guardar borrador" solo en edición: en un reporte finalizado no hay qué guardar. */}
          {!soloLectura && (
            <button
              type="button"
              onClick={onGuardar}
              disabled={pendiente}
              className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
            >
              <Save aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Guardar borrador
            </button>
          )}
          <button
            type="button"
            onClick={onImprimir}
            disabled={pdfOcupado}
            aria-label="Imprimir"
            className={`grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
          >
            <Printer aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onPdf}
            disabled={pdfOcupado}
            className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
          >
            <Download aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            {pdfOcupado ? 'Generando…' : 'Exportar PDF'}
          </button>
          {/* Botón principal según el ciclo de vida: BORRADOR → "Finalizar" (sella + modal de
              caso); FINALIZADO → "Editar reporte" (reabre a borrador). Sin modal previo.
              "Finalizar" se BLOQUEA hasta que TODOS los checks de la card estén en verde
              (misma fuente de verdad `completo`); al pasar el mouse indica qué falta. */}
          <button
            type="button"
            onClick={() => {
              setMensaje(null);
              if (soloLectura) onEditar();
              else onFinalizar();
            }}
            disabled={pendiente || (!soloLectura && !completo)}
            title={
              !soloLectura && !completo
                ? `Antes de finalizar, completa: ${faltan.join(', ')}`
                : undefined
            }
            className={`inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
          >
            {soloLectura ? (
              <>
                <Pencil aria-hidden className="h-4 w-4" strokeWidth={2} />
                Editar reporte
              </>
            ) : (
              'Finalizar'
            )}
          </button>
          {/* Menú de 3 puntos: "Enviar por mail" (BUG 4) → modal de captura correo + asunto. */}
          <div className="relative">
            <button
              type="button"
              aria-label="Más acciones"
              aria-haspopup="menu"
              aria-expanded={menuAbierto}
              onClick={() => setMenuAbierto((o) => !o)}
              className={`grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <MoreHorizontal aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
            </button>
            {menuAbierto && (
              <>
                <div className="fixed inset-0 z-20" aria-hidden onClick={() => setMenuAbierto(false)} />
                <div
                  role="menu"
                  className={`absolute right-0 top-12 z-30 w-56 rounded-[12px] border border-border bg-card p-1.5 shadow-[0_8px_24px_rgba(17,24,39,.12)]`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuAbierto(false);
                      setMensaje(null);
                      setMailTo('');
                      setMailAsunto(`Reporte ${reporte.contenido.folio}`);
                      setMailDialog(true);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                  >
                    <Mail aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                    Enviar por mail
                  </button>
                </div>
              </>
            )}
          </div>
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
                    valor={paciente[c.id] ?? ''}
                    modo="llenar"
                    soloLectura={soloLectura}
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
            <SeccionCard
              key={s.id}
              seccion={s}
              valores={valores}
              onValor={setValor}
              reporteId={reporte.id}
              soloLectura={soloLectura}
            />
          ))}

          {/* impresión diagnóstica — solo si la plantilla la incluye (el diseñador la pudo quitar) */}
          {incluyeImpresion && (
            <section className={`${card} p-5`}>
              <p className={`${kicker} text-secondary`}>Impresión diagnóstica</p>
              <textarea
                rows={3}
                value={impresion}
                readOnly={soloLectura}
                onChange={(e) => {
                  if (!soloLectura) setImpresion(e.target.value);
                }}
                placeholder="Cierre con su conclusión: qué encontró, del lado que corresponda, y qué sugiere."
                className={`mt-3 w-full resize-y rounded-[10px] border border-border p-3.5 text-[15px] font-medium leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary ${soloLectura ? 'bg-muted' : 'bg-card'}`}
              />
            </section>
          )}
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
              {imagenes} {imagenes === 1 ? 'imagen insertada' : 'imágenes insertadas'}. La plantilla
              evita omisiones: no podrás finalizar mientras falte algo (queda en borrador).
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

      {/* diálogo: ¿guardar como caso? (al finalizar) */}
      {casoDialog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,45,82,0.32)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Guardar como caso"
          onClick={() => !pendiente && setCasoDialog(false)}
        >
          <div className={`${card} w-full max-w-[460px] p-6`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <NotebookText className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold tracking-[-0.01em]">¿Guardar como caso?</h2>
                <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
                  Deriva una copia ANONIMIZADA de este estudio a tu bitácora (sin datos del paciente;
                  imágenes con tags e imagen redactados · §10). El docente decide luego cuáles curar. El
                  reporte queda intacto en “Mis reportes”.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCasoDialog(false)}
                disabled={pendiente}
                className={`inline-flex h-11 items-center rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60 ${focusRing}`}
              >
                No, solo el reporte
              </button>
              <button
                type="button"
                onClick={onCaso}
                disabled={pendiente}
                className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
              >
                <NotebookText aria-hidden className="h-4 w-4" strokeWidth={1.9} />
                {pendiente ? 'Generando…' : 'Sí, guardar como caso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* diálogo: enviar por mail (BUG 4) — captura correo + asunto; envío real = stub (§8/§9) */}
      {mailDialog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,45,82,0.32)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Enviar por correo"
          onClick={() => !pendiente && setMailDialog(false)}
        >
          <div className={`${card} w-full max-w-[460px] p-6`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <Mail className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold tracking-[-0.01em]">Enviar por correo</h2>
                <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
                  Captura el correo del destinatario y el asunto. El envío real por correo está
                  pendiente de conectar (dominio de correo · §8/§9).
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
                onClick={() => setMailDialog(false)}
                disabled={pendiente}
                className={`inline-flex h-11 items-center rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60 ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onEnviarMail}
                disabled={pendiente || !mailTo.trim()}
                className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
              >
                <Mail aria-hidden className="h-4 w-4" strokeWidth={1.9} />
                {pendiente ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── card de una sección de hallazgos: grid de campos vía CampoReporte ── */
function SeccionCard({
  seccion,
  valores,
  onValor,
  reporteId,
  soloLectura,
}: {
  seccion: SeccionPlantilla;
  valores: Record<string, unknown>;
  onValor: (campoId: string, v: unknown) => void;
  reporteId: string;
  soloLectura: boolean;
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
              soloLectura={soloLectura}
              onCambio={(v) => onValor(c.id, v)}
              reporteId={reporteId}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
