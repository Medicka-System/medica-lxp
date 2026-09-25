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

  // Teoría de una lección (fuenteId = leccion_id): arma el texto de sus bloques
  // (`lxp.bloques.config`) con el contexto de programa · módulo · lección (§7A · RAG).
  if (fuenteTipo === 'contenido') {
    const rows = await sql<
      { nombre: string; modulo: string | null; programa: string | null; tipo_bloque: string; config: unknown }[]
    >`
      select l.nombre, m.nombre as modulo, pr.nombre as programa, b.tipo_bloque, b.config
      from lxp.bloques b
      join lxp.lecciones l on l.id = b.leccion_id
      left join lxp.modulos m on m.id = l.modulo_id
      left join lxp.programas pr on pr.id = m.programa_id
      where b.leccion_id = ${fuenteId}
      order by b.orden`;
    if (!rows[0]) return '';
    const cabecera = [rows[0].programa, rows[0].modulo, rows[0].nombre].filter(Boolean).join(' · ');
    const cuerpo = rows
      .map((r) => textoDeBloque(r.tipo_bloque, r.config))
      .filter(Boolean)
      .join('\n\n');
    return cuerpo ? `Lección: ${cabecera}\n\n${cuerpo}` : '';
  }

  // 'material' u otros: aún no soportado; el worker lo registra y sigue.
  return '';
}

/** Texto indexable de un bloque de teoría según su tipo (HTML sin etiquetas, o rótulos). */
function textoDeBloque(_tipo: string, config: unknown): string {
  const c = (config ?? {}) as Record<string, unknown>;
  if (typeof c.html === 'string' && c.html.trim()) return quitarHtml(c.html);
  return [c.titulo, c.pie, c.alt, c.descripcion]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(' — ');
}

/** Quita etiquetas HTML y normaliza espacios (para indexar solo el texto legible). */
function quitarHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
