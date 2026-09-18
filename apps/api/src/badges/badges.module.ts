import { BadRequestException, Body, Controller, HttpCode, Injectable, Module, Post } from '@nestjs/common';
import { QUEUE_OTORGAR_BADGES } from '@campus/shared';
import { ColasProducer } from '../colas/colas-producer';

/** Comando de dominio: evaluar y otorgar badges del alumno (§8). */
@Injectable()
export class BadgesService {
  constructor(private readonly colas: ColasProducer) {}
  evaluar(alumnoId: string): Promise<string> {
    return this.colas.encolar(QUEUE_OTORGAR_BADGES, { alumnoId });
  }
}

@Controller('badges')
export class BadgesController {
  constructor(private readonly badges: BadgesService) {}

  @Post('evaluar')
  @HttpCode(202)
  async evaluar(
    @Body() body: { alumnoId?: string },
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    if (!body?.alumnoId) throw new BadRequestException('alumnoId es requerido');
    const jobId = await this.badges.evaluar(body.alumnoId);
    return { encolado: true, cola: QUEUE_OTORGAR_BADGES, jobId };
  }
}

@Module({
  controllers: [BadgesController],
  providers: [BadgesService],
})
export class BadgesModule {}
