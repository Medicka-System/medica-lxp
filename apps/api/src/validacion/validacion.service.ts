import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  actividad,
  actorDeUsuario,
  emitirStatement,
  verbo,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { CompetenciaService } from '../competencia/competencia.service';
import { XapiService } from '../xapi/xapi.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import {
  cargarCasoValidacion,
  promoverCasoABanco,
  registrarValidacion,
  type DecisionValidacion,
} from './validacion.repositorio';

/** Resultado de asentar una validación. */
export interface ResultadoValidacion {
  validacionId: string;
  casoId: string;
  alumnoId: string;
  decision: DecisionValidacion;
  /** Id del job de recálculo de competencia (solo al aprobar). */
  competenciaJobId?: string;
  /** Caso curado creado/ligado en el banco "por curar" (solo al aprobar · §5B puente). */
  casoBancoId?: string;
}

/**
 * Flujo de VALIDACIÓN del docente (§5B/§7A · Sprint 5) — el pivote del loop de
 * práctica. NO es proxy de CRUD (§2): asentar la decisión dispara side-effects de
 * dominio (competencia + xAPI), que solo pueden vivir aquí.
 *
 * Eco propone, el humano decide (§7A): esta es la CONFIRMACIÓN humana; nada se
 * asienta sin el docente. Al APROBAR se recalcula competencia (motor Sprint 3) y se
 * emite xAPI (capa Sprint 2). Al RECHAZAR se registra la decisión y se emite `falló`,
 * pero no se recalcula competencia (solo los casos aprobados suman · §8 job #4).
 */
@Injectable()
export class ValidacionService {
  private readonly logger = new Logger(ValidacionService.name);

  constructor(
    private readonly db: DbService,
    private readonly competencia: CompetenciaService,
    private readonly xapi: XapiService,
    private readonly notif: NotificacionesService,
  ) {}

  /** El docente aprueba el caso: dispara competencia + xAPI. */
  aprobar(
    casoId: string,
    docenteId: string,
    feedback?: string,
    correccionSobreEco?: unknown,
  ): Promise<ResultadoValidacion> {
    return this.validar(casoId, docenteId, 'aprobado', feedback, correccionSobreEco);
  }

  /** El docente rechaza el caso con feedback: registra la decisión, sin competencia. */
  rechazar(
    casoId: string,
    docenteId: string,
    feedback?: string,
    correccionSobreEco?: unknown,
  ): Promise<ResultadoValidacion> {
    return this.validar(casoId, docenteId, 'rechazado', feedback, correccionSobreEco);
  }

  private async validar(
    casoId: string,
    docenteId: string,
    decision: DecisionValidacion,
    feedback?: string,
    correccionSobreEco?: unknown,
  ): Promise<ResultadoValidacion> {
    const caso = await cargarCasoValidacion(this.db.sql, casoId);
    if (!caso) throw new NotFoundException(`Caso ${casoId} no existe.`);

    // Asienta la decisión (estado del caso + fila de validación) atómicamente.
    const { validacionId } = await registrarValidacion(this.db.sql, {
      casoId,
      docenteId,
      decision,
      feedback,
      correccionSobreEco,
    });

    // xAPI: el docente VALIDÓ el caso (siempre, aprobado o rechazado · §7).
    await this.xapi.encolar(
      emitirStatement(
        actorDeUsuario(docenteId),
        verbo('valido'),
        actividad('caso', casoId),
        { success: decision === 'aprobado' },
      ),
    );

    if (decision === 'aprobado') {
      // xAPI: el alumno APROBÓ su caso.
      await this.xapi.encolar(
        emitirStatement(
          actorDeUsuario(caso.id_alumno),
          verbo('aprobo'),
          actividad('caso', casoId),
          { success: true, completion: true },
        ),
      );
      // Dominio: recalcula la competencia del alumno (motor Sprint 3, vía cola).
      const competenciaJobId = await this.competencia.recalcular(caso.id_alumno);
      // Puente bitácora→banco (§5B): el caso aprobado entra al banco curado "por curar",
      // arrastrando su verdad estructurada + estudio anonimizado. No debe tumbar la
      // validación si falla (el caso ya quedó aprobado): se registra y se sigue.
      let casoBancoId: string | undefined;
      try {
        const banco = await promoverCasoABanco(this.db.sql, casoId);
        casoBancoId = banco.casoBancoId || undefined;
        this.logger.log(
          `Caso ${casoId} promovido al banco (${casoBancoId ?? 'sin id'}, ${banco.creado ? 'nuevo' : 'ya existía'}).`,
        );
      } catch (e) {
        this.logger.error(`No se pudo promover el caso ${casoId} al banco: ${String(e)}`);
      }
      // Notifica al alumno que su caso fue aprobado (§8 job #12).
      await this.notif.encolar({
        userId: caso.id_alumno,
        tipo: 'caso_validado',
        entidadTipo: 'caso',
        entidadId: casoId,
      });
      this.logger.log(
        `Caso ${casoId} aprobado por ${docenteId}: competencia encolada (${competenciaJobId}).`,
      );
      return {
        validacionId,
        casoId,
        alumnoId: caso.id_alumno,
        decision,
        competenciaJobId,
        casoBancoId,
      };
    }

    // xAPI: el alumno FALLÓ (caso rechazado). No suma competencia.
    await this.xapi.encolar(
      emitirStatement(
        actorDeUsuario(caso.id_alumno),
        verbo('fallo'),
        actividad('caso', casoId),
        { success: false },
      ),
    );
    // Notifica al alumno que su caso necesita ajustes (§8 job #12).
    await this.notif.encolar({
      userId: caso.id_alumno,
      tipo: 'caso_rechazado',
      entidadTipo: 'caso',
      entidadId: casoId,
      datos: feedback ? { feedback } : undefined,
    });
    this.logger.log(`Caso ${casoId} rechazado por ${docenteId}.`);
    return { validacionId, casoId, alumnoId: caso.id_alumno, decision };
  }
}
