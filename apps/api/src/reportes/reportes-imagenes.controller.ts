import { Body, Controller, Post } from '@nestjs/common';
import { ReportesImagenesService } from './reportes-imagenes.service';

/**
 * Puente de la GALERÍA de imágenes del reporte (§6.5). El web (tras gatear propiedad del
 * reporte bajo RLS) firma la subida, dispara la redacción Presidio (§10) y firma la lectura.
 */

interface FirmarSubidaBody {
  reporteId: string;
  ext: string;
}
interface ProcesarBody {
  reporteId: string;
  id: string;
  ext: string;
}
interface LecturaBody {
  refs: string[];
}

@Controller('reportes/imagenes')
export class ReportesImagenesController {
  constructor(private readonly svc: ReportesImagenesService) {}

  @Post('firmar-subida')
  firmarSubida(@Body() b: FirmarSubidaBody) {
    return this.svc.firmarSubida(b.reporteId, b.ext);
  }

  @Post('procesar')
  procesar(@Body() b: ProcesarBody) {
    return this.svc.procesar(b.reporteId, b.id, b.ext);
  }

  @Post('firmar-lectura')
  firmarLectura(@Body() b: LecturaBody) {
    return this.svc.firmarLectura(b.refs ?? []);
  }
}
