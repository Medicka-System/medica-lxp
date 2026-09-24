import { Controller, Param, Post } from '@nestjs/common';
import { ReportesCasoService } from './reportes-caso.service';

/**
 * Puente reporte → caso educativo (§6/§10). El web (tras gatear propiedad del reporte bajo
 * RLS) dispara la generación del caso anonimizado en la bitácora del médico.
 */
@Controller('reportes')
export class ReportesCasoController {
  constructor(private readonly svc: ReportesCasoService) {}

  @Post(':id/generar-caso')
  generarCaso(@Param('id') id: string) {
    return this.svc.generarCaso(id);
  }
}
