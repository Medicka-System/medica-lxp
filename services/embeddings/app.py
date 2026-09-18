"""
Servicio de embeddings self-hosted · BGE-M3 (§3 · Sprint 5.3).

Único servicio no-TS del monorepo (§4): expone embeddings multilingües LOCALES para
el RAG de Eco. NO usamos una API de terceros (latencia · §3). Devuelve vectores de
1024 dimensiones (BGE-M3), que es lo que espera `lxp.documentos_rag (vector(1024))`.

Endpoints:
  GET  /health        → estado + si el modelo ya cargó
  POST /embed         → { "textos": [str, ...] } → { "embeddings": [[float]], "dim": 1024 }

El modelo se carga PEREZOSAMENTE en la primera petición /embed (arranque rápido; el
health responde aunque el modelo aún no esté en memoria). Config por entorno:
  EMBEDDINGS_MODEL   (default: BAAI/bge-m3)
  EMBEDDINGS_DEVICE  (default: cpu)
"""
from __future__ import annotations

import os
from threading import Lock
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MODEL_NAME = os.environ.get("EMBEDDINGS_MODEL", "BAAI/bge-m3")
DEVICE = os.environ.get("EMBEDDINGS_DEVICE", "cpu")
EXPECTED_DIM = 1024  # BGE-M3 · debe cuadrar con vector(1024) en pgvector

app = FastAPI(title="Campus LXP · Embeddings (BGE-M3)", version="1.0.0")

_model = None
_model_lock = Lock()


def _get_model():
    """Carga (una sola vez, thread-safe) el modelo de sentence-transformers."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                # Import diferido: no cargar torch/sentence-transformers al iniciar.
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer(MODEL_NAME, device=DEVICE)
    return _model


class EmbedRequest(BaseModel):
    textos: List[str] = Field(..., min_length=1)


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    modelo: str
    dim: int


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "modelo": MODEL_NAME,
        "cargado": _model is not None,
        "dim": EXPECTED_DIM,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    textos: Optional[List[str]] = req.textos
    if not textos:
        raise HTTPException(status_code=400, detail="`textos` no puede ir vacío")
    try:
        model = _get_model()
        vectores = model.encode(
            textos,
            normalize_embeddings=True,  # coseno ≈ producto punto; ideal para pgvector
            convert_to_numpy=True,
        )
    except Exception as exc:  # noqa: BLE001 — reportar claro al llamador (worker/api)
        raise HTTPException(status_code=500, detail=f"Fallo al embeber: {exc}") from exc

    embeddings = [v.tolist() for v in vectores]
    dim = len(embeddings[0]) if embeddings else EXPECTED_DIM
    return EmbedResponse(embeddings=embeddings, modelo=MODEL_NAME, dim=dim)
