import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import type { EcoEvaluacionJob, IndexarRagJob } from '@campus/shared';
import { AiService, type ResumenBandeja } from './ai.service';
import {
  CorreccionesService,
  type ResultadoConfirmacion,
} from './correcciones/correcciones.service';
import { EcoConfigService } from './config/eco-config.service';

interface DispararBandejaBody {
  modo: 'entregas' | 'casos';
  actividadId?: string;
}
interface ConfirmarBody {
  docenteId?: string;
  nota?: number | null;
  feedback?: string | null;
}
interface IndexarBody {
  fuenteTipo?: IndexarRagJob['fuenteTipo'];
  fuenteId?: string;
}

/**
 * API de Eco (§4 `src/ai` · §7A). Es dominio/orquestación (permitido en `api` · §2),
 * no proxy de CRUD: dispara el pipeline de IA, deja propuestas y asienta el cierre
 * humano. La LECTURA de la bandeja (para pintarla) va directa `web → Supabase` con
 * RLS. `docenteId` viaja hoy en el cuerpo; en Sprint 9 saldrá del JWT (como el resto).
 */
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly correcciones: CorreccionesService,
    private readonly config: EcoConfigService,
  ) {}

  /** Docente dispara el pre-análisis en lote → encola `eco-evaluacion` (worker). */
  @Post('bandeja/:grupoId')
  @HttpCode(202)
  async dispararBandeja(
    @Param('grupoId') grupoId: string,
    @Body() body: DispararBandejaBody,
  ): Promise<{ jobId: string }> {
    if (body?.modo !== 'entregas' && body?.modo !== 'casos') {
      throw new BadRequestException("modo debe ser 'entregas' o 'casos'");
    }
    const job: EcoEvaluacionJob = {
      grupoId,
      modo: body.modo,
      actividadId: body.actividadId,
    };
    const jobId = await this.ai.encolarEvaluacionLote(job);
    return { jobId };
  }

  /**
   * Ejecuta el lote SÍNCRONO y devuelve el resumen. Lo llama el worker
   * `eco-evaluacion` (que aporta el buffer/retry); útil también para probar el
   * pipeline de punta a punta sin worker.
   */
  @Post('lote')
  @HttpCode(200)
  evaluarLote(@Body() body: EcoEvaluacionJob): Promise<ResumenBandeja> {
    if (!body?.grupoId) throw new BadRequestException('grupoId es requerido');
    if (body.modo !== 'entregas' && body.modo !== 'casos') {
      throw new BadRequestException("modo debe ser 'entregas' o 'casos'");
    }
    return this.ai.evaluarLote(body);
  }

  /** Cierre humano: el docente CONFIRMA la propuesta (§7A). Asienta y registra. */
  @Post('propuestas/:propuestaId/confirmar')
  @HttpCode(200)
  confirmar(
    @Param('propuestaId') propuestaId: string,
    @Body() body: ConfirmarBody,
  ): Promise<ResultadoConfirmacion> {
    if (!body?.docenteId) throw new BadRequestException('docenteId es requerido');
    return this.correcciones.confirmar(propuestaId, body.docenteId, {
      nota: body.nota,
      feedback: body.feedback,
    });
  }

  /** El docente DESCARTA la propuesta (no asienta nada). */
  @Post('propuestas/:propuestaId/descartar')
  @HttpCode(200)
  async descartar(
    @Param('propuestaId') propuestaId: string,
    @Body() body: ConfirmarBody,
  ): Promise<{ ok: true }> {
    if (!body?.docenteId) throw new BadRequestException('docenteId es requerido');
    await this.correcciones.descartar(propuestaId, body.docenteId);
    return { ok: true };
  }

  /** Encola la (re)indexación RAG de una fuente (caso/rúbrica/material). */
  @Post('indexar')
  @HttpCode(202)
  async indexar(@Body() body: IndexarBody): Promise<{ jobId: string }> {
    if (!body?.fuenteTipo || !body?.fuenteId) {
      throw new BadRequestException('fuenteTipo y fuenteId son requeridos');
    }
    const jobId = await this.ai.encolarIndexacion({
      fuenteTipo: body.fuenteTipo,
      fuenteId: body.fuenteId,
    });
    return { jobId };
  }

  /** Súper admin editó la config → recargar cache en la próxima evaluación. */
  @Post('config/invalidar')
  @HttpCode(200)
  invalidarConfig(): { ok: true } {
    this.config.invalidar();
    return { ok: true };
  }
}
