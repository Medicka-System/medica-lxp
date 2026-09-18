import { BadRequestException, Body, Controller, HttpCode, Injectable, Module, Post } from '@nestjs/common';
import { QUEUE_EMISION_CERTIFICADO } from '@campus/shared';
import { ColasProducer } from '../colas/colas-producer';

/** Comando de dominio: emitir certificado de un hito (§8). Normalmente lo encadena
 *  `deteccion-hito`; este endpoint permite re-emisión manual (admin). */
@Injectable()
export class CertificadosService {
  constructor(private readonly colas: ColasProducer) {}
  emitir(alumnoId: string, tipo: string, horasUmbral: number): Promise<string> {
    return this.colas.encolar(QUEUE_EMISION_CERTIFICADO, {
      alumnoId,
      tipo,
      horas_umbral: horasUmbral,
    });
  }
}

@Controller('certificados')
export class CertificadosController {
  constructor(private readonly certificados: CertificadosService) {}

  @Post('emitir')
  @HttpCode(202)
  async emitir(
    @Body() body: { alumnoId?: string; tipo?: string; horas_umbral?: number },
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    if (!body?.alumnoId || !body?.tipo) {
      throw new BadRequestException('alumnoId y tipo son requeridos');
    }
    const jobId = await this.certificados.emitir(
      body.alumnoId,
      body.tipo,
      body.horas_umbral ?? 0,
    );
    return { encolado: true, cola: QUEUE_EMISION_CERTIFICADO, jobId };
  }
}

@Module({
  controllers: [CertificadosController],
  providers: [CertificadosService],
})
export class CertificadosModule {}
