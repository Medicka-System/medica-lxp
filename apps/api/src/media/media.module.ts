import { Module } from '@nestjs/common';
import { StorageService } from '../dicom/storage.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

/**
 * Media (§3/§9 · Sprint 6). Usa DbModule (global) y reusa `StorageService` (SigV4 del
 * Sprint 4.7) para firmar subida/lectura de video en object storage.
 */
@Module({
  controllers: [MediaController],
  providers: [MediaService, StorageService],
})
export class MediaModule {}
