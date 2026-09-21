import { Injectable } from '@nestjs/common';
import {
  actividad,
  actorDeUsuario,
  emitirStatement,
  verbo,
  type Result,
  type VerboClave,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { XapiService } from '../xapi/xapi.service';
import { upsertProgreso } from './players.repositorio';
import { interpretarCmi } from './scorm';
import type { Progreso, ScormCommit } from './dto';

/** Resultado de registrar progreso (incluye si se emitió statement al LRS). */
export interface ResultadoProgreso {
  alumnoId: string;
  contenidoId: string;
  porcentaje: number;
  completado: boolean;
  statementId?: string;
}

/**
 * Backend de players (§7 · Sprint 6). Registra el progreso de reproducción (video,
 * H5P, SCORM) y **reporta al LRS** vía xAPI cuando corresponde — eso justifica que viva
 * en el `api` y no como CRUD directo (§2): emitir al LRS no puede hacerlo el cliente.
 * H5P además emite su propio xAPI (vía POST /xapi/statements); SCORM no habla xAPI, por
 * eso aquí se traduce su CMI a un statement de completado/aprobado.
 */
@Injectable()
export class PlayersService {
  constructor(
    private readonly db: DbService,
    private readonly xapi: XapiService,
  ) {}

  /** Registra progreso genérico (video/H5P). Emite `completó` al completarse. */
  async registrarProgreso(p: Progreso): Promise<ResultadoProgreso> {
    const porcentaje = this.porcentajePorPosicion(p);
    await upsertProgreso(this.db.sql, {
      alumnoId: p.alumnoId,
      contenidoId: p.contenidoId,
      leccionId: p.leccionId,
      posicionSeg: p.posicionSeg,
      duracionSeg: p.duracionSeg,
      porcentaje,
      completado: p.completado,
    });

    let statementId: string | undefined;
    if (p.completado) {
      statementId = await this.emitir(p.alumnoId, p.contenidoId, 'completo', p.titulo, {
        completion: true,
      });
    }
    return {
      alumnoId: p.alumnoId,
      contenidoId: p.contenidoId,
      porcentaje,
      completado: p.completado,
      statementId,
    };
  }

  /**
   * Commit del runtime SCORM: interpreta el CMI, persiste el progreso (con el runtime
   * para reanudar) y emite el statement adecuado (`aprobó`/`falló`/`completó`).
   */
  async commitScorm(c: ScormCommit): Promise<ResultadoProgreso> {
    const v = interpretarCmi(c.cmi);
    await upsertProgreso(this.db.sql, {
      alumnoId: c.alumnoId,
      contenidoId: c.contenidoId,
      leccionId: c.leccionId,
      posicionSeg: 0,
      porcentaje: v.porcentaje,
      completado: v.completado,
      estadoScorm: c.cmi,
    });

    let clave: VerboClave | null = null;
    if (v.aprobado === true) clave = 'aprobo';
    else if (v.aprobado === false) clave = 'fallo';
    else if (v.completado) clave = 'completo';

    let statementId: string | undefined;
    if (clave) {
      const result: Result = {
        completion: v.completado,
        ...(v.aprobado !== null ? { success: v.aprobado } : {}),
        ...(v.scaled !== null ? { score: { scaled: v.scaled } } : {}),
      };
      statementId = await this.emitir(c.alumnoId, c.contenidoId, clave, c.titulo, result);
    }
    return {
      alumnoId: c.alumnoId,
      contenidoId: c.contenidoId,
      porcentaje: v.porcentaje,
      completado: v.completado,
      statementId,
    };
  }

  /** Deriva el porcentaje por posición/duración (si no hay duración, usa completado). */
  private porcentajePorPosicion(p: Progreso): number {
    if (p.completado) return 100;
    if (p.duracionSeg && p.duracionSeg > 0) {
      return Math.max(0, Math.min(100, Math.round((p.posicionSeg / p.duracionSeg) * 100)));
    }
    return 0;
  }

  /** Encola un statement xAPI (actor alumno, actividad lección) y devuelve su id. */
  private async emitir(
    alumnoId: string,
    contenidoId: string,
    clave: VerboClave,
    titulo: string | undefined,
    result: Result,
  ): Promise<string | undefined> {
    const stmt = emitirStatement(
      actorDeUsuario(alumnoId),
      verbo(clave),
      actividad('leccion', contenidoId, titulo),
      result,
    );
    await this.xapi.encolar(stmt);
    return stmt.id;
  }
}
