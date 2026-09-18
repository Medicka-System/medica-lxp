import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { QUEUE_CALCULO_COMPETENCIA, QUEUE_DETECCION_DECAIMIENTO } from '@campus/shared';
import { CompetenciaService } from './competencia.service';

@Controller('competencia')
export class CompetenciaController {
  constructor(private readonly competencia: CompetenciaService) {}

  /** Encola el recálculo de competencia del alumno (202). */
  @Post('recalcular')
  @HttpCode(202)
  async recalcular(
    @Body() body: { alumnoId?: string },
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    if (!body?.alumnoId) throw new BadRequestException('alumnoId es requerido');
    const jobId = await this.competencia.recalcular(body.alumnoId);
    return { encolado: true, cola: QUEUE_CALCULO_COMPETENCIA, jobId };
  }

  /** Dispara la detección de decaimiento (todos o un alumno). */
  @Post('decaimiento')
  @HttpCode(202)
  async decaimiento(
    @Body() body: { alumnoId?: string },
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    const jobId = await this.competencia.detectarDecaimiento(body?.alumnoId);
    return { encolado: true, cola: QUEUE_DETECCION_DECAIMIENTO, jobId };
  }
}
