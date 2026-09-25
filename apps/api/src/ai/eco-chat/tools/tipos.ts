/**
 * Contratos del REGISTRO de herramientas de Eco conversacional (§7A). Una tool es una
 * pieza DETERMINISTA (SQL / RAG) que el modelo puede pedir para traer datos o contexto
 * — nunca un LLM dentro de una tool. El engine (`EcoChatService`) las ofrece al modelo,
 * ejecuta las que pida y le devuelve el resultado (loop tool-use).
 *
 * DOBLE CANDADO (§10): antes de ejecutar, el engine valida que el rol del usuario esté
 * en `rolesPermitidos`; además la tool corre bajo RLS impersonando al usuario
 * (`DbService.comoUsuario`), así la BD filtra por fila. Read-only hoy; `requiereConfirmacion`
 * queda RESERVADO para action-tools futuras (Eco propone; el humano decide · §7A).
 */
import type { Sql } from '@campus/db';
import type { EmbeddingsService } from '../../embeddings/embeddings.service';

/** Roles de plataforma LXP (§5B/§10). */
export type RolLxp =
  | 'super_admin'
  | 'admin'
  | 'docente'
  | 'disenador_instruccional'
  | 'alumno';

/**
 * Superficie desde la que se invoca el chat (§7A · roadmap de surfaces). Cada surface
 * fija QUÉ entidad está en foco (ver `CtxTool.entidadId`):
 *  - `alumno`  → expediente de un alumno (entidadId = alumnoId).
 *  - `grupo`   → seguimiento de un grupo (entidadId = grupoId de `lxp.grupos`).
 *  - `escuela` → panorama global de la escuela (entidadId = centinela `'escuela'`, sin id).
 */
export type SurfaceEco = 'alumno' | 'grupo' | 'escuela';

/** Una fuente citable que la tool devuelve, para pintarla en la UI (transparencia · §7A). */
export interface FuenteCitada {
  tipo: string;
  id?: string | null;
  titulo?: string;
  /** Distancia coseno si vino del RAG (menor = más relevante). */
  distancia?: number;
}

/** Resultado de ejecutar una tool: texto para el modelo + fuentes para la UI. */
export interface ResultadoTool {
  /** Texto/JSON que vuelve al modelo como `tool_result`. */
  contenido: string;
  /** Fuentes citables (opcional). */
  fuentes?: FuenteCitada[];
}

/** Dependencias que el engine inyecta a la tool (además del `sql` ya impersonado). */
export interface DepsTool {
  embeddings: EmbeddingsService;
}

/** Contexto de ejecución: `sql` YA impersonado (RLS activa) + la entidad de la surface. */
export interface CtxTool {
  /** Conexión impersonando al usuario (RLS filtra por rol/fila). */
  sql: Sql;
  usuarioId: string;
  rol: RolLxp;
  surface: SurfaceEco;
  /** Entidad de la surface: `alumnoId` (alumno) · `grupoId` (grupo) · `'escuela'` (escuela). */
  entidadId: string;
}

/** Definición de una herramienta del registro. */
export interface ToolDef {
  nombre: string;
  descripcion: string;
  /** JSON Schema del input (Anthropic `input_schema`). `{}` = sin parámetros. */
  schema: Record<string, unknown>;
  /** Superficies en las que aplica esta tool (el engine la ofrece solo en ellas). */
  surfaces: SurfaceEco[];
  /** Roles que pueden usarla (doble candado, además de la RLS). */
  rolesPermitidos: RolLxp[];
  /** READ-ONLY en esta fase. */
  readonly: true;
  /** RESERVADO para action-tools (no usado hoy): exigiría confirmación humana antes de actuar. */
  requiereConfirmacion?: boolean;
  ejecutar(
    ctx: CtxTool,
    input: Record<string, unknown>,
    deps: DepsTool,
  ): Promise<ResultadoTool>;
}
