import { BadRequestException, Body, Controller, HttpCode, Injectable, Module, Post } from '@nestjs/common';
import { QUEUE_DETECCION_HITO } from '@campus/shared';
import { ColasProducer } from '../colas/colas-producer';

/** Comando de dominio: detectar hitos del alumno (§8). */
@Injectable()
export class HitosService {
  constructor(private readonly colas: ColasProducer) {}
  detectar(alumnoId: string): Promise<string> {
    return this.colas.encolar(QUEUE_DETECCION_HITO, { alumnoId });
  }
}

@Controller('hitos')
export class HitosController {
  constructor(private readonly hitos: HitosService) {}

  @Post('detectar')
  @HttpCode(202)
  async detectar(
    @Body() body: { alumnoId?: string },
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    if (!body?.alumnoId) throw new BadRequestException('alumnoId es requerido');
    const jobId = await this.hitos.detectar(body.alumnoId);
    return { encolado: true, cola: QUEUE_DETECCION_HITO, jobId };
  }
}

@Module({
  controllers: [HitosController],
  providers: [HitosService],
})
export class HitosModule {}
