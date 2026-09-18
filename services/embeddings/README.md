# services/embeddings — BGE-M3 self-hosted (§3 · Sprint 5.3)

Servicio de embeddings **multilingües local** para el RAG de Eco. Único servicio
no-TS del monorepo (§4). No usa API de terceros (latencia · §3). Devuelve vectores de
**1024 dimensiones** (BGE-M3), que es lo que espera `lxp.documentos_rag (vector(1024))`.

## API

- `GET /health` → `{ status, modelo, cargado, dim }`
- `POST /embed` → body `{ "textos": ["...", "..."] }` → `{ "embeddings": [[...]], "modelo, dim }`

Los vectores salen **normalizados** (coseno ≈ producto punto), ideal para el índice
`vector_cosine_ops` de pgvector.

## Quién lo consume

- **worker `indexar-rag`** (§8, job #10): chunk → `POST /embed` → upsert en pgvector.
- **api `EmbeddingsService`** (Eco RAG · retrieve): embebe la consulta para buscar por
  similitud coseno en `lxp.documentos_rag`.

Ambos apuntan a `EMBEDDINGS_URL` (default `http://localhost:8001`; en compose
`http://embeddings:8001`).

## Local

```bash
# Con Docker (recomendado; el modelo se cachea en el volumen HF_HOME):
docker compose -f infra/docker-compose.yml up -d embeddings

# Sin Docker:
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001
```

> La primera petición `/embed` descarga el modelo (~2 GB) y lo carga en memoria; por
> eso `/health` responde aunque el modelo aún no esté cargado (`cargado: false`).

## Config (env)

| Variable            | Default        | Nota                         |
|---------------------|----------------|------------------------------|
| `EMBEDDINGS_MODEL`  | `BAAI/bge-m3`  | Modelo de sentence-transformers |
| `EMBEDDINGS_DEVICE` | `cpu`          | `cuda` en VPS con GPU        |
