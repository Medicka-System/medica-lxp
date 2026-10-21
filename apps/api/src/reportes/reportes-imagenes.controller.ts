import { Body, Controller, Post } from '@nestjs/common';
import { ReportesImagenesService } from './reportes-imagenes.service';

/**
 * Puente de la GALERÍA de imágenes del reporte (§6.5). El web (tras gatear propiedad del
 * reporte bajo RLS) firma la subida del crudo, ENCOLA la redacción async (worker · §10),
 * firma la lectura y gestiona reordenar/pie/quitar (propiedad ya validada en el web).
 */

interface FirmarSubidaBody {
  reporteId: string;
  ext: string;
}
interface EncolarBody {
  reporteId: string;
  campoId: string;
  id: string;
  ext: string;
}
interface LecturaBody {
  refs: string[];
}
interface ReordenarBody {
  reporteId: string;
  campoId: string;
  ids: string[];
}
interface PieBody {
  reporteId: string;
  imagenId: string;
  pie: string;
}
interface QuitarBody {
  reporteId: string;
  imagenId: string;
}

@Controller('reportes/imagenes')
export class ReportesImagenesController {
  constructor(private readonly svc: ReportesImagenesService) {}

  @Post('firmar-subida')
  firmarSubida(@Body() b: FirmarSubidaBody) {
    return this.svc.firmarSubida(b.reporteId, b.ext);
  }

  @Post('encolar')
  encolar(@Body() b: EncolarBody) {
    return this.svc.encolar(b.reporteId, b.campoId, b.id, b.ext);
  }

  @Post('firmar-lectura')
  firmarLectura(@Body() b: LecturaBody) {
    return this.svc.firmarLectura(b.refs ?? []);
  }

  @Post('reordenar')
  reordenar(@Body() b: ReordenarBody) {
    return this.svc.reordenar(b.reporteId, b.campoId, b.ids ?? []);
  }

  @Post('pie')
  editarPie(@Body() b: PieBody) {
    return this.svc.editarPie(b.reporteId, b.imagenId, b.pie ?? '');
  }

  @Post('quitar')
  quitar(@Body() b: QuitarBody) {
    return this.svc.quitar(b.reporteId, b.imagenId);
  }
}
