import { Module } from '@nestjs/common';
import { StorageService } from '../dicom/storage.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaImagenesController } from './media-imagenes.controller';
import { MediaImagenesService } from './media-imagenes.service';
import { MediaArchivosController } from './media-archivos.controller';
import { MediaArchivosService } from './media-archivos.service';
import { GifsController } from './gifs.controller';
import { GifsService } from './gifs.service';

/**
 * Media (§3/§9 · Sprint 6 + biblioteca §5C). Usa DbModule (global) y reusa
 * `StorageService` (SigV4 del Sprint 4.7) para firmar subida/lectura de video, de
 * imágenes de contenido y de documentos de la Biblioteca (PDF/Word/PPT) en object
 * storage. Contenido educativo → NO pasa por Presidio (§10, solo flujos de paciente).
 */
@Module({
  controllers: [MediaController, MediaImagenesController, MediaArchivosController, GifsController],
  providers: [MediaService, StorageService, MediaImagenesService, MediaArchivosService, GifsService],
})
export class MediaModule {}
