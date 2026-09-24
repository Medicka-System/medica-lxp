import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { MediaImagenesService } from './media-imagenes.service';

/**
 * Puente de las IMÁGENES de contenido del course builder (§5C). El web (tras gatear autoría
 * con `requireAutoria`, staff) firma la subida DIRECTA y la lectura. Es CONTENIDO educativo
 * (diagramas/ilustraciones), no imágenes de paciente → NO pasa por el redactor Presidio; la
 * anonimización (§10) vive solo en los flujos de paciente (bitácora/biblioteca/reportes).
 */

interface FirmarSubidaBody {
  ext: string;
}
interface LecturaBody {
  refs: string[];
}

@Controller('media/imagenes')
export class MediaImagenesController {
  constructor(private readonly svc: MediaImagenesService) {}

  @Post('firmar-subida')
  firmarSubida(@Body() b: FirmarSubidaBody) {
    if (!b || typeof b.ext !== 'string') throw new BadRequestException('Falta la extensión.');
    return this.svc.firmarSubida(b.ext);
  }

  @Post('firmar-lectura')
  firmarLectura(@Body() b: LecturaBody) {
    return this.svc.firmarLectura(b?.refs ?? []);
  }
}
