import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { MediaService, type SolicitudSubidaVideo } from './media.service';
import {
  confirmarVideoSchema,
  solicitarVideoSchema,
} from './dto';

/**
 * Media (§3/§9 · Sprint 6). Dominio/orquestación, no proxy de CRUD: firma URLs para
 * subir/servir video a object storage y registra la videoteca. El binario nunca pasa
 * por el `api`. El listado de la videoteca es CRUD simple → va web→Supabase (§2).
 */
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /** Firma la subida de un video y pre-registra su fila en la videoteca. */
  @Post('videos/solicitar')
  @HttpCode(200)
  solicitar(@Body() body: unknown): Promise<SolicitudSubidaVideo> {
    const parsed = solicitarVideoSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.media.solicitarSubidaVideo(parsed.data);
  }

  /** Confirma la subida (binario ya en storage) y marca el video `listo`. */
  @Post('videos/:id/confirmar')
  @HttpCode(200)
  confirmar(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ videotecaId: string; estado: string }> {
    const parsed = confirmarVideoSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.media.confirmarVideo(id, parsed.data);
  }

  /** Firma una URL de lectura de vida corta para reproducir el video. */
  @Post('videos/:id/reproducir')
  @HttpCode(200)
  reproducir(
    @Param('id') id: string,
  ): Promise<{ videotecaId: string; urlReproduccion: string }> {
    return this.media.firmarReproduccion(id);
  }
}
