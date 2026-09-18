import { Injectable } from '@nestjs/common';
import {
  QUEUE_CALCULO_COMPETENCIA,
  QUEUE_DETECCION_DECAIMIENTO,
} from '@campus/shared';
import { ColasProducer } from '../colas/colas-producer';

/**
 * Comandos de dominio de competencia (§2/§8). Encola trabajo hacia el worker;
 * la LECTURA de competencia va directa `web → Supabase` (Regla de Oro), no aquí.
 */
@Injectable()
export class CompetenciaService {
  constructor(private readonly colas: ColasProducer) {}

  /** Recalcula la proyección de competencia del alumno (p. ej. tras aprobar un caso). */
  recalcular(alumnoId: string): Promise<string> {
    return this.colas.encolar(QUEUE_CALCULO_COMPETENCIA, { alumnoId });
  }

  /** Dispara la detección de decaimiento (cron manual): todos o un alumno. */
  detectarDecaimiento(alumnoId?: string): Promise<string> {
    return this.colas.encolar(
      QUEUE_DETECCION_DECAIMIENTO,
      alumnoId ? { alumnoId } : {},
    );
  }
}
