import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { IngestaService, type LecturaEstudio, type SolicitudSubida } from './ingesta.service';

/**
 * Ingesta DICOM (§8/§9 · Sprint 4.7). Dominio/orquestación, no proxy de CRUD: emite
 * URLs firmadas para subir directo a object storage y encola la anonimización
 * bloqueante. El caso de bitácora ya existe (lo crea el flujo del alumno · Sprint 5).
 */
@Controller('dicom/casos/:casoId')
export class IngestaController {
  constructor(private readonly ingesta: IngestaService) {}

  /** Firma la subida del estudio crudo (el cliente sube directo al storage). */
  @Post('ingesta/solicitar')
  @HttpCode(200)
  solicitar(@Param('casoId') casoId: string): Promise<SolicitudSubida> {
    return this.ingesta.solicitarSubida(casoId);
  }

  /** Confirma la subida y encola `procesar-dicom` (parsear → anonimizar → guardar). */
  @Post('ingesta/confirmar')
  @HttpCode(202)
  confirmar(
    @Param('casoId') casoId: string,
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    return this.ingesta.confirmarSubida(casoId);
  }

  /** Firma la lectura del estudio anonimizado para el visor (409 si aún no lo está). */
  @Post('ingesta/estudio')
  @HttpCode(200)
  estudio(@Param('casoId') casoId: string): Promise<LecturaEstudio> {
    return this.ingesta.urlLecturaEstudio(casoId);
  }
}
