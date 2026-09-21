import { Injectable, Logger } from '@nestjs/common';
import {
  QUEUE_ECO_EVALUACION,
  QUEUE_INDEXAR_RAG,
  type EcoEvaluacionJob,
  type IndexarRagJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { TtsService } from '../tts/tts.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { EcoConfigService } from './config/eco-config.service';
import { ProveedorFactory } from './proveedores/proveedor.factory';
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
    private readonly tts: TtsService,
    private readonly config: EcoConfigService,
    private readonly proveedores: ProveedorFactory,
  ) {}

  // ── Encolado de jobs de fondo (los consume el worker · §8) ────────────────

  /** Encola la (re)indexación RAG de una fuente (caso/rúbrica/material). */
  encolarIndexacion(fuente: IndexarRagJob): Promise<string> {
    return this.colas.encolar(QUEUE_INDEXAR_RAG, fuente);
  }

  /**
   * Orquesta la narración TTS de un contenido de lección (course builder): Eco LEE
   * el texto del contenido y lo MANDA a renderizar con el adaptador de voz (§3). El
   * render corre asíncrono (cola `render-tts`); aquí solo se dispara. Devuelve el id
   * del audio pre-registrado (estado `procesando`).
   */
  async narrarContenido(
    contenidoId: string,
    opts?: { voz?: string; modelo?: string; velocidad?: number },
  ): Promise<{ audioId: string; estado: string } | null> {
    const rows = await this.db.sql<{ cuerpo: string | null; titulo: string | null }[]>`
      select cuerpo, titulo from lxp.contenidos where id = ${contenidoId}`;
    const texto = rows[0]?.cuerpo?.trim();
    if (!texto) {
      this.logger.warn(`narrarContenido: contenido ${contenidoId} sin texto que narrar.`);
      return null;
    }
    const r = await this.tts.solicitarRender({ texto, contenidoId, ...opts });
    this.logger.log(`Eco → TTS: contenido ${contenidoId} narrado como audio ${r.audioId}.`);
    return { audioId: r.audioId, estado: r.estado };
  }

  /** Encola el pre-análisis en lote de un grupo (bandeja del docente). */
  encolarEvaluacionLote(job: EcoEvaluacionJob): Promise<string> {
    return this.colas.encolar(QUEUE_ECO_EVALUACION, job);
  }

  /**
   * Gancho de Eco para PROPONER un examen de autoevaluación (course builder · §7A).
   * Reusa la infra de Eco (config editable + proveedor model-agnóstico); NO la
   * reconstruye. Eco PROPONE reactivos; el diseñador los revisa e importa — nada se
   * asienta aquí (§7A). Con el proveedor MOCK devuelve vacío + aviso (cablear modelo real).
   */
  async proponerExamen(p: {
    tema: string;
    cantidad?: number;
    dominio?: string;
  }): Promise<{ reactivos: ReactivoPropuesto[]; modelo: string; aviso?: string }> {
    const cfg = await this.config.activa();
    const proveedor = this.proveedores.obtener(cfg.modelos.juicio.proveedor);
    const cantidad = Math.min(Math.max(p.cantidad ?? 5, 1), 30);

    const resp = await proveedor.generar({
      system:
        'Eres Eco, asistente docente de una escuela de ultrasonido. Genera reactivos de ' +
        'autoevaluación clínicamente correctos. Responde SOLO JSON válido con la forma ' +
        '{"reactivos":[{"enunciado":string,"tipo":"opcion_multiple"|"multi"|"verdadero_falso",' +
        '"opciones":[{"clave":string,"texto":string}],"correcta":string|string[],"dominio":string}]}.',
      prompt:
        `Tema: ${p.tema}\nCantidad: ${cantidad}` +
        (p.dominio ? `\nDominio I-AIM: ${p.dominio}` : '') +
        '\nDevuelve exactamente ese JSON, sin texto adicional.',
      modelo: cfg.modelos.juicio.modelo,
      temperatura: cfg.temperatura,
      maxTokens: cfg.maxTokens,
    });

    const reactivos = parsearReactivosPropuestos(resp.texto);
    const salida: { reactivos: ReactivoPropuesto[]; modelo: string; aviso?: string } = {
      reactivos,
      modelo: resp.modelo,
    };
    if (reactivos.length === 0) {
      salida.aviso =
        'El proveedor no devolvió reactivos utilizables (¿MOCK?). Cablea un modelo real (§3).';
    }
    this.logger.log(`Eco propuso ${reactivos.length} reactivo(s) para "${p.tema}".`);
    return salida;
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
            leccionId: job.leccionId,
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

/** Reactivo PROPUESTO por Eco (borrador; el diseñador lo revisa e importa · §7A). */
export interface ReactivoPropuesto {
  enunciado: string;
  tipo: string;
  opciones: Array<{ clave: string; texto: string }>;
  correcta: string | string[];
  dominio?: string;
}

/** Extrae reactivos del JSON del modelo, tolerante a envoltura de texto o ```json```. */
export function parsearReactivosPropuestos(texto: string): ReactivoPropuesto[] {
  const limpio = texto.replace(/```json|```/gi, '').trim();
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio === -1 || fin === -1) return [];
  let obj: unknown;
  try {
    obj = JSON.parse(limpio.slice(inicio, fin + 1));
  } catch {
    return [];
  }
  const lista = (obj as { reactivos?: unknown }).reactivos;
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      enunciado: String(x.enunciado ?? '').trim(),
      tipo: String(x.tipo ?? 'opcion_multiple'),
      opciones: Array.isArray(x.opciones)
        ? (x.opciones as Array<Record<string, unknown>>).map((o) => ({
            clave: String(o.clave ?? ''),
            texto: String(o.texto ?? ''),
          }))
        : [],
      correcta: (x.correcta as string | string[]) ?? '',
      dominio: x.dominio ? String(x.dominio) : undefined,
    }))
    .filter((r) => r.enunciado.length > 0);
}
