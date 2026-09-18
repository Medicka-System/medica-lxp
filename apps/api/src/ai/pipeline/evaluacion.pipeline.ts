import { Injectable, Logger } from '@nestjs/common';
import { EcoConfigService } from '../config/eco-config.service';
import { ProveedorFactory } from '../proveedores/proveedor.factory';
import { esAutoCalificable, autoCalificar } from '../tools/autocalificacion.tool';
import {
  juicioSchema,
  type ItemEvaluable,
  type Juicio,
  type PropuestaEco,
} from './tipos';

/** Umbral (caracteres de texto libre) sobre el que conviene normalizar con Haiku. */
export const UMBRAL_TEXTO_LIBRE = 400;

/**
 * Pipeline de evaluación de Eco (§7A) — TOOLS PRIMERO, LLM al final. Recibe un
 * `ItemEvaluable` ya recopilado (SQL) y enriquecido (RAG), y produce una
 * `PropuestaEco` (BORRADOR). El orden es la regla de oro de Eco:
 *
 *   1-2. tools (SQL + RAG)                → los hace el llamador (AiService), no aquí.
 *   3.   auto-calificación (tool, puro)   → si es objetivo, NO se llama a ningún LLM.
 *   4.   Haiku CONDICIONAL                → solo si hay texto libre que normalizar.
 *   5.   Sonnet (juicio)                  → compara contra verdad+rúbrica, propone.
 *   6.   propuesta + clasificación        → por umbral de confianza (config).
 *
 * NADA se asienta aquí: la confirmación humana vive en `CorreccionesService` (§7A).
 * Qué modelo usa cada paso y con qué parámetros sale de `lxp.eco_config` — nada
 * hardcodeado.
 */
@Injectable()
export class EvaluacionPipeline {
  private readonly logger = new Logger(EvaluacionPipeline.name);

  constructor(
    private readonly config: EcoConfigService,
    private readonly proveedores: ProveedorFactory,
  ) {}

  async evaluar(item: ItemEvaluable): Promise<PropuestaEco> {
    const cfg = await this.config.activa();
    const pasos: string[] = ['recopilar', 'rag'];
    const fuentesRag = (item.contextoRag ?? []).map((c) => ({
      fuenteTipo: c.fuenteTipo,
      fuenteId: c.fuenteId,
    }));

    // ── Paso 3 · Auto-calificación objetiva (tool). Tools primero: sin LLM. ──
    if (esAutoCalificable(item)) {
      const r = autoCalificar(item.respuesta, item.claveObjetiva!);
      pasos.push('autocalificacion');
      this.logger.log(`Ítem ${item.id} auto-calificado (${r.aciertos}/${r.total}) sin LLM.`);
      return {
        objetoTipo: item.tipo,
        objetoId: item.id,
        alumnoId: item.alumnoId,
        grupoId: item.grupoId,
        notaSugerida: r.nota,
        feedbackBorrador:
          `Autoevaluación calificada automáticamente: ${r.aciertos} de ${r.total} correctas.`,
        // Lo objetivo es certeza → alta confianza, "listo para confirmar".
        confianza: 1,
        clasificacion: 'listo',
        detalle: {
          pasos,
          autoCalificado: true,
          normalizadoConHaiku: false,
          criterios: r.porPregunta.map((p) => ({
            criterio: p.pregunta,
            puntaje: p.correcta ? 100 : 0,
          })),
          fuentesRag,
        },
      };
    }

    // ── Paso 4 · Haiku CONDICIONAL: normaliza texto libre desordenado. ──
    let respuestaParaJuicio: unknown = item.respuesta;
    let normalizadoConHaiku = false;
    if (requiereNormalizacion(item)) {
      const clasificador = this.proveedores.obtener(cfg.modelos.clasificador.proveedor);
      const resp = await clasificador.generar({
        system:
          'Normaliza la respuesta del alumno a campos comparables y concisos ' +
          '(hallazgos, mediciones, impresión). No evalúes; solo estructura.',
        prompt: JSON.stringify(item.respuesta),
        modelo: cfg.modelos.clasificador.modelo,
        temperatura: cfg.temperatura,
        maxTokens: cfg.maxTokens,
      });
      respuestaParaJuicio = resp.texto;
      normalizadoConHaiku = true;
      pasos.push(`haiku:${resp.proveedor}`);
    }

    // ── Paso 5 · Sonnet: el juicio contra verdad + rúbrica. ──
    const juez = this.proveedores.obtener(cfg.modelos.juicio.proveedor);
    const { texto: userPrompt } = await this.config.renderizarUserPrompt({
      verdad: item.verdad ?? '(sin verdad estructurada recuperada)',
      rubrica: item.rubrica ?? [],
      respuesta: respuestaParaJuicio,
    });
    const resp = await juez.generar({
      system: cfg.systemPrompt,
      prompt: userPrompt,
      modelo: cfg.modelos.juicio.modelo,
      temperatura: cfg.temperatura,
      maxTokens: cfg.maxTokens,
    });
    pasos.push(`sonnet:${resp.proveedor}`);

    // ── Paso 6 · Propuesta (borrador) + clasificación por umbral. ──
    const juicio = parsearJuicio(resp.texto);
    if (!juicio) {
      this.logger.warn(`Ítem ${item.id}: juicio no parseable; marcado requiere_criterio.`);
      return {
        objetoTipo: item.tipo,
        objetoId: item.id,
        alumnoId: item.alumnoId,
        grupoId: item.grupoId,
        notaSugerida: null,
        feedbackBorrador: 'Eco no pudo estructurar una evaluación; requiere criterio del docente.',
        confianza: 0,
        clasificacion: 'requiere_criterio',
        detalle: {
          pasos,
          proveedor: resp.proveedor,
          modelo: resp.modelo,
          autoCalificado: false,
          normalizadoConHaiku,
          fuentesRag,
          juicioCrudo: resp.texto.slice(0, 2000),
        },
      };
    }

    const clasificacion =
      juicio.confianza >= cfg.umbralConfianza ? 'listo' : 'requiere_criterio';

    return {
      objetoTipo: item.tipo,
      objetoId: item.id,
      alumnoId: item.alumnoId,
      grupoId: item.grupoId,
      notaSugerida: juicio.nota_sugerida,
      feedbackBorrador: juicio.feedback_borrador,
      confianza: juicio.confianza,
      clasificacion,
      detalle: {
        pasos,
        proveedor: resp.proveedor,
        modelo: resp.modelo,
        autoCalificado: false,
        normalizadoConHaiku,
        criterios: juicio.criterios,
        omisiones: juicio.omisiones,
        fuentesRag,
      },
    };
  }
}

/**
 * ¿La respuesta trae texto libre desordenado que conviene normalizar con Haiku
 * antes del juicio? (§7A: "solo si hay texto libre desordenado… si ya viene
 * estructurada, este paso se salta"). Puro y determinista.
 */
export function requiereNormalizacion(item: ItemEvaluable): boolean {
  const libre = textoLibreMasLargo(item.respuesta);
  return libre > UMBRAL_TEXTO_LIBRE;
}

/** Longitud del campo de texto más largo dentro de la respuesta. */
function textoLibreMasLargo(respuesta: unknown): number {
  if (typeof respuesta === 'string') return respuesta.length;
  if (!respuesta || typeof respuesta !== 'object') return 0;
  let max = 0;
  for (const v of Object.values(respuesta as Record<string, unknown>)) {
    if (typeof v === 'string') max = Math.max(max, v.length);
  }
  return max;
}

/** Parsea el JSON de juicio del LLM (tolerante a ```json fences). `null` si falla. */
export function parsearJuicio(texto: string): Juicio | null {
  const json = extraerJson(texto);
  if (!json) return null;
  try {
    const parsed = juicioSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function extraerJson(texto: string): string | null {
  const sinFences = texto.replace(/```(?:json)?/gi, '').trim();
  const inicio = sinFences.indexOf('{');
  const fin = sinFences.lastIndexOf('}');
  if (inicio === -1 || fin === -1 || fin <= inicio) return null;
  return sinFences.slice(inicio, fin + 1);
}
