import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { EntregasService } from './entregas.service';

interface SolicitarBody {
  leccionId?: string;
  alumnoId?: string;
  nombre?: string;
  tipo?: string;
}

interface LeerBody {
  key?: string;
}

/**
 * Adjuntos de entregas (§5C). Dominio/orquestación, no proxy de CRUD (§2): solo firma
 * la subida/lectura del binario contra object storage. La fila `lxp.entregas` la
 * escribe el `web` bajo RLS.
 */
@Controller('entregas/archivo')
export class EntregasController {
  constructor(private readonly entregas: EntregasService) {}

  /** Firma la subida directa del adjunto (el navegador del alumno sube con la URL). */
  @Post('solicitar')
  @HttpCode(200)
  solicitar(@Body() body: SolicitarBody = {}): { key: string; urlSubida: string } {
    return this.entregas.solicitarSubida({
      leccionId: body.leccionId,
      alumnoId: body.alumnoId,
      nombre: body.nombre,
    });
  }

  /** Firma una URL de lectura de vida corta para descargar/ver el adjunto. */
  @Post('leer')
  @HttpCode(200)
  leer(@Body() body: LeerBody = {}): { url: string } {
    return this.entregas.firmarLectura({ key: body.key });
  }
}
