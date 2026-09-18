import type { HerramientaId } from './herramientas';

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
