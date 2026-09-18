import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { StorageService } from '../dicom/storage.service';
import { claveVideo } from './claves';
import type { ConfirmarVideo, SolicitarVideo } from './dto';
import {
  cargarVideo,
  insertarVideoProcesando,
  marcarVideoListo,
} from './media.repositorio';

/** Respuesta al solicitar la subida de un video. */
export interface SolicitudSubidaVideo {
  videotecaId: string;
  recursoRef: string;
  urlSubida: string;
}

/**
 * Servicio de media (§3/§9 · Sprint 6). Orquesta la subida directa de video a object
 * storage con URL firmada y su registro en la videoteca — NO proxya el binario
 * (Regla de Oro §2): el archivo va cliente → storage, nunca por el `api`. Reusa el
 * `StorageService` (SigV4) del Sprint 4.7; el `api` es el único firmante (§9).
 *
 * Flujo: solicitar (pre-registra fila `procesando` + firma PUT) → el cliente sube →
 * confirmar (marca `listo`). La reproducción firma un GET de vida corta.
 */
@Injectable()
export class MediaService {
  constructor(
    private readonly db: DbService,
    private readonly storage: StorageService,
  ) {}

  /** Pre-registra el video y firma su subida (PUT directo al storage). */
  async solicitarSubidaVideo(datos: SolicitarVideo): Promise<SolicitudSubidaVideo> {
    const fila = await insertarVideoProcesando(this.db.sql, datos);
    const recursoRef = claveVideo(fila.id);
    const urlSubida = this.storage.firmarSubida(recursoRef);
    return { videotecaId: fila.id, recursoRef, urlSubida };
  }

  /** Confirma que el binario ya está en storage y marca el video `listo`. */
  async confirmarVideo(
    videotecaId: string,
    datos: ConfirmarVideo,
  ): Promise<{ videotecaId: string; estado: string }> {
    const recursoRef = claveVideo(videotecaId);
    const fila = await marcarVideoListo(
      this.db.sql,
      videotecaId,
      recursoRef,
      datos.duracionSeg,
    );
    if (!fila) throw new NotFoundException(`Video ${videotecaId} no existe.`);
    return { videotecaId, estado: fila.estado };
  }

  /** Firma una URL de LECTURA de vida corta para reproducir un video `listo`. */
  async firmarReproduccion(
    videotecaId: string,
  ): Promise<{ videotecaId: string; urlReproduccion: string }> {
    const fila = await cargarVideo(this.db.sql, videotecaId);
    if (!fila) throw new NotFoundException(`Video ${videotecaId} no existe.`);
    if (fila.estado !== 'listo' || !fila.recurso_ref) {
      throw new ConflictException(
        `Video ${videotecaId} no está listo (estado ${fila.estado}).`,
      );
    }
    const urlReproduccion = this.storage.firmarLectura(fila.recurso_ref);
    return { videotecaId, urlReproduccion };
  }
}
