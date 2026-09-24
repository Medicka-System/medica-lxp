'use client';

import {
  init as coreInit,
  RenderingEngine,
  Enums as CoreEnums,
  eventTarget,
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

  destruir(): void {
    if (this.toolGroup) {
      ToolGroupManager.destroyToolGroup(this.toolGroupId);
      this.toolGroup = null;
    }
    this.engine?.destroy();
    this.engine = null;
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
 * Renderiza MINIATURAS reales (data URL JPEG) del primer frame de cada serie, con
 * un único RenderingEngine offscreen (§4.7 · tira de series del detalle). Reusa el
 * loader DICOM ya registrado; carga cada `imageId` en un viewport oculto, deja pintar
 * y captura el canvas. Devuelve `null` por serie que no se pudo previsualizar (el
 * selector cae entonces a su ícono). No lanza: las miniaturas son un adorno, no un
 * requisito para ver el estudio.
 */
export async function renderMiniaturas(imageIds: string[]): Promise<(string | null)[]> {
  if (imageIds.length === 0) return [];
  try {
    await inicializarCornerstone();
  } catch {
    return imageIds.map(() => null);
  }

  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:-10000px;top:0;width:160px;height:120px;pointer-events:none;';
  document.body.appendChild(el);

  const engineId = `thumb-engine-${++seq}`;
  const viewportId = `thumb-vp-${seq}`;
  const engine = new RenderingEngine(engineId);
  const salida: (string | null)[] = [];

  try {
    engine.enableElement({
      viewportId,
      type: CoreEnums.ViewportType.STACK,
      element: el as HTMLDivElement,
    });
    const viewport = engine.getViewport(viewportId) as Types.IStackViewport;

    for (const imageId of imageIds) {
      try {
        await viewport.setStack([imageId], 0);
        viewport.render();
        await esperarPintado();
        const canvas = viewport.getCanvas();
        salida.push(canvas ? canvas.toDataURL('image/jpeg', 0.6) : null);
      } catch {
        salida.push(null);
      }
    }
  } catch {
    while (salida.length < imageIds.length) salida.push(null);
  } finally {
    try {
      engine.destroy();
    } catch {
      /* no-op */
    }
    el.remove();
  }
  return salida;
}
