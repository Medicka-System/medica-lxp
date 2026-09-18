/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PENDIENTE DE DB + PENDIENTE DE API — Biblioteca de Contenido reutilizable (§5B)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El esquema actual NO tiene tabla de biblioteca reutilizable. Hay:
 *   • lxp.contenidos      → bloques POR LECCIÓN (leccion_id NOT NULL), no un acervo.
 *   • lxp.recursos_docente→ almacén PERSONAL del docente (otro concepto, RLS propia).
 * La biblioteca de Contenido (un recurso se sube UNA vez y N lecciones lo REFERENCIAN,
 * con "dónde se usa", versiones y transcodificación) necesita infraestructura nueva:
 *
 * ── PENDIENTE DE DB (migración, fuera de apps/web) ──
 *   create table lxp.recursos (
 *     id           uuid pk default gen_random_uuid(),
 *     tipo         lxp.recurso_tipo not null,   -- video|h5p|scorm|xapi|pdf|word|ppt|imagen
 *     nombre       text not null,
 *     storage_key  text,                          -- object storage / Stream uid / paquete
 *     meta         jsonb not null default '{}',   -- {peso, duracion, resolucion, paginas, ...}
 *     reproduccion text,                           -- 'Cloudflare Stream'|'Reporta progreso'|...
 *     etiquetas    text[] not null default '{}',
 *     version      integer not null default 1,
 *     procesando   boolean not null default false, -- video transcodificando en Stream
 *     progreso     integer,                          -- % de transcodificación
 *     created_by   uuid references lxp.perfiles(user_id),
 *     created_at   timestamptz not null default now(),
 *     updated_at   timestamptz not null default now()
 *   );
 *   -- Enlace de referencia (lo que da "dónde se usa" y "reemplazar en todas"):
 *   alter table lxp.contenidos add column recurso_id uuid references lxp.recursos(id);
 *   -- RLS: select authenticated · write lxp.es_autoria() (igual que contenidos).
 *
 * ── PENDIENTE DE API (dominio/worker; el pipeline no cabe en el cliente · §2/§8) ──
 *   POST   /studio/recursos            → URL firmada de subida; video→Cloudflare Stream
 *                                        (estado procesando), scorm/xapi→descomprime y
 *                                        registra, ofimático→visor. Devuelve Recurso.
 *   POST   /studio/recursos/:id/reemplazar → nueva VERSIÓN del archivo; se sirve en TODAS
 *                                        las lecciones que lo referencian (sin copiar).
 *   DELETE /studio/recursos/:id        → bloquea/avisa si usos>0.
 *   PATCH  /studio/recursos/:id        → renombrar/etiquetar (simple; será server action
 *                                        directa web→Supabase cuando exista lxp.recursos).
 *
 * Mientras no exista la tabla, `getRecursos`/`getRecursoDetalle` degradan con
 * `pendienteDb: true` (la relación no existe → 42P01) y la UI muestra el aviso.
 */

export type TipoRecurso = 'video' | 'h5p' | 'scorm' | 'xapi' | 'pdf' | 'word' | 'ppt' | 'imagen';

/** Los tres ofimáticos se filtran juntos como "Documentos". */
export type FamiliaFiltro = 'todos' | 'video' | 'h5p' | 'scorm' | 'xapi' | 'documentos' | 'imagen';

export const ES_DOCUMENTO: TipoRecurso[] = ['pdf', 'word', 'ppt'];

export type Recurso = {
  id: string;
  tipo: TipoRecurso;
  nombre: string;
  meta: string;
  peso?: string;
  reproduccion?: string;
  fecha: Date;
  usos: number;
  programas: number;
  etiquetas: string[];
  procesando?: boolean;
  progreso?: number;
};

export type UsoRecurso = {
  id: string;
  programa: string;
  version: number;
  ruta: string;
  estadoLeccion: 'publicada' | 'borrador';
};

export type VersionArchivo = { id: string; etiqueta: string; nota: string; fecha: Date; actual?: boolean };

export type RecursoDetalle = {
  id: string;
  tipo: TipoRecurso;
  nombre: string;
  reproduccion?: string;
  duracion?: string;
  metadatos: { etiqueta: string; valor: string }[];
  etiquetas: string[];
  usos: UsoRecurso[];
  versiones: VersionArchivo[];
};
