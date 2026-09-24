import { Module } from '@nestjs/common';
import { StorageService } from '../dicom/storage.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaImagenesController } from './media-imagenes.controller';
import { MediaImagenesService } from './media-imagenes.service';

/**
 * Media (§3/§9 · Sprint 6). Usa DbModule (global) y reusa `StorageService` (SigV4 del
 * Sprint 4.7) para firmar subida/lectura de video Y de imágenes de contenido (§5C/§10)
 * en object storage. Las imágenes de contenido pasan por el redactor Presidio (§10).
 */
@Module({
  controllers: [MediaController, MediaImagenesController],
  providers: [MediaService, StorageService, MediaImagenesService],
})
export class MediaModule {}
