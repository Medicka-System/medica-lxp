'use client';

import {
  init as coreInit,
  RenderingEngine,
  Enums as CoreEnums,
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
} from '@cornerstonejs/tools';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { obtenerHerramienta, type HerramientaId } from '../herramientas';
import { MotorVisorError, type MotorVisor } from '../motor';

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

let inicializado: Promise<void> | null = null;

/** Inicializa Cornerstone3D + tools + loader DICOM una sola vez por proceso. */
function inicializarCornerstone(): Promise<void> {
  if (inicializado) return inicializado;
  inicializado = (async () => {
    await coreInit();
    await toolsInit();
    dicomImageLoaderInit();
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

  async montar(elemento: HTMLElement): Promise<void> {
    await inicializarCornerstone();

    const engine = new RenderingEngine(this.engineId);
    engine.enableElement({
      viewportId: this.viewportId,
      type: CoreEnums.ViewportType.STACK,
      element: elemento as HTMLDivElement,
    });
    this.engine = engine;

    const toolGroup = ToolGroupManager.createToolGroup(this.toolGroupId);
    if (!toolGroup) {
      throw new MotorVisorError('No se pudo crear el grupo de herramientas');
    }
    for (const Clase of CLASES_HERRAMIENTA) toolGroup.addTool(Clase.toolName);
    toolGroup.addViewport(this.viewportId, this.engineId);

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

  async cargarSerie(imageIds: string[], indiceInicial = 0): Promise<void> {
    const viewport = this.stackViewport();
    try {
      await viewport.setStack(imageIds, indiceInicial);
      viewport.render();
    } catch (e) {
      throw new MotorVisorError('No se pudo cargar la serie DICOM', e);
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
