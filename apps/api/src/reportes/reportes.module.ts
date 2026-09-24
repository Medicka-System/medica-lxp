import { Module } from '@nestjs/common';
import { ReportesImagenesController } from './reportes-imagenes.controller';
import { ReportesImagenesService } from './reportes-imagenes.service';
import { ReportesCasoController } from './reportes-caso.controller';
import { ReportesCasoService } from './reportes-caso.service';
import { StorageService } from '../dicom/storage.service';

/**
 * Reportes clínicos (§6.5): galería de imágenes + puente reporte→caso educativo (§10).
 * Reusa el firmante S3 (StorageService); DbService/ColasProducer son globales.
 */
@Module({
  controllers: [ReportesImagenesController, ReportesCasoController],
  providers: [ReportesImagenesService, ReportesCasoService, StorageService],
})
export class ReportesModule {}
