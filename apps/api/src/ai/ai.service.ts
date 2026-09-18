import { Injectable, Logger } from '@nestjs/common';
import {
  QUEUE_ECO_EVALUACION,
  QUEUE_INDEXAR_RAG,
  type EcoEvaluacionJob,
  type IndexarRagJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { EvaluacionPipeline } from './pipeline/evaluacion.pipeline';
import { guardarPropuesta } from './pipeline/propuestas.repositorio';
import { recopilarCasos, recopilarEntregas } from './tools/recopilar.tool';
import { buscarChunks, verdadEstructurada } from './tools/rag.tool';
import type { ItemEvaluable, PropuestaEco } from './pipeline/tipos';

/** Resumen del lote pre-analizado por Eco (la bandeja del docente · §7A). */
export interface ResumenBandeja {
  grupoId: string;
  modo: 'entregas' | 'casos';
  total: number;
  listos: number;
  requierenCriterio: number;
  propuestas: Array<{ objetoId: string; clasificacion: string; nota: number | null }>;
}

/**
 * Fachada de Eco en el `api` (§4 `src/ai`). Orquesta el pipeline tools-first:
 * recopila (SQL) → enriquece con RAG → juzga (LLM vía pipeline) → deja propuestas
 * en la bandeja. También expone el encolado de los jobs de fondo (`indexar-rag`,
 * `eco-evaluacion`).
 *
 * NADA se asienta aquí (§7A): la bandeja son borradores; el docente confirma con
 * `CorreccionesService`.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
    private readonly embeddings: EmbeddingsService,
    private readonly pipeline: EvaluacionPipeline,
  ) {}

  // ── Encolado de jobs de fondo (los consume el worker · §8) ────────────────

  /** Encola la (re)indexación RAG de una fuente (caso/rúbrica/material). */
  encolarIndexacion(fuente: IndexarRagJob): Promise<string> {
    return this.colas.encolar(QUEUE_INDEXAR_RAG, fuente);
  }

  /** Encola el pre-análisis en lote de un grupo (bandeja del docente). */
  encolarEvaluacionLote(job: EcoEvaluacionJob): Promise<string> {
    return this.colas.encolar(QUEUE_ECO_EVALUACION, job);
  }

  // ── Pipeline en lote (lo dispara el worker `eco-evaluacion`) ───────────────

  /**
   * Pre-analiza un lote (entregas de una actividad o casos de un grupo) y deja las
   * propuestas en `lxp.eco_propuestas`, separadas por confianza. Devuelve el resumen
   * de la bandeja. Idempotente: re-correr reemplaza las propuestas vigentes.
   */
  async evaluarLote(job: EcoEvaluacionJob): Promise<ResumenBandeja> {
    const items =
      job.modo === 'entregas'
        ? await recopilarEntregas(this.db.sql, {
            grupoId: job.grupoId,
            actividadId: job.actividadId,
          })
        : await recopilarCasos(this.db.sql, { grupoId: job.grupoId });

    this.logger.log(
      `eco-evaluacion: ${items.length} ${job.modo} del grupo ${job.grupoId} a pre-analizar.`,
    );

    const propuestas: PropuestaEco[] = [];
    for (const item of items) {
      await this.enriquecerConRag(item);
      const propuesta = await this.pipeline.evaluar(item);
      await guardarPropuesta(this.db.sql, propuesta);
      propuestas.push(propuesta);
    }

    const listos = propuestas.filter((p) => p.clasificacion === 'listo').length;
    return {
      grupoId: job.grupoId,
      modo: job.modo,
      total: propuestas.length,
      listos,
      requierenCriterio: propuestas.length - listos,
      propuestas: propuestas.map((p) => ({
        objetoId: p.objetoId,
        clasificacion: p.clasificacion,
        nota: p.notaSugerida,
      })),
    };
  }

  /**
   * Tool RAG (§7A, paso 2): añade al ítem la VERDAD del caso y los chunks relevantes.
   * Dos vías: estructurada (SQL a `casos_biblioteca`) y semántica (pgvector). La
   * semántica es aditiva — si el servicio de embeddings no responde, seguimos con la
   * estructurada (RAG no bloquea la evaluación).
   */
  private async enriquecerConRag(item: ItemEvaluable): Promise<void> {
    const consulta = construirConsulta(item);

    // Vía estructurada: verdad curada por dominio/órgano (para casos, sobre todo).
    const r = item.respuesta as Record<string, unknown> | null;
    const dominio = (r?.dominio_iaim as string | undefined) ?? undefined;
    const organo = (r?.organo as string | undefined) ?? undefined;
    if (item.tipo === 'caso' || dominio || organo) {
      const verdades = await verdadEstructurada(this.db.sql, { dominio, organo });
      if (verdades.length) item.verdad = verdades;
    }

    // Vía semántica: chunks más cercanos (indexados por `indexar-rag`).
    try {
      const chunks = await buscarChunks(this.db.sql, this.embeddings, consulta, 5);
      if (chunks.length) {
        item.contextoRag = chunks.map((c) => ({
          fuenteTipo: c.fuenteTipo,
          fuenteId: c.fuenteId,
          chunk: c.chunk,
        }));
        // Si no hubo verdad estructurada, usa los chunks como verdad de contexto.
        if (!item.verdad) item.verdad = item.contextoRag.map((c) => c.chunk);
      }
    } catch (e) {
      this.logger.warn(
        `RAG semántico no disponible para ${item.id} (${(e as Error).message}); ` +
          'sigo con verdad estructurada.',
      );
    }
  }
}

/** Texto de consulta para el RAG a partir de la respuesta del alumno. */
function construirConsulta(item: ItemEvaluable): string {
  if (typeof item.respuesta === 'string') return item.respuesta;
  const r = item.respuesta as Record<string, unknown>;
  return [r?.organo, r?.dominio_iaim, r?.hallazgos, r?.diagnostico_presuntivo, r?.texto]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 2000);
}
