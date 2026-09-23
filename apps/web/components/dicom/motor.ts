import type { HerramientaId } from './herramientas';

/**
 * Una anotación/medición serializada del motor (JSON de Cornerstone3D), lista para
 * persistir como CAPA (nunca quemada en el píxel · FASE 2). `datos` es la anotación
 * cruda; `valor` es el valor medido legible (mm/cm²/°) que da la calibración del DICOM.
 */
export interface AnotacionMotor {
  annotationUID: string;
  toolName: string;
  /** imageId (URL firmada) sobre el que se dibujó — se re-liga por serie/frame al abrir. */
  referencedImageId: string | null;
  datos: Record<string, unknown>;
  valor: string | null;
  /** Bloqueada = de otro autor o estudio curado (no se guarda como propia). */
  bloqueada: boolean;
}

/** Anotación a restaurar en el motor: su JSON + si va BLOQUEADA (de otro autor o curado). */
export interface AnotacionRestaurar {
  datos: Record<string, unknown>;
  bloqueada: boolean;
}

/**
 * `MotorVisor` — frontera limpia entre la UI del visor y el engine de render.
 *
 * La UI (`VisorDicom`, hooks, toolbar) SOLO habla con esta interfaz. La
 * implementación real es Cornerstone3D (`engine/motor-cornerstone.ts`), cargada
 * de forma dinámica y solo en el cliente (WebGL). En tests se inyecta un doble
 * (`MotorFake`) — así la lógica del componente se prueba sin WebGL ni red.
 *
 * Regla de Oro (§2): el motor NO tiene lógica de dominio; solo dibuja y mide.
 */
export interface MotorVisor {
  /** Monta el render engine sobre el elemento contenedor. Idempotente. */
  montar(elemento: HTMLElement): Promise<void>;

  /**
   * Carga la serie como un stack de frames y muestra `indiceInicial`.
   * Reemplaza la serie anterior si ya había una montada.
   */
  cargarSerie(imageIds: string[], indiceInicial?: number): Promise<void>;

  /** Muestra el frame en `indice` (base del cine-loop y del scroll manual). */
  mostrarFrame(indice: number): void;

  /** Activa una herramienta (manipulación, medición o anotación). */
  activarHerramienta(id: HerramientaId): void;

  /** Borra todas las anotaciones/mediciones de la serie visible. */
  limpiarAnotaciones(): void;

  /** Reencuadra la imagen (fit + reset de brillo/contraste). */
  reencuadrar(): void;

  /* ── Anotaciones GUARDABLES (FASE 2) ── */

  /** Serializa TODAS las anotaciones actuales (JSON de Cornerstone) para persistir. */
  serializarAnotaciones(): AnotacionMotor[];

  /** Restaura anotaciones guardadas; las `bloqueada` no se pueden editar (otro autor / curado). */
  restaurarAnotaciones(items: AnotacionRestaurar[]): void;

  /** Borra UNA anotación por su UID (la del autor, desde el panel). */
  borrarAnotacion(annotationUID: string): void;

  /**
   * Suscribe a cambios de anotaciones (completar / modificar / borrar) para auto-guardar.
   * Devuelve la función para desuscribir. NO dispara al restaurar (solo edición del usuario).
   */
  onCambioAnotaciones(cb: () => void): () => void;

  /** Libera recursos (rendering engine, listeners). Idempotente. */
  destruir(): void;
}

/** Errores del motor se envuelven aquí para no tragar excepciones (§5). */
export class MotorVisorError extends Error {
  constructor(mensaje: string, readonly causa?: unknown) {
    super(mensaje);
    this.name = 'MotorVisorError';
  }
}
