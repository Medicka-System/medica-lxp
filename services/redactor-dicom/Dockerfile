# Redactor de PII quemada en píxeles DICOM (§10 · Presidio). Imagen CPU, ON-PREM.
# OCR = Tesseract (con datos en español + inglés); NER = spaCy es_core_news_lg (baked
# en la imagen, sin descarga en runtime). El worker `procesar-dicom` lo llama por HTTP.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    REDACTOR_SPACY_MODEL=es_core_news_lg \
    REDACTOR_OCR_LANG=spa+eng \
    REDACTOR_SCORE=0.4

WORKDIR /app

# Tesseract OCR + datos de idioma (spa/eng), curl para el healthcheck, y libGL/glib
# que exige el opencv que arrastra presidio-image-redactor. Esas mismas libs (libgl1/
# libglib2.0-0) cubren los wheels manylinux de python-gdcm/pylibjpeg (decodificadores de
# pixel-data DICOM comprimido · §10) — no requieren system-deps adicionales.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt \
    && python -m spacy download es_core_news_lg

COPY app.py ./

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://localhost:8002/health || exit 1

# Varios workers de PROCESO (concurrencia real para el OCR, que es CPU-bound y bloqueante):
# cada worker precarga su modelo (warm start). Nº por REDACTOR_WORKERS (default 3). `exec`
# reemplaza al shell → uvicorn recibe las señales (shutdown limpio).
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port 8002 --workers ${REDACTOR_WORKERS:-3}"]
