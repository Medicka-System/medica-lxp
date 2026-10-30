import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QUEUE_INDEXAR_RAG, type IndexarRagJob } from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
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
  cargarLeccionIdsDePrograma,
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
  private readonly logger = new Logger(PublicacionService.name);

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {}

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
      // Al publicar, (re)indexa el CONTENIDO de cada lección para el RAG de Eco
      // (§7A · mismo mecanismo que `rubricas`: cola `indexar-rag`, payload
      // `{fuenteTipo:'contenido', fuenteId: leccionId}`). El worker es idempotente
      // (borra-y-reinserta por fuente), así que republicar no duplica. BEST-EFFORT:
      // si Redis no responde, se loguea y la publicación NO se cae (el índice se
      // pone al día en la próxima publicación).
      await this.indexarContenido(programaId);
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

  /**
   * Encola la (re)indexación RAG del contenido de teoría de cada lección del
   * programa (un job `indexar-rag` por lección, fuenteTipo `contenido`). Se llama
   * al publicar. BEST-EFFORT: envuelve el encolado para que un fallo de Redis no
   * tumbe la publicación — el contenido ya quedó publicado; la indexación es
   * asíncrona (§8) y se recupera en la próxima publicación.
   */
  private async indexarContenido(programaId: string): Promise<void> {
    try {
      const leccionIds = await cargarLeccionIdsDePrograma(this.db.sql, programaId);
      for (const leccionId of leccionIds) {
        const job: IndexarRagJob = { fuenteTipo: 'contenido', fuenteId: leccionId };
        await this.colas.encolar(QUEUE_INDEXAR_RAG, job);
      }
      this.logger.log(
        `Publicación ${programaId}: ${leccionIds.length} lección(es) encoladas a indexar-rag.`,
      );
    } catch (e) {
      this.logger.warn(
        `Publicación ${programaId}: no se pudo encolar la indexación RAG (no fatal): ${(e as Error).message}`,
      );
    }
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
