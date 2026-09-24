import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { MediaImagenesService } from './media-imagenes.service';

/**
 * Puente de las IMÁGENES de contenido del course builder (§5C · §10). El web (tras gatear
 * autoría con `requireAutoria`, staff) firma la subida, dispara la redacción Presidio (§10)
 * y firma la lectura. El binario nunca pasa por el `api` salvo el instante de redactar (§2).
 */

interface FirmarSubidaBody {
  ext: string;
}
interface ProcesarBody {
  id: string;
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

  @Post('procesar')
  procesar(@Body() b: ProcesarBody) {
    if (!b || typeof b.id !== 'string' || typeof b.ext !== 'string') {
      throw new BadRequestException('Faltan id/ext.');
    }
    return this.svc.procesar(b.id, b.ext);
  }

  @Post('firmar-lectura')
  firmarLectura(@Body() b: LecturaBody) {
    return this.svc.firmarLectura(b?.refs ?? []);
  }
}
