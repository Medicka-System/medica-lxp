/**
 * Lectura de fuentes y upsert de chunks para el índice RAG (`lxp.documentos_rag`).
 * Lo consume el worker `indexar-rag` (§8, job #10): lee el TEXTO de la fuente
 * (verdad del caso, rúbrica, material), lo trocea, y el worker lo embebe y guarda.
 * Reindexar = borrar los chunks previos de la fuente + insertar los nuevos.
 */
import type { Sql } from '@campus/db';

/** Arma el texto indexable de una fuente. Cadena vacía si no hay nada que indexar. */
export async function leerTextoFuente(
  sql: Sql,
  fuenteTipo: string,
  fuenteId: string,
): Promise<string> {
  if (fuenteTipo === 'caso_biblioteca') {
    const rows = await sql<
      {
        titulo: string;
        organo: string | null;
        diagnostico_correcto: string | null;
        hallazgos_clave: unknown;
        puntos_aprendizaje: unknown;
        errores_comunes: unknown;
      }[]
    >`
      select titulo, organo, diagnostico_correcto,
             hallazgos_clave, puntos_aprendizaje, errores_comunes
      from lxp.casos_biblioteca
      where id = ${fuenteId}`;
    if (!rows[0]) return '';
    const c = rows[0];
    return [
      `Caso: ${c.titulo}`,
      c.organo ? `Órgano: ${c.organo}` : '',
      c.diagnostico_correcto ? `Diagnóstico correcto: ${c.diagnostico_correcto}` : '',
      `Hallazgos clave: ${aTexto(c.hallazgos_clave)}`,
      `Puntos de aprendizaje: ${aTexto(c.puntos_aprendizaje)}`,
      `Errores comunes: ${aTexto(c.errores_comunes)}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (fuenteTipo === 'rubrica') {
    const rows = await sql<{ criterios: unknown }[]>`
      select criterios from lxp.rubricas where id = ${fuenteId}`;
    if (!rows[0]) return '';
    return `Rúbrica:\n${aTexto(rows[0].criterios)}`;
  }

  // 'material' u otros: aún no soportado; el worker lo registra y sigue.
  return '';
}

/** Borra los chunks previos de una fuente (idempotencia del reindexado). */
export async function borrarChunksDe(
  sql: Sql,
  fuenteTipo: string,
  fuenteId: string,
): Promise<void> {
  await sql`
    delete from lxp.documentos_rag
    where fuente_tipo = ${fuenteTipo} and fuente_id = ${fuenteId}`;
}

/** Inserta un chunk con su embedding (literal pgvector) y metadatos. */
export async function insertarChunk(
  sql: Sql,
  p: {
    fuenteTipo: string;
    fuenteId: string;
    chunk: string;
    embeddingLiteral: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  await sql`
    insert into lxp.documentos_rag (fuente_tipo, fuente_id, chunk, embedding, metadata)
    values (
      ${p.fuenteTipo}, ${p.fuenteId}, ${p.chunk},
      ${p.embeddingLiteral}::vector, ${sql.json(p.metadata as never)}
    )`;
}

/** Serializa jsonb (arreglos/objetos) a texto legible para el índice. */
function aTexto(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('; ');
  return JSON.stringify(v);
}
