import { Module } from '@nestjs/common';
import { StorageService } from '../dicom/storage.service';
import { ClasesController } from './clases.controller';
import { ZoomWebhookController } from './zoom-webhook.controller';
import { ClasesService } from './clases.service';
import { ZoomService } from './zoom.service';

/**
 * Clases en vivo + webhook de Zoom (§9 · Sprint 6). Usa DbModule y ColasModule
 * (globales) y reusa `StorageService` para firmar la subida de grabaciones.
 */
@Module({
  controllers: [ClasesController, ZoomWebhookController],
  providers: [ClasesService, ZoomService, StorageService],
})
export class ClasesModule {}
