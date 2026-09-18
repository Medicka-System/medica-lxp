import type { HerramientaId } from './herramientas';
import type { MotorVisor } from './motor';
import type { EstudioDicom, SerieDicom } from './types';

/**
 * Andamio de datos/motor para tests y demos locales (SPRINTS.md: "datos mock
 * como andamio"). NO es producto: nada de lógica depende de esto. El motor real
 * es Cornerstone3D; aquí un doble que registra llamadas.
 */

let contador = 0;

/** Construye una serie mock con `frames` frames (imageIds `mock:…`). */
export function serieMock(
  descripcion: string,
  frames: number,
  extra: Partial<SerieDicom> = {},
): SerieDicom {
  const id = extra.id ?? `serie-mock-${++contador}`;
  return {
    id,
    descripcion,
    modalidad: 'US',
    fps: extra.fps ?? 24,
    frames: Array.from({ length: frames }, (_, i) => ({
      imageId: `mock:${id}/frame-${i}`,
      indice: i,
    })),
    ...extra,
  };
}

/** Estudio mock: una imagen estática + un cine-loop de 24 frames. */
export function estudioMock(id = 'estudio-mock'): EstudioDicom {
  return {
    id,
    series: [
      serieMock('Estática — Longitudinal', 1, { fps: 24 }),
      serieMock('Cine-loop — 4C', 24, { fps: 24 }),
    ],
  };
}

/** Registro de las interacciones que un test quiera aseverar. */
export interface RegistroMotor {
  montado: boolean;
  destruido: boolean;
  seriesCargadas: string[][];
  framesMostrados: number[];
  herramientas: HerramientaId[];
  anotacionesLimpiadas: number;
  reencuadres: number;
}

export interface MotorFake extends MotorVisor {
  registro: RegistroMotor;
}

/**
 * Doble de `MotorVisor` para tests: no toca WebGL, solo registra. Permite
 * simular fallos de montaje/carga con `opts`.
 */
export function crearMotorFake(opts: {
  fallaMontaje?: boolean;
  fallaCarga?: boolean;
} = {}): MotorFake {
  const registro: RegistroMotor = {
    montado: false,
    destruido: false,
    seriesCargadas: [],
    framesMostrados: [],
    herramientas: [],
    anotacionesLimpiadas: 0,
    reencuadres: 0,
  };
  return {
    registro,
    async montar() {
      if (opts.fallaMontaje) throw new Error('montaje falló');
      registro.montado = true;
    },
    async cargarSerie(imageIds) {
      if (opts.fallaCarga) throw new Error('carga falló');
      registro.seriesCargadas.push(imageIds);
    },
    mostrarFrame(indice) {
      registro.framesMostrados.push(indice);
    },
    activarHerramienta(id) {
      registro.herramientas.push(id);
    },
    limpiarAnotaciones() {
      registro.anotacionesLimpiadas += 1;
    },
    reencuadrar() {
      registro.reencuadres += 1;
    },
    destruir() {
      registro.destruido = true;
    },
  };
}
