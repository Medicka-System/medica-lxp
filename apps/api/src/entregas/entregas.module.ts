import { Module } from '@nestjs/common';
import { EntregasController } from './entregas.controller';
import { EntregasService } from './entregas.service';
import { StorageService } from '../dicom/storage.service';

/**
 * Adjuntos de entregas de tareas (§5C). Reusa `StorageService` (firmante S3 · §3). El
 * servicio es sin estado (lee env), así que se provee aquí directamente.
 */
@Module({
  controllers: [EntregasController],
  providers: [EntregasService, StorageService],
})
export class EntregasModule {}
