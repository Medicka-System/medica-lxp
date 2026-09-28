import { Body, Controller, Header, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportesCasoService } from './reportes-caso.service';
import {
  ReportesPdfService,
  type ImagenDicomReporte,
  type ImagenGaleriaDicomReporte,
} from './reportes-pdf.service';

/**
 * Puente reporte → caso educativo (§6/§10) + generación del PDF del reporte (§6.5). El web
 * (tras gatear propiedad del reporte bajo RLS) dispara estas operaciones de dominio.
 */
@Controller('reportes')
export class ReportesCasoController {
  constructor(
    private readonly svc: ReportesCasoService,
    private readonly pdf: ReportesPdfService,
  ) {}

  @Post(':id/generar-caso')
  generarCaso(
    @Param('id') id: string,
    @Body() body: { vineta?: string; presuntivo?: string },
  ) {
    // Bloque pedagógico OBLIGATORIO (§6): el caso nace con viñeta + diagnóstico presuntivo
    // (nunca NULL). El web ya los captura en el modal del puente; el service revalida.
    return this.svc.generarCaso(id, body?.vineta ?? '', body?.presuntivo ?? '');
  }

  /**
   * PDF del reporte (DOMINIO §2). Body: `{ userId, imagenesDicom:[{campoId,pngBase64}] }` — el
   * userId es el candado de propiedad (id_medico) y los PNG son las imágenes DICOM que el cliente
   * rasterizó del visor. Devuelve los bytes del PDF.
   */
  @Post(':id/pdf')
  @Header('content-type', 'application/pdf')
  async generarPdf(
    @Param('id') id: string,
    @Body()
    body: {
      userId?: string;
      imagenesDicom?: ImagenDicomReporte[];
      imagenesGaleriaDicom?: ImagenGaleriaDicomReporte[];
    },
    @Res() res: Response,
  ) {
    const bytes = await this.pdf.generar(
      id,
      body.userId ?? '',
      body.imagenesDicom ?? [],
      body.imagenesGaleriaDicom ?? [],
    );
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', 'inline');
    res.end(Buffer.from(bytes));
  }
}
