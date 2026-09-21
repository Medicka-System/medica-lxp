import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  actividad,
  actorDeUsuario,
  calificarAutoevaluacion,
  emitirStatement,
  scorePorDominioAutoeval,
  verbo,
  type RespuestasAutoeval,
  type ResultadoAutoeval,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { XapiService } from '../xapi/xapi.service';
import {
  asegurarActividadAutoeval,
  cargarLeccionAutoeval,
  registrarEntregaAutoeval,
} from './autoevaluacion.repositorio';

/** Resultado de calificar: el agregado + la traza de persistencia. */
export interface ResultadoCalificacion extends ResultadoAutoeval {
  leccionId: string;
  entregaId: string;
  /** `calificada` (todo objetivo) o `enviada` (hay abiertas por revisar). */
  estado: 'calificada' | 'enviada';
}

/**
 * MOTOR de respuesta de la autoevaluación (§7A · §2). NO es proxy de CRUD: al recibir
 * las respuestas del alumno dispara side-effects de dominio que solo pueden vivir en
 * el `api`:
 *   1. Autocalifica lo objetivo con la herramienta determinista (paso 3 del pipeline
 *      de Eco · §7A) — nunca un LLM.
 *   2. Persiste la entrega (nota objetiva + respuestas). Lo ABIERTO queda `enviada`
 *      para que el docente lo revise después (§5B/§7A · «Eco propone, el humano decide»).
 *   3. Registra la señal de aprendizaje en el LRS vía xAPI (§7): `completó` la lección
 *      y `experimentó` cada dominio I-AIM tocado, con su score. La PROYECCIÓN
 *      `competencia_dominios` la recalcula el worker #4 SOLO desde casos aprobados
 *      (§8), así que aquí NO se encola un recálculo (sería no-op): la autoevaluación
 *      aporta competencia a través del LRS, que es el store de registro (§7).
 */
@Injectable()
export class AutoevaluacionService {
  private readonly logger = new Logger(AutoevaluacionService.name);

  constructor(
    private readonly db: DbService,
    private readonly xapi: XapiService,
  ) {}

  async calificar(params: {
    leccionId: string;
    alumnoId: string;
    respuestas: RespuestasAutoeval;
  }): Promise<ResultadoCalificacion> {
    const { leccionId, alumnoId, respuestas } = params;

    const lec = await cargarLeccionAutoeval(this.db.sql, leccionId);
    if (!lec) throw new NotFoundException(`La lección ${leccionId} no existe.`);
    if (lec.tipo !== 'autoevaluacion') {
      throw new BadRequestException('La lección no es de tipo autoevaluación.');
    }
    if (lec.reactivos.length === 0) {
      throw new BadRequestException('La autoevaluación no tiene reactivos.');
    }

    // 1 · Autocalificación determinista (tool · §7A).
    const resultado = calificarAutoevaluacion(lec.reactivos, respuestas);

    // 2 · Persistencia de la entrega (ancla por lección + actividad de respaldo).
    const actividadId = await asegurarActividadAutoeval(
      this.db.sql,
      leccionId,
      lec.actividadId,
      `Autoevaluación · ${lec.nombre}`,
    );
    const estado: 'calificada' | 'enviada' =
      resultado.abiertas > 0 ? 'enviada' : 'calificada';
    // Nota 0..10 de la parte objetiva (redondeada a 2 decimales · numeric(5,2)).
    const nota =
      resultado.escalado !== null
        ? Math.round(resultado.escalado * 1000) / 100
        : null;
    const entregaId = await registrarEntregaAutoeval(this.db.sql, {
      actividadId,
      leccionId,
      alumnoId,
      contenido: {
        respuestas,
        resumen: {
          objetivas: resultado.objetivas,
          correctas: resultado.correctas,
          abiertas: resultado.abiertas,
          puntajeObtenido: resultado.puntajeObtenido,
          puntajeMax: resultado.puntajeMax,
          escalado: resultado.escalado,
          aprobado: resultado.aprobado,
        },
      },
      nota,
      estado,
    });

    // 3 · Señal al LRS (xAPI · §7). Best-effort de dominio: si el LRS/cola fallara,
    // la entrega ya quedó guardada; no romper la respuesta del alumno por eso.
    await this.emitirSenales(alumnoId, leccionId, lec.reactivos, resultado);

    this.logger.log(
      `Autoeval ${leccionId} de ${alumnoId}: ${resultado.correctas}/${resultado.objetivas} objetivas, ${resultado.abiertas} abierta(s) → ${estado}.`,
    );

    return { ...resultado, leccionId, entregaId, estado };
  }

  private async emitirSenales(
    alumnoId: string,
    leccionId: string,
    reactivos: Parameters<typeof scorePorDominioAutoeval>[0],
    resultado: ResultadoAutoeval,
  ): Promise<void> {
    const clamp = (n: number): number => Math.max(0, Math.min(1, n));
    try {
      // `completó` la lección (con score/success si hubo objetivas).
      await this.xapi.encolar(
        emitirStatement(
          actorDeUsuario(alumnoId),
          verbo('completo'),
          actividad('leccion', leccionId),
          {
            completion: true,
            ...(resultado.escalado !== null
              ? { score: { scaled: clamp(resultado.escalado) }, success: resultado.aprobado }
              : {}),
          },
        ),
      );
      // `experimentó` cada dominio I-AIM tocado (igual que el worker de competencia).
      for (const d of scorePorDominioAutoeval(reactivos, resultado.resultados)) {
        await this.xapi.encolar(
          emitirStatement(
            actorDeUsuario(alumnoId),
            verbo('experimento'),
            actividad('dominio_iaim', d.dominio),
            { score: { scaled: clamp(d.escalado) } },
          ),
        );
      }
    } catch (err) {
      this.logger.warn(
        `No se pudo encolar xAPI de la autoeval ${leccionId} (${(err as Error).message}). La entrega ya se guardó.`,
      );
    }
  }
}
