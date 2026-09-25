import { Module } from '@nestjs/common';
import { ReportesImagenesController } from './reportes-imagenes.controller';
import { ReportesImagenesService } from './reportes-imagenes.service';
import { ReportesCasoController } from './reportes-caso.controller';
import { ReportesCasoService } from './reportes-caso.service';
import { ReportesPdfService } from './reportes-pdf.service';
import { StorageService } from '../dicom/storage.service';

/**
 * Reportes clínicos (§6.5): galería de imágenes + puente reporte→caso educativo (§10) + PDF.
 * Reusa el firmante S3 (StorageService); DbService/ColasProducer son globales.
 */
@Module({
  controllers: [ReportesImagenesController, ReportesCasoController],
  providers: [ReportesImagenesService, ReportesCasoService, ReportesPdfService, StorageService],
})
export class ReportesModule {}
