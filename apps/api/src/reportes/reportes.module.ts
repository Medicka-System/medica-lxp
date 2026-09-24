import { Module } from '@nestjs/common';
import { ReportesImagenesController } from './reportes-imagenes.controller';
import { ReportesImagenesService } from './reportes-imagenes.service';
import { StorageService } from '../dicom/storage.service';

/** Imágenes de la galería del reporte clínico (§6.5). Reusa el firmante S3 (StorageService). */
@Module({
  controllers: [ReportesImagenesController],
  providers: [ReportesImagenesService, StorageService],
})
export class ReportesModule {}
