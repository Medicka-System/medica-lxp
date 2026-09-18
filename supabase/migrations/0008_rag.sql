-- ═══════════════════════════════════════════════════════════════════════════
-- 0008 · Eco / RAG (§6/§7A)
-- documentos_rag (+ embedding vector · pgvector) · eco_correcciones (loop de mejora)
--
-- Embeddings self-hosted BGE-M3 → 1024 dimensiones (§3). El indexado es asíncrono
-- (worker `indexar-rag` · §8): chunk → embedding → upsert aquí.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── documentos_rag: chunks indexados para recuperación (verdad de casos, rúbricas, material) ──
create table lxp.documentos_rag (
  id            uuid primary key default gen_random_uuid(),
  -- Origen del chunk (caso de biblioteca, rúbrica, material) para trazar/actualizar.
  fuente_tipo   text not null,        -- 'caso_biblioteca' | 'rubrica' | 'material' | ...
  fuente_id     uuid,
  chunk         text not null,
  embedding     vector(1024),         -- BGE-M3
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index documentos_rag_fuente_idx on lxp.documentos_rag (fuente_tipo, fuente_id);

-- Índice ANN para búsqueda por similitud coseno (se llena cuando haya datos).
create index documentos_rag_embedding_idx
  on lxp.documentos_rag
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ── eco_correcciones: cada corrección docente→Eco (§7A, loop de mejora) ──
create table lxp.eco_correcciones (
  id             uuid primary key default gen_random_uuid(),
  id_docente     uuid not null references lxp.perfiles(user_id) on delete cascade,
  -- A qué objeto aplicaba la sugerencia (entrega, caso, etc.).
  objeto_tipo    text not null,       -- 'entrega' | 'caso' | 'reporte' | ...
  objeto_id      uuid,
  sugerencia_eco jsonb not null default '{}'::jsonb,   -- lo que Eco propuso
  correccion     jsonb not null default '{}'::jsonb,   -- lo que el docente dejó
  created_at     timestamptz not null default now()
);

create index eco_correcciones_docente_idx on lxp.eco_correcciones (id_docente);
