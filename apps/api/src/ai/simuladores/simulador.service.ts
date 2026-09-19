import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  QUEUE_PROGRAMAR_REPASO,
  actividad,
  actorDeUsuario,
  emitirStatement,
  verbo,
  type RepasoJob,
} from '@campus/shared';
import { DbService } from '../../db/db.service';
import { ColasProducer } from '../../colas/colas-producer';
import { XapiService } from '../../xapi/xapi.service';
import { EvaluacionPipeline } from '../pipeline/evaluacion.pipeline';
import type { ItemEvaluable } from '../pipeline/tipos';
import { mapearFeedback } from './simulador.mapper';
import {
  cargarCasoVerdad,
  guardarSesion,
} from './simulador.repositorio';
import {
  RUBRICA_INTERPRETACION,
  RUBRICA_REPORTE,
  UMBRAL_APROBACION_SIMULADOR,
  type CasoVerdad,
  type RespuestaInterpretacion,
  type RespuestaReporte,
  type ResultadoSesion,
  type SimuladorFeedback,
  type TipoSimulador,
} from './simulador.tipos';

/**
 * Lógica de SESIÓN de los simuladores IA (§7A · Sprint 7). EXTIENDE a Eco, no lo
 * reconstruye: reusa el `EvaluacionPipeline` (tools → Haiku condicional → Sonnet)
 * para juzgar la respuesta del alumno contra la VERDAD del caso curado. Corre en
 * MOCK por defecto (§7A) — enchufar el modelo real es cambiar la config, no el código.
 *
 * Flujo por sesión (interpretación o reporte):
 *   1. carga la verdad del caso (`casos_biblioteca` · tool, no LLM);
 *   2. arma el `ItemEvaluable` y lo pasa por el pipeline → propuesta;
 *   3. mapea la propuesta a feedback FORMATIVO (aciertos/omisiones/precisiones);
 *   4. registra la sesión (`sesiones_simulador`), emite xAPI y agenda repaso.
 *
 * Es PRÁCTICA, no evaluación oficial (§7A): nada se asienta en el expediente. El
 * xAPI usa `experimentó` (entrenamiento), no `aprobó/falló` (evaluación curricular),
 * para no contaminar la analítica de lo graded. El repaso espaciado se agenda vía el
 * worker `programar-repaso` (§8), reusando la infra existente.
 */
@Injectable()
export class SimuladorService {
  private readonly logger = new Logger(SimuladorService.name);

  constructor(
    private readonly db: DbService,
    private readonly pipeline: EvaluacionPipeline,
    private readonly xapi: XapiService,
    private readonly colas: ColasProducer,
  ) {}

  /** Sesión de INTERPRETACIÓN: el alumno lee el caso y da hallazgos + impresión. */
  async evaluarInterpretacion(
    alumnoId: string,
    casoId: string,
    respuesta: RespuestaInterpretacion,
  ): Promise<ResultadoSesion> {
    const caso = await this.cargarCaso(casoId);
    const item: ItemEvaluable = {
      tipo: 'caso',
      id: caso.id,
      alumnoId,
      // La "respuesta" del alumno en interpretación = hallazgos + impresión (como en bitácora).
      respuesta: {
        organo: caso.organo,
        dominio_iaim: caso.dominioIaim,
        hallazgos: respuesta.hallazgos,
        diagnostico_presuntivo: respuesta.impresion,
        seguridad: respuesta.seguridad,
      },
      verdad: verdadParaPrompt(caso),
      rubrica: RUBRICA_INTERPRETACION,
    };
    return this.evaluar(alumnoId, caso, 'interpretacion', respuesta, item);
  }

  /** Sesión de REPORTE: el alumno redacta el estudio y Eco revisa estructura/omisiones. */
  async evaluarReporte(
    alumnoId: string,
    casoId: string,
    respuesta: RespuestaReporte,
  ): Promise<ResultadoSesion> {
    const caso = await this.cargarCaso(casoId);
    const textoReporte = respuesta.secciones
      .map((s) => `## ${s.titulo}\n${s.texto}`.trim())
      .join('\n\n');
    const item: ItemEvaluable = {
      tipo: 'caso',
      id: caso.id,
      alumnoId,
      // Reporte = texto libre largo → el pipeline puede normalizar con Haiku (§7A).
      respuesta: {
        organo: caso.organo,
        dominio_iaim: caso.dominioIaim,
        texto: textoReporte,
        secciones: respuesta.secciones,
      },
      verdad: verdadParaPrompt(caso),
      rubrica: RUBRICA_REPORTE,
    };
    return this.evaluar(alumnoId, caso, 'reporte', respuesta, item);
  }

  // ── interno ────────────────────────────────────────────────────────────────

  private async cargarCaso(casoId: string): Promise<CasoVerdad> {
    const caso = await cargarCasoVerdad(this.db.sql, casoId);
    if (!caso) {
      throw new NotFoundException(
        `Caso ${casoId} no existe o no está publicado en la biblioteca.`,
      );
    }
    return caso;
  }

  /** Núcleo común: pipeline → feedback → registro → xAPI → repaso. */
  private async evaluar(
    alumnoId: string,
    caso: CasoVerdad,
    tipo: TipoSimulador,
    respuesta: unknown,
    item: ItemEvaluable,
  ): Promise<ResultadoSesion> {
    // Paso 2-5 de Eco (§7A): el pipeline juzga contra verdad + rúbrica (MOCK por defecto).
    const propuesta = await this.pipeline.evaluar(item);
    const feedback = mapearFeedback(propuesta, caso, tipo);

    // Registro del intento (service_role; el alumno lo lee bajo RLS · 0019).
    const { sesionId } = await guardarSesion(this.db.sql, {
      alumnoId,
      casoId: caso.id,
      tipo,
      dominioIaim: caso.dominioIaim,
      respuesta,
      evaluacion: feedback,
      puntaje: feedback.puntaje,
    });

    await this.emitirXapi(alumnoId, caso, feedback);
    const repasoJobId = await this.agendarRepaso(alumnoId, caso.dominioIaim);

    this.logger.log(
      `Simulador ${tipo}: sesión ${sesionId} del alumno ${alumnoId} sobre caso ${caso.id} ` +
        `(puntaje ${feedback.puntaje ?? 's/n'}, eco ${feedback.eco.mock ? 'MOCK' : feedback.eco.proveedor}).`,
    );
    return { sesionId, feedback, dominioIaim: caso.dominioIaim, repasoJobId };
  }

  /**
   * xAPI de la práctica (§7). Verbo `experimentó` (entrenamiento, no evaluación): el
   * alumno experimentó el caso y el dominio I-AIM, con su puntaje como score. El
   * store de eventos (LRS) es el registro de aprendizaje que alimenta la analítica de
   * competencia (§7); la proyección dura la sigue escribiendo el worker desde casos
   * aprobados (§8), no la práctica.
   */
  private async emitirXapi(
    alumnoId: string,
    caso: CasoVerdad,
    feedback: SimuladorFeedback,
  ): Promise<void> {
    const scaled =
      feedback.puntaje === null ? undefined : Math.max(0, Math.min(1, feedback.puntaje / 100));
    const result =
      scaled === undefined
        ? { completion: true, response: `simulador:${feedback.tipo}` }
        : {
            completion: true,
            success: (feedback.puntaje ?? 0) >= UMBRAL_APROBACION_SIMULADOR,
            score: { scaled },
            response: `simulador:${feedback.tipo}`,
          };

    await this.xapi.encolar(
      emitirStatement(
        actorDeUsuario(alumnoId),
        verbo('experimento'),
        actividad('caso', caso.id, caso.titulo),
        result,
      ),
    );

    if (caso.dominioIaim) {
      await this.xapi.encolar(
        emitirStatement(
          actorDeUsuario(alumnoId),
          verbo('experimento'),
          actividad('dominio_iaim', caso.dominioIaim),
          scaled === undefined ? undefined : { score: { scaled } },
        ),
      );
    }
  }

  /** Agenda el repaso espaciado del dominio practicado (§1/§8), si el caso lo trae. */
  private async agendarRepaso(
    alumnoId: string,
    dominioIaim: string | null,
  ): Promise<string | null> {
    if (!dominioIaim) return null;
    const job: RepasoJob = { alumnoId, dominio_iaim: dominioIaim };
    return this.colas.encolar(QUEUE_PROGRAMAR_REPASO, job);
  }
}

/** Verdad que se le muestra al modelo de juicio (sin el id interno). */
function verdadParaPrompt(caso: CasoVerdad): Record<string, unknown> {
  return {
    titulo: caso.titulo,
    organo: caso.organo,
    dominio_iaim: caso.dominioIaim,
    hallazgos_clave: caso.hallazgosClave,
    diagnostico_correcto: caso.diagnosticoCorrecto,
    errores_comunes: caso.erroresComunes,
  };
}
