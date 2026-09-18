import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import {
  accionesPosibles,
  esVisibleParaAlumno,
  requiereNuevaVersion,
  requiereSnapshot,
  transicionar,
  TransicionInvalidaError,
  type AccionPublicacion,
  type EstadoPublicacion,
} from './versionado.logic';
import {
  cambiarEstadoSimple,
  cargarEstado,
  cargarHistorial,
  cargarSnapshot,
  construirSnapshot,
  publicarConSnapshot,
  type VersionMeta,
} from './publicacion.repositorio';

/** Resultado de una transición de publicación. */
export interface ResultadoTransicion {
  programa_id: string;
  estado_anterior: EstadoPublicacion;
  estado: EstadoPublicacion;
  version: number;
  /** Se congeló un snapshot en esta transición (publicar). */
  versionada: boolean;
  visible_para_alumno: boolean;
}

/**
 * Dominio de la publicación con versionado (§2/§5B · Sprint 4.5). Orquesta la
 * máquina de estados y el congelado de versiones (cómputo + transacción, no CRUD):
 * publicar produce un snapshot inmutable; un borrador queda invisible para alumnos
 * (RLS). La edición del árbol (módulos/lecciones) va directa `web → Supabase`.
 */
@Injectable()
export class PublicacionService {
  constructor(private readonly db: DbService) {}

  /** Estado actual + acciones que el Studio puede ofrecer. */
  async estado(programaId: string): Promise<{
    programa_id: string;
    nombre: string;
    estado: EstadoPublicacion;
    version: number;
    acciones: AccionPublicacion[];
    visible_para_alumno: boolean;
  }> {
    const prog = await cargarEstado(this.db.sql, programaId);
    if (!prog) throw new NotFoundException(`Programa ${programaId} no existe.`);
    return {
      programa_id: prog.id,
      nombre: prog.nombre,
      estado: prog.estado,
      version: prog.version,
      acciones: accionesPosibles(prog.estado),
      visible_para_alumno: esVisibleParaAlumno(prog.estado),
    };
  }

  /**
   * Aplica una transición de publicación. Valida contra la máquina de estados
   * (transición inválida → 409). Al publicar congela un snapshot de la versión
   * vigente; al reabrir/reactivar abre la siguiente versión de trabajo.
   */
  async transicionar(
    programaId: string,
    accion: AccionPublicacion,
    opts: { actorId?: string | null; notas?: string | null } = {},
  ): Promise<ResultadoTransicion> {
    const prog = await cargarEstado(this.db.sql, programaId);
    if (!prog) throw new NotFoundException(`Programa ${programaId} no existe.`);

    let destino: EstadoPublicacion;
    try {
      destino = transicionar(prog.estado, accion);
    } catch (e) {
      if (e instanceof TransicionInvalidaError) {
        throw new ConflictException(e.message);
      }
      throw e;
    }

    let versionFinal = prog.version;
    if (requiereSnapshot(accion)) {
      // Congela el árbol vigente en la versión actual y marca 'publicado'.
      const snapshot = await construirSnapshot(this.db.sql, programaId);
      await publicarConSnapshot(this.db.sql, {
        programaId,
        version: prog.version,
        snapshot,
        notas: opts.notas ?? null,
        actorId: opts.actorId ?? null,
      });
    } else if (requiereNuevaVersion(accion)) {
      versionFinal = prog.version + 1;
      await cambiarEstadoSimple(this.db.sql, programaId, destino, versionFinal);
    } else {
      await cambiarEstadoSimple(this.db.sql, programaId, destino, null);
    }

    return {
      programa_id: programaId,
      estado_anterior: prog.estado,
      estado: destino,
      version: versionFinal,
      versionada: requiereSnapshot(accion),
      visible_para_alumno: esVisibleParaAlumno(destino),
    };
  }

  /** Historial de versiones publicadas (metadatos, sin el snapshot). */
  async historial(programaId: string): Promise<VersionMeta[]> {
    const prog = await cargarEstado(this.db.sql, programaId);
    if (!prog) throw new NotFoundException(`Programa ${programaId} no existe.`);
    return cargarHistorial(this.db.sql, programaId);
  }

  /** Snapshot congelado de una versión concreta (para vista previa/auditoría). */
  async snapshot(programaId: string, version: number): Promise<unknown> {
    const snap = await cargarSnapshot(this.db.sql, programaId, version);
    if (snap === null) {
      throw new NotFoundException(
        `No existe la versión ${version} del programa ${programaId}.`,
      );
    }
    return snap;
  }
}
