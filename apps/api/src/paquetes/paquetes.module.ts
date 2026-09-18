import { Module } from '@nestjs/common';
import { StorageService } from '../dicom/storage.service';
import { PaquetesController } from './paquetes.controller';
import { PaquetesService } from './paquetes.service';

/**
 * Ingesta de paquetes SCORM/xAPI (§7 · course builder). `DbService` es global; se
 * provee el servicio y el `StorageService` (firma la subida del .zip a object storage).
 */
@Module({
  controllers: [PaquetesController],
  providers: [PaquetesService, StorageService],
})
export class PaquetesModule {}
