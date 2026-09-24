import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { MediaArchivosService } from './media-archivos.service';

/**
 * Puente de los DOCUMENTOS de la Biblioteca de Contenido (PDF/Word/PowerPoint · §5C).
 * El web (tras gatear autoría con `requireAutoria`, staff) firma la subida DIRECTA y la
 * lectura. Es CONTENIDO educativo, no de paciente → NO pasa por Presidio (§10). Mismo
 * patrón que MediaImagenesController.
 */

interface FirmarSubidaBody {
  ext: string;
}
interface LecturaBody {
  refs: string[];
}

@Controller('media/archivos')
export class MediaArchivosController {
  constructor(private readonly svc: MediaArchivosService) {}

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
