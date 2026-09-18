/**
 * Tool de RAG (§7A, paso 2: "recupera la verdad estructurada del caso y la rúbrica
 * — nunca un LLM"). Dos vías, ambas deterministas:
 *   1. Semántica: embebe la consulta (servicio BGE-M3) y busca por similitud coseno
 *      en `lxp.documentos_rag` (pgvector). Es lo que indexa el worker `indexar-rag`.
 *   2. Estructurada: trae la verdad del caso directo de `lxp.casos_biblioteca`
 *      (fallback exacto cuando el índice aún está vacío o el servicio no responde).
 *
 * El RAG "sustituye tamaño de modelo" (§7A): dar la verdad + rúbrica hace certero a
 * Sonnet sin necesitar Opus.
 */
import type { Sql } from '@campus/db';
import { EmbeddingsService } from '../embeddings/embeddings.service';

export interface ChunkRecuperado {
  fuenteTipo: string;
  fuenteId: string | null;
  chunk: string;
  /** Distancia coseno (0 = idéntico). Menor es más relevante. */
  distancia: number;
}

/** Verdad estructurada de un caso curado (§7A: hallazgos, dx, puntos, errores). */
export interface VerdadEstructurada {
  id: string;
  titulo: string;
  organo: string | null;
  dominio_iaim: string | null;
  hallazgos_clave: unknown;
  diagnostico_correcto: string | null;
  puntos_aprendizaje: unknown;
  errores_comunes: unknown;
}

/**
 * Búsqueda semántica en pgvector. Embebe `consulta` y devuelve los `k` chunks más
 * cercanos. Lanza si el servicio de embeddings no responde (el pipeline lo captura
 * y sigue con la verdad estructurada — RAG es aditivo, no bloqueante).
 */
export async function buscarChunks(
  sql: Sql,
  embeddings: EmbeddingsService,
  consulta: string,
  k = 5,
): Promise<ChunkRecuperado[]> {
  const vector = await embeddings.embeberUno(consulta);
  const literal = EmbeddingsService.aLiteralPg(vector);
  const rows = await sql<
    { fuente_tipo: string; fuente_id: string | null; chunk: string; distancia: number }[]
  >`
    select fuente_tipo,
           fuente_id,
           chunk,
           (embedding <=> ${literal}::vector) as distancia
    from lxp.documentos_rag
    where embedding is not null
    order by embedding <=> ${literal}::vector
    limit ${k}`;
  return rows.map((r) => ({
    fuenteTipo: r.fuente_tipo,
    fuenteId: r.fuente_id,
    chunk: r.chunk,
    distancia: Number(r.distancia),
  }));
}

/**
 * Verdad estructurada de casos curados que casan por dominio I-AIM y/u órgano.
 * Determinista (SQL), sin LLM: alimenta la evaluación aunque el índice RAG esté
 * vacío. Publicados únicamente.
 */
export async function verdadEstructurada(
  sql: Sql,
  filtro: { dominio?: string | null; organo?: string | null },
  limite = 3,
): Promise<VerdadEstructurada[]> {
  return sql<VerdadEstructurada[]>`
    select id, titulo, organo, dominio_iaim::text as dominio_iaim,
           hallazgos_clave, diagnostico_correcto, puntos_aprendizaje, errores_comunes
    from lxp.casos_biblioteca
    where publicado
      ${filtro.dominio ? sql`and dominio_iaim = ${filtro.dominio}::lxp.dominio_iaim` : sql``}
      ${filtro.organo ? sql`and organo = ${filtro.organo}` : sql``}
    order by updated_at desc
    limit ${limite}`;
}
