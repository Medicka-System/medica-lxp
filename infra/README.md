# infra — stack local (Docker Compose)

`docker-compose.yml` levanta el stack de desarrollo: `postgres` (pgvector), `redis`,
`minio` (+ `createbuckets`), `lrs`, `embeddings`, `redactor-dicom`, `api`, `worker`.

## ⚠️ Tras cambios en el `api` (o el `worker`): **reconstruir la imagen**

Los contenedores `api`/`worker` corren un **build baked** (`node dist/main.js`), no montan
el código fuente. Si cambias código de `apps/api` o `apps/worker` (rutas nuevas, servicios,
env), **un simple `restart` NO basta** — seguiría sirviendo el binario viejo. Reconstruye:

```bash
docker compose up -d --build api
docker compose up -d --build api worker   # si tocaste ambos
```

Síntoma de imagen vieja: una ruta que existe en el código responde **404** (no está montada
en el binario en ejecución), o falta una env var que sí está en el compose.

## Storage endpoint (MinIO) — host vs interno

MinIO se publica en `localhost:9000` (host) y es `minio:9000` dentro de la red Docker.
`STORAGE_ENDPOINT` define el host que el `api` pone en las **URLs firmadas**. Ojo: el `api`
firma URLs que consumen TRES actores con vistas de red distintas — el **navegador** (host →
`localhost:9000`), el **worker** (contenedor → `minio:9000`) y el **propio api** en el
`/procesar` de imágenes de reporte (contenedor → `minio:9000`). Ver el bloque `api`/`worker`
del compose para la config vigente.
