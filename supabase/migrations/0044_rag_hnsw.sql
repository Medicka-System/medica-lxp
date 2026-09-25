-- 0044 — RAG · índice HNSW en documentos_rag (reemplaza ivfflat). Solo esquema lxp;
-- no toca RLS ni CORA.
--
-- BUG que corrige: el índice ivfflat de 0008 se creó con la tabla VACÍA, así que no
-- tiene centroides entrenados. Las consultas `order by embedding <=> vec limit N`
-- (las de `buscarChunks` · §7A) usan el índice y devolvían 0 filas; sin `limit` hacían
-- seq scan y sí traían resultados. Resultado: el RAG semántico recuperaba NADA en
-- producción (degradaba a verdad estructurada sin avisar).
--
-- HNSW no requiere "entrenar" (se construye incrementalmente) y es correcto desde pocas
-- filas hasta escala; es el índice recomendado hoy para recuperación por similitud.

drop index if exists lxp.documentos_rag_embedding_idx;

create index documentos_rag_embedding_idx
  on lxp.documentos_rag using hnsw (embedding vector_cosine_ops);

comment on index lxp.documentos_rag_embedding_idx is
  'HNSW (cosine) para recuperación RAG de Eco. Reemplaza al ivfflat de 0008, que al '
  'construirse sobre tabla vacia rompía order-by-<=>-limit (0 filas).';
