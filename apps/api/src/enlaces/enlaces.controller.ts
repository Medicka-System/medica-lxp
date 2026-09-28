import { Controller, Get, Query } from '@nestjs/common';
import { EnlacesService } from './enlaces.service';

/**
 * Unfurl de enlaces del Ateneo (§1). El fetch va SERVER-SIDE con guard SSRF
 * (EnlacesService). Falla suave: si algo no cumple, `enlace` = null y el
 * composer no muestra tarjeta (nunca rompe la publicación).
 *   GET /enlaces/unfurl?url=... → { enlace: {url,titulo,descripcion,imagen,sitio} | null }
 */
@Controller('enlaces')
export class EnlacesController {
  constructor(private readonly svc: EnlacesService) {}

  @Get('unfurl')
  async unfurl(@Query('url') url?: string) {
    return { enlace: url ? await this.svc.unfurl(url) : null };
  }
}
