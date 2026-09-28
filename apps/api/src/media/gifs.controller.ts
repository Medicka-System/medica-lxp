import { Controller, Get, Query } from '@nestjs/common';
import { GifsService } from './gifs.service';

/**
 * GIFs del Ateneo (§3). Proxy a Giphy con la key oculta en el `api` (GifsService).
 *   GET /media/gifs/trending      → tendencias (al abrir el picker)
 *   GET /media/gifs/buscar?q=...  → búsqueda (q vacío → tendencias)
 */
@Controller('media/gifs')
export class GifsController {
  constructor(private readonly svc: GifsService) {}

  @Get('trending')
  trending() {
    return this.svc.trending();
  }

  @Get('buscar')
  buscar(@Query('q') q?: string) {
    return this.svc.buscar(q ?? '');
  }
}
