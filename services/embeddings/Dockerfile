# Servicio de embeddings self-hosted · BGE-M3 (§3 · Sprint 5.3).
# Imagen CPU. El modelo se descarga en el primer /embed y se cachea en el volumen
# HF_HOME (montado en compose) para no rebajarlo en cada arranque.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models \
    EMBEDDINGS_MODEL=BAAI/bge-m3 \
    EMBEDDINGS_DEVICE=cpu

WORKDIR /app

# Dependencias del sistema mínimas para sentence-transformers/torch.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY app.py ./

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://localhost:8001/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
