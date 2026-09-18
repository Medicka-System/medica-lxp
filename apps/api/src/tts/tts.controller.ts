import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  TtsService,
  type EstadoAudioResultado,
  type SolicitudRenderResultado,
} from './tts.service';
import { solicitarTtsSchema } from './dto';

/**
 * TTS (course builder). Dominio/orquestación, NO proxy de CRUD (§2): sintetiza voz
 * con un adaptador intercambiable y guarda el audio en object storage. El `/render`
 * lo invoca el worker `render-tts` (buffer/retry), no el cliente.
 */
@Controller('tts')
export class TtsController {
  constructor(private readonly tts: TtsService) {}

  /** Solicita la síntesis de un texto → encola el render y devuelve el id del audio. */
  @Post()
  @HttpCode(202)
  solicitar(@Body() body: unknown): Promise<SolicitudRenderResultado> {
    const parsed = solicitarTtsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.tts.solicitarRender(parsed.data);
  }

  /** Dispara el render (interno · lo llama el worker `render-tts`). */
  @Post(':id/render')
  @HttpCode(200)
  render(@Param('id') id: string): Promise<{ audioId: string; estado: string }> {
    return this.tts.render(id);
  }

  /** Estado del audio + URL de reproducción firmada si ya está `listo`. */
  @Get(':id')
  estado(@Param('id') id: string): Promise<EstadoAudioResultado> {
    return this.tts.estado(id);
  }
}
