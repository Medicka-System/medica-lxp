import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import type { EcoEvaluacionJob, IndexarRagJob } from '@campus/shared';
import {
  AiService,
  type ReactivoPropuesto,
  type ResumenBandeja,
} from './ai.service';
import {
  CorreccionesService,
  type ResultadoConfirmacion,
} from './correcciones/correcciones.service';
import { EcoConfigService } from './config/eco-config.service';
import {
  EcoChatService,
  type RespuestaChat,
  type TurnoChat,
} from './eco-chat/eco-chat.service';

/** Superficies soportadas por el chat de Eco (espejo de `SurfaceEco` del engine · §7A). */
const SURFACES_ECO = ['alumno', 'grupo', 'escuela'] as const;
type SurfaceEcoBody = (typeof SURFACES_ECO)[number];

interface EcoChatBody {
  surface?: SurfaceEcoBody;
  entidadId?: string;
  /** Quién pregunta (staff). Hoy en el body; en Sprint 11 saldrá del JWT (como todo /ai). */
  usuarioId?: string;
  mensajes?: TurnoChat[];
}

interface DispararBandejaBody {
  modo: 'entregas' | 'casos';
  /** Anclaje preferente por lección (modelo nuevo · mig 0023/0026). */
  leccionId?: string;
  /** Anclaje por actividad (modelo viejo, aún vivo). */
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
    private readonly chat: EcoChatService,
  ) {}

  /**
   * Eco CONVERSACIONAL (§7A) — el staff pregunta en lenguaje natural sobre una entidad
   * (hoy: el expediente de un alumno). Loop de tool-use: Eco trae datos con herramientas
   * (SQL bajo RLS / RAG) y responde SIN inventar. READ-ONLY: informa, no acciona.
   * Stateless: el historial llega en el body (no se persiste). Sin streaming en v1 (la
   * respuesta llega completa; la puerta SSE queda para después). `usuarioId` viaja hoy en
   * el cuerpo; en Sprint 11 saldrá del JWT (como el resto de /ai).
   */
  @Post('eco')
  @HttpCode(200)
  eco(@Body() body: EcoChatBody): Promise<RespuestaChat> {
    if (!body?.surface || !SURFACES_ECO.includes(body.surface)) {
      throw new BadRequestException(`surface debe ser uno de: ${SURFACES_ECO.join(', ')}`);
    }
    if (!body?.entidadId) throw new BadRequestException('entidadId es requerido');
    if (!body?.usuarioId) throw new BadRequestException('usuarioId es requerido');
    if (!Array.isArray(body?.mensajes) || body.mensajes.length === 0) {
      throw new BadRequestException('mensajes debe ser un arreglo no vacío');
    }
    return this.chat.responder({
      surface: body.surface,
      entidadId: body.entidadId,
      usuarioId: body.usuarioId,
      mensajes: body.mensajes,
    });
  }

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
      leccionId: body.leccionId,
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

  /**
   * Eco PROPONE un examen de autoevaluación (course builder · §7A). Devuelve
   * reactivos borrador; el diseñador los revisa e importa — nada se asienta aquí.
   */
  @Post('proponer-examen')
  @HttpCode(200)
  proponerExamen(
    @Body() body: { tema?: string; cantidad?: number; dominio?: string },
  ): Promise<{ reactivos: ReactivoPropuesto[]; modelo: string; aviso?: string }> {
    if (!body?.tema?.trim()) throw new BadRequestException('tema es requerido');
    return this.ai.proponerExamen({
      tema: body.tema,
      cantidad: body.cantidad,
      dominio: body.dominio,
    });
  }

  /** Eco orquesta la NARRACIÓN TTS del texto de un contenido de lección (§3/§7A). */
  @Post('narrar/:contenidoId')
  @HttpCode(202)
  narrar(
    @Param('contenidoId') contenidoId: string,
    @Body() body: { voz?: string; modelo?: string; velocidad?: number },
  ): Promise<{ audioId: string; estado: string } | null> {
    return this.ai.narrarContenido(contenidoId, body ?? {});
  }

  /** Súper admin editó la config → recargar cache en la próxima evaluación. */
  @Post('config/invalidar')
  @HttpCode(200)
  invalidarConfig(): { ok: true } {
    this.config.invalidar();
    return { ok: true };
  }
}
