'use client';

import {
  init as coreInit,
  RenderingEngine,
  Enums as CoreEnums,
  eventTarget,
  imageLoader,
  metaData,
  type Types,
} from '@cornerstonejs/core';
import {
  init as toolsInit,
  addTool,
  ToolGroupManager,
  Enums as ToolsEnums,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  StackScrollTool,
  LengthTool,
  AngleTool,
  EllipticalROITool,
  RectangleROITool,
  ProbeTool,
  ArrowAnnotateTool,
  annotation,
  utilities as toolsUtilities,
} from '@cornerstonejs/tools';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { obtenerHerramienta, type HerramientaId } from '../herramientas';
import {
  MotorVisorError,
  type MotorVisor,
  type AnotacionMotor,
  type AnotacionRestaurar,
} from '../motor';
import { registrarEspaciadoUltrasonido } from './espaciado-ultrasonido';
import { registrarWebImageLoader } from './web-image-loader';

/** Forma mínima de una anotación de Cornerstone que consultamos (tolerante). */
interface AnotacionCruda {
  annotationUID?: string;
  metadata?: { toolName?: string; referencedImageId?: string | null; FrameOfReferenceUID?: string };
  data?: {
    text?: string;
    label?: string;
    cachedStats?: Record<string, Record<string, unknown>>;
  };
}

function redondear(v: unknown, dec: number): string | null {
  return typeof v === 'number' && Number.isFinite(v) ? v.toFixed(dec) : null;
}

/**
 * Valor medido LEGIBLE de una anotación (mm / cm² / ° …) leído de `cachedStats`, que
 * Cornerstone calcula con la calibración del DICOM (FASE 1). `null` si la herramienta no
 * mide (p. ej. flecha sin texto).
 */
function valorLegible(a: AnotacionCruda): string | null {
  const tool = a.metadata?.toolName ?? '';
  if (tool === 'ArrowAnnotate') return a.data?.text || a.data?.label || null;

  const stats = a.data?.cachedStats;
  const primera = stats ? Object.values(stats)[0] : undefined;
  if (!primera) return null;

  const length = redondear(primera.length, 1);
  if (length) return `${length} ${(primera.unit as string) ?? 'px'}`;

  const area = redondear(primera.area, 1);
  if (area) return `${area} ${(primera.areaUnit as string) ?? (primera.unit as string) ?? 'px'}²`;

  const angle = redondear(primera.angle, 0);
  if (angle) return `${angle}°`;

  const value = redondear(primera.value, 0);
  if (value) return value;

  return null;
}

/**
 * Implementación de `MotorVisor` sobre **Cornerstone3D** (§3, §4.7).
 *
 * ⚠️ Único archivo del visor acoplado a la librería y al **loader DICOM**. Se
 * importa de forma dinámica y solo en el cliente (WebGL / Web Workers). El
 * parseo binario real (wadouri/wadors) lo aporta `@cornerstonejs/dicom-image-loader`;
 * qué scheme se use por caso lo decide el pipeline de ingesta (`procesar-dicom`),
 * aún **por decidir** (§4.7). Aquí solo registramos el loader y renderizamos.
 */

// Clases de herramienta registradas una sola vez en el proceso.
const CLASES_HERRAMIENTA = [
  PanTool,
  ZoomTool,
  WindowLevelTool,
  StackScrollTool,
  LengthTool,
  AngleTool,
  EllipticalROITool,
  RectangleROITool,
  ProbeTool,
  ArrowAnnotateTool,
] as const;

/** Herramientas que producen anotaciones (van en PASIVO para dibujar siempre su capa). */
const TOOLS_ANOTACION = [
  LengthTool,
  AngleTool,
  EllipticalROITool,
  RectangleROITool,
  ProbeTool,
  ArrowAnnotateTool,
] as const;

let inicializado: Promise<void> | null = null;

/** Inicializa Cornerstone3D + tools + loader DICOM una sola vez por proceso. */
function inicializarCornerstone(): Promise<void> {
  if (inicializado) return inicializado;
  inicializado = (async () => {
    await coreInit();
    await toolsInit();
    dicomImageLoaderInit();
    // Loader propio para imágenes web (JPG/PNG) bajo el esquema `web:` — el visor es
    // transversal y muestra `.dcm` e imágenes en el mismo viewport (§3).
    registrarWebImageLoader();
    // Aspect ratio real de ultrasonido (§ contexto clínico): el loader solo lee
    // PixelSpacing y asume píxeles cuadrados; registramos un proveedor que devuelve el
    // espaciado real calculado en la ingesta (ver módulo `espaciado-ultrasonido`).
    registrarEspaciadoUltrasonido(metaData);
    for (const Clase of CLASES_HERRAMIENTA) addTool(Clase);
  })().catch((e) => {
    inicializado = null; // permitir reintento si falló
    throw new MotorVisorError('No se pudo inicializar Cornerstone3D', e);
  });
  return inicializado;
}

// Contador para ids únicos sin depender de Math.random (SSR-safe).
let seq = 0;

export class MotorCornerstone implements MotorVisor {
  private readonly viewportId = `visor-vp-${++seq}`;
  private readonly engineId = `visor-engine-${seq}`;
  private readonly toolGroupId = `visor-tg-${seq}`;
  private engine: RenderingEngine | null = null;
  private toolGroup: ReturnType<typeof ToolGroupManager.createToolGroup> | null = null;
  private herramientaPrimaria = '';
  private elemento: HTMLDivElement | null = null;
  /** Blindaje de teardown: `destruir()` es idempotente (doble cleanup / React StrictMode). */
  private destruido = false;

  async montar(elemento: HTMLElement): Promise<void> {
    await inicializarCornerstone();

    const engine = new RenderingEngine(this.engineId);
    engine.enableElement({
      viewportId: this.viewportId,
      type: CoreEnums.ViewportType.STACK,
      element: elemento as HTMLDivElement,
    });
    this.engine = engine;
    this.elemento = elemento as HTMLDivElement;

    const toolGroup = ToolGroupManager.createToolGroup(this.toolGroupId);
    if (!toolGroup) {
      throw new MotorVisorError('No se pudo crear el grupo de herramientas');
    }
    for (const Clase of CLASES_HERRAMIENTA) toolGroup.addTool(Clase.toolName);
    toolGroup.addViewport(this.viewportId, this.engineId);

    // Herramientas de anotación/medición en PASIVO por defecto → sus anotaciones SIEMPRE
    // se dibujan (una tool en modo Disabled NO renderiza su capa). La activa se fija con
    // el botón primario al seleccionarla (`activarHerramienta`).
    for (const Clase of TOOLS_ANOTACION) toolGroup.setToolPassive(Clase.toolName);

    // Bindings fijos de manipulación (rueda = scroll de frames, botón medio =
    // desplazar, botón derecho = zoom). El botón primario lo ocupa la
    // herramienta activa seleccionada en la toolbar.
    toolGroup.setToolActive(StackScrollTool.toolName, {
      bindings: [{ mouseButton: ToolsEnums.MouseBindings.Wheel }],
    });
    toolGroup.setToolActive(PanTool.toolName, {
      bindings: [{ mouseButton: ToolsEnums.MouseBindings.Auxiliary }],
    });
    toolGroup.setToolActive(ZoomTool.toolName, {
      bindings: [{ mouseButton: ToolsEnums.MouseBindings.Secondary }],
    });
    this.toolGroup = toolGroup;
  }

  async cargarSerie(
    imageIds: string[],
    indiceInicial = 0,
    regionUS?: [number, number, number, number],
  ): Promise<void> {
    const viewport = this.stackViewport();
    try {
      // Pre-decodifica y CACHEA la imagen inicial ANTES de `setStack`. El loader `web:` (JPG/PNG)
      // decodifica async (fetch + createImageBitmap); `setStack` no espera de forma fiable ese decode,
      // así que el viewport se pintaba en NEGRO en el primer montaje y solo aparecía al re-entrar (ya
      // cacheada). Con la imagen en la caché de Cornerstone, `setStack` la muestra de inmediato.
      // Best-effort: si la pre-carga falla, `setStack` reintenta (no rompe el camino `.dcm`).
      const inicial = imageIds[indiceInicial] ?? imageIds[0];
      if (inicial) await imageLoader.loadAndCacheImage(inicial).catch(() => undefined);
      await viewport.setStack(imageIds, indiceInicial);
      if (regionUS) this.encuadrarRegion(viewport, regionUS);
      viewport.render();
    } catch (e) {
      throw new MotorVisorError('No se pudo cargar la serie DICOM', e);
    }
  }

  /**
   * AUTO-ENCUADRE a la región de ultrasonido (0018,6011 · §5A): hace zoom+centro para que
   * la caja clínica `[x0,y0,x1,y1]` (px de la imagen) llene el viewport, dejando fuera las
   * bandas negras del chrome del ecógrafo. Usa `setDisplayArea`:
   *   · `imageArea = [anchoRegión/anchoImg, altoRegión/altoImg]` → fracción de imagen a caber
   *     (Cornerstone calcula el zoom para que quepa; si la región excede el viewport, hace fit).
   *   · `imageCanvasPoint` → alinea el CENTRO de la región con el centro del canvas.
   * `storeAsInitialCamera: true` para que "reencuadrar" vuelva aquí. El zoom/pan manual sigue
   * disponible (esto solo fija la cámara inicial). Tolerante: cualquier fallo se ignora (el
   * visor cae al encuadre por defecto — la imagen completa).
   */
  private encuadrarRegion(
    viewport: Types.IStackViewport,
    [x0, y0, x1, y1]: [number, number, number, number],
  ): void {
    try {
      const img = viewport.getImageData();
      if (!img) return;
      const [cols, rows] = img.dimensions; // [ancho, alto] en px de la imagen
      if (!cols || !rows) return;
      const anchoReg = x1 - x0;
      const altoReg = y1 - y0;
      if (anchoReg <= 0 || altoReg <= 0) return;
      const centroX = (x0 + x1) / 2 / cols;
      const centroY = (y0 + y1) / 2 / rows;
      viewport.setDisplayArea({
        imageArea: [Math.min(1, anchoReg / cols), Math.min(1, altoReg / rows)],
        imageCanvasPoint: { imagePoint: [centroX, centroY], canvasPoint: [0.5, 0.5] },
        storeAsInitialCamera: true,
      });
    } catch {
      /* el auto-encuadre es una mejora, no un requisito: si falla, encuadre por defecto */
    }
  }

  mostrarFrame(indice: number): void {
    const viewport = this.stackViewport();
    // setImageIdIndex es async; en cine-loop no esperamos (fire-and-forget).
    void viewport.setImageIdIndex(indice);
  }

  activarHerramienta(id: HerramientaId): void {
    if (!this.toolGroup) return;
    const nombre = obtenerHerramienta(id).nombreCornerstone;
    // Libera el botón primario de la herramienta anterior.
    if (this.herramientaPrimaria && this.herramientaPrimaria !== nombre) {
      this.toolGroup.setToolPassive(this.herramientaPrimaria);
    }
    this.toolGroup.setToolActive(nombre, {
      bindings: [{ mouseButton: ToolsEnums.MouseBindings.Primary }],
    });
    this.herramientaPrimaria = nombre;
  }

  limpiarAnotaciones(): void {
    annotation.state.removeAllAnnotations();
    this.engine?.render();
  }

  /* ── Anotaciones guardables (FASE 2) ── */

  serializarAnotaciones(): AnotacionMotor[] {
    const todas = annotation.state.getAllAnnotations() as unknown as AnotacionCruda[];
    return todas.map((a) => {
      const uid = String(a.annotationUID ?? '');
      return {
        annotationUID: uid,
        toolName: String(a.metadata?.toolName ?? ''),
        referencedImageId: a.metadata?.referencedImageId ?? null,
        // Clon plano (sin refs a objetos de Cornerstone) para serializar a JSON.
        datos: JSON.parse(JSON.stringify(a)) as Record<string, unknown>,
        valor: valorLegible(a),
        bloqueada: uid ? annotation.locking.isAnnotationLocked(uid) : false,
      };
    });
  }

  restaurarAnotaciones(items: AnotacionRestaurar[]): void {
    if (!this.elemento) return;
    // El grupo de anotaciones se llavea por FrameOfReferenceUID; para que se DIBUJEN en
    // este viewport hay que meterlas en SU FoR (el guardado es de otra sesión).
    const forUID = this.stackViewport().getFrameOfReferenceUID?.() ?? undefined;
    for (const item of items) {
      const a = item.datos as AnotacionCruda;
      try {
        a.metadata = { ...(a.metadata ?? {}), FrameOfReferenceUID: forUID };
        annotation.state.addAnnotation(a as never, this.elemento as never);
        if (item.bloqueada && a.annotationUID) {
          annotation.locking.setAnnotationLocked(a.annotationUID, true);
        }
      } catch {
        /* una anotación corrupta no debe tumbar el resto */
      }
    }
    this.dibujarAnotaciones();
  }

  borrarAnotacion(annotationUID: string): void {
    annotation.state.removeAnnotation(annotationUID);
    this.dibujarAnotaciones();
  }

  /** Repinta la imagen + la CAPA de anotaciones (necesario tras añadir/quitar por código). */
  private dibujarAnotaciones(): void {
    this.engine?.render();
    if (this.elemento) toolsUtilities.triggerAnnotationRender(this.elemento);
  }

  onCambioAnotaciones(cb: () => void): () => void {
    const eventos = [
      ToolsEnums.Events.ANNOTATION_COMPLETED,
      ToolsEnums.Events.ANNOTATION_MODIFIED,
      ToolsEnums.Events.ANNOTATION_REMOVED,
    ];
    const handler = () => cb();
    for (const ev of eventos) eventTarget.addEventListener(ev, handler);
    return () => {
      for (const ev of eventos) eventTarget.removeEventListener(ev, handler);
    };
  }

  reencuadrar(): void {
    const viewport = this.stackViewport();
    viewport.resetCamera();
    viewport.resetProperties?.();
    viewport.render();
  }

  /**
   * Teardown IDEMPOTENTE y TOLERANTE. Llamarlo 2+ veces (doble cleanup del efecto / React
   * StrictMode) es no-op. `engine?.destroy()` solo cubre `null`, no un engine ya destruido: en ese
   * caso Cornerstone hace `Object.keys` sobre estructuras ya liberadas y lanza "Cannot convert
   * undefined or null to object". Guardamos con `hasBeenDestroyed` + un flag propio, y envolvemos
   * cada paso en try/catch para que un teardown nunca tumbe la app (se loguea, no se propaga).
   */
  destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    try {
      if (this.toolGroup) ToolGroupManager.destroyToolGroup(this.toolGroupId);
    } catch (e) {
      console.warn('[MotorCornerstone] destroyToolGroup falló (teardown tolerante):', e);
    } finally {
      this.toolGroup = null;
    }
    try {
      const engine = this.engine;
      // No re-destruir un engine ya destruido (o a medio inicializar): `hasBeenDestroyed` es la
      // bandera de Cornerstone; el `?.` de antes no la miraba y re-destruía → crash.
      if (engine && !(engine as { hasBeenDestroyed?: boolean }).hasBeenDestroyed) engine.destroy();
    } catch (e) {
      console.warn('[MotorCornerstone] engine.destroy falló (teardown tolerante):', e);
    } finally {
      this.engine = null;
    }
  }

  private stackViewport(): Types.IStackViewport {
    if (!this.engine) throw new MotorVisorError('El visor no está montado');
    return this.engine.getViewport(this.viewportId) as Types.IStackViewport;
  }
}

/** Fábrica del motor real (se pasa a `useVisorDicom` en el cliente). */
export function crearMotorCornerstone(): MotorVisor {
  return new MotorCornerstone();
}

/** Espera a que el WebGL pinte antes de leer el canvas (2 frames de gracia). */
function esperarPintado(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/**
 * Corre `p` con límite de tiempo: si no resuelve en `ms`, RECHAZA. Blinda el rasterizado por
 * lotes contra un `setStack` que se cuelga sin resolver ni rechazar (un `.dcm` que el loader no
 * logra parsear) — sin esto, UNA imagen colgada congelaba toda la generación del PDF/miniaturas.
 */
function conTiempoLimite<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

/**
 * Concurrencia del rasterizado por lote. BAJA (2) a propósito: cada lane usa un contexto WebGL
 * y el navegador solo mantiene ~16 vivos a la vez. Antes se creaba (y "destruía") un engine por
 * lote/imagen, pero `engine.destroy()` NO libera el contexto WebGL de inmediato → llamadas
 * repetidas (p. ej. 18 miniaturas) agotaban los contextos y el canvas salía NEGRO.
 */
const RASTER_CONCURRENCIA = 2;

type LaneRaster = { engine: RenderingEngine; viewportId: string; el: HTMLDivElement };

/**
 * Pool PERSISTENTE de lanes: se crean como mucho `RASTER_CONCURRENCIA` engines EN TODA LA VIDA
 * de la página y se REUSAN entre llamadas (jamás se destruyen). Así el número de contextos WebGL
 * queda ACOTADO y no crece con cada lote → no más miniaturas negras por fuga de contextos.
 */
const poolLanes: LaneRaster[] = [];

function crearLaneRaster(): LaneRaster {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:-10000px;top:0;width:160px;height:120px;pointer-events:none;';
  document.body.appendChild(el);
  const engineId = `raster-engine-${++seq}`;
  const viewportId = `raster-vp-${seq}`;
  const engine = new RenderingEngine(engineId);
  engine.enableElement({ viewportId, type: CoreEnums.ViewportType.STACK, element: el as HTMLDivElement });
  return { engine, viewportId, el };
}

/**
 * Serializa los lotes: las lanes del pool son COMPARTIDAS, así que dos lotes a la vez
 * (p. ej. miniaturas de galería + rasterizado del PDF) las corromperían. Encola uno tras otro.
 */
let cadenaRaster: Promise<unknown> = Promise.resolve();
function enColaRaster<T>(fn: () => Promise<T>): Promise<T> {
  const r = cadenaRaster.then(fn, fn);
  cadenaRaster = r.then(
    () => undefined,
    () => undefined,
  );
  return r;
}

/**
 * Rasteriza un LOTE de imageIds con concurrencia limitada, REUSANDO el pool persistente de lanes.
 * Cornerstone no rinde N imágenes en un mismo viewport (setStack reemplaza la pila), así que hay
 * `RASTER_CONCURRENCIA` lanes; cada una toma índices de una cola compartida. El resultado se
 * escribe por ÍNDICE (`salida[i]`) → conserva el ORDEN aunque terminen desordenadas. Mantiene el
 * timeout por imagen (una lenta cae a `null` y la lane sigue). No lanza: es best-effort.
 */
async function renderLotePool<T>(
  imageIds: string[],
  opts: { ancho: number; alto: number; timeoutMs: number },
  capturar: (viewport: Types.IStackViewport) => T | null,
): Promise<(T | null)[]> {
  const salida: (T | null)[] = new Array(imageIds.length).fill(null);
  if (imageIds.length === 0) return salida;
  try {
    await inicializarCornerstone();
  } catch {
    return salida;
  }

  return enColaRaster(async () => {
    const nLanes = Math.max(1, Math.min(RASTER_CONCURRENCIA, imageIds.length));
    while (poolLanes.length < nLanes) poolLanes.push(crearLaneRaster());
    const lanes = poolLanes.slice(0, nLanes);

    let cursor = 0;
    const correrLane = async (lane: LaneRaster): Promise<void> => {
      // Ajusta el tamaño de la lane al lote actual (miniatura 160×120 vs PDF 1100×825) y
      // redimensiona su canvas WebGL — sin crear un engine nuevo.
      lane.el.style.width = `${opts.ancho}px`;
      lane.el.style.height = `${opts.alto}px`;
      try {
        lane.engine.resize(true, false);
      } catch {
        /* resize best-effort */
      }
      const viewport = lane.engine.getViewport(lane.viewportId) as Types.IStackViewport;
      for (;;) {
        const i = cursor++; // sincrónico → cada lane toma un índice distinto (JS mono-hilo)
        if (i >= imageIds.length) break;
        try {
          // Pre-decodifica y CACHEA antes de `setStack` (mismo fix que el viewport principal): el
          // loader `web:` decodifica async y la miniatura salía en negro/vacía en la 1a pasada.
          await conTiempoLimite(imageLoader.loadAndCacheImage(imageIds[i]!), opts.timeoutMs).catch(() => undefined);
          await conTiempoLimite(viewport.setStack([imageIds[i]!], 0), opts.timeoutMs);
          viewport.render();
          await esperarPintado();
          salida[i] = capturar(viewport);
        } catch {
          salida[i] = null;
        }
      }
    };

    await Promise.all(lanes.map((l) => correrLane(l)));
    // NO se destruye nada: el pool se reusa → contextos WebGL acotados a RASTER_CONCURRENCIA.
    return salida;
  });
}

/**
 * Renderiza MINIATURAS reales (data URL JPEG) del primer frame de cada serie (§4.7 · tira de
 * series del detalle · miniaturas .dcm de la galería del reporte). Rasteriza EN PARALELO con
 * límite de concurrencia (pool) conservando el orden; devuelve `null` por serie que no se pudo
 * previsualizar (el selector cae a su ícono). No lanza: las miniaturas son un adorno.
 */
export async function renderMiniaturas(imageIds: string[]): Promise<(string | null)[]> {
  return renderLotePool(imageIds, { ancho: 160, alto: 120, timeoutMs: 8000 }, (viewport) => {
    const canvas = viewport.getCanvas();
    return canvas ? canvas.toDataURL('image/jpeg', 0.6) : null;
  });
}

/**
 * Rasteriza imágenes a PNG (data URL) en viewports OFFSCREEN de alta resolución — para el PDF
 * del reporte (§6.5): las imágenes DICOM no tienen raster server-side, así que el cliente las
 * renderiza aquí (sin auto-encuadre) y las manda al `api`. Rasteriza EN PARALELO con límite de
 * concurrencia (pool) conservando el ORDEN — con ~18 DICOM el PDF sale en pocos segundos en vez
 * de en serie. `lado` fija el ancho del canvas oculto → nitidez del PNG. `null` por imagen que
 * no se pudo pintar (o que superó el timeout). No lanza.
 */
export async function renderImagenesPng(imageIds: string[], lado = 1100): Promise<(string | null)[]> {
  const alto = Math.round(lado * 0.75);
  return renderLotePool(imageIds, { ancho: lado, alto, timeoutMs: 8000 }, (viewport) => {
    const canvas = viewport.getCanvas();
    return canvas ? canvas.toDataURL('image/png') : null;
  });
}

/** Miniatura con su proporción NATIVA (px reales de la imagen), para encuadrar sin deformar. */
export type MiniaturaDetalle = { url: string; ancho: number; alto: number };

/**
 * Como `renderMiniaturas`, pero además devuelve las dimensiones reales de la imagen
 * (`Columns`/`Rows` del DICOM, no del canvas offscreen) para que el consumidor fije un
 * `aspect-ratio` fiel a la proporción nativa del estudio (§5A · card de la rejilla del
 * alumno). Devuelve `null` por imagen que no se pudo previsualizar. No lanza.
 */
export async function renderMiniaturasDetalle(
  imageIds: string[],
  // Tamaño del canvas offscreen = RESOLUCIÓN del raster. Default 160×120 (tira de series /
  // validación). El consumidor que muestra la miniatura GRANDE (card de Mi Bitácora) pide un
  // tamaño ≥ su contenedor (idealmente 2× retina) para que no se vea pixelada.
  opts: { ancho?: number; alto?: number } = {},
): Promise<(MiniaturaDetalle | null)[]> {
  const ancho = opts.ancho ?? 160;
  const alto = opts.alto ?? 120;
  return renderLotePool(imageIds, { ancho, alto, timeoutMs: 8000 }, (viewport) => {
    const canvas = viewport.getCanvas();
    const url = canvas ? canvas.toDataURL('image/jpeg', 0.6) : null;
    if (!url) return null;
    // Dimensiones reales de la imagen (no del canvas 160×120): [cols, rows, 1].
    const dims = viewport.getImageData()?.dimensions;
    const ancho = Array.isArray(dims) ? dims[0] ?? 0 : 0;
    const alto = Array.isArray(dims) ? dims[1] ?? 0 : 0;
    return ancho > 0 && alto > 0 ? { url, ancho, alto } : { url, ancho: 4, alto: 3 };
  });
}
