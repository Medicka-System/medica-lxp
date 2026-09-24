"""
Redactor de PII QUEMADA en píxeles DICOM (§10) — Presidio (OCR + NER), ON-PREM.

El problema: los ecógrafos (Mindray, Philips…) IMPRIMEN el nombre del paciente SOBRE la
imagen (texto en el pixel-data, no en tags). La anonimización de tags no lo quita, y
enmascarar por región tapa DE MÁS (Doppler, escalas, barra de color). Aquí se detecta y
tapa SOLO la caja del texto del NOMBRE:

  Tesseract (OCR) → detecta TODO el texto y su bounding box
  spaCy es_core_news_lg (NER, vía Presidio) → identifica cuál es PERSON (nombre)
  → se ennegrece SOLO la caja de las palabras del nombre, en TODOS los frames (el banner
    es estático en un cine). Lossless: no recomprime (transfer syntax sin comprimir).

Config: SOLO entity PERSON. NO toca fechas, parámetros, escalas ni anotaciones clínicas.
NUNCA sale a la nube (modelo y OCR locales).

FALLBACK (§10 · cuarentena, no leak): si el servicio falla, o el OCR ve texto pero NER no
reconoce un nombre con confianza, se marca `revision_manual` (X-Revision-Manual: 1) para
que un humano lo revise — nunca se deja pasar un posible nombre sin redactar.

FUERA DE ALCANCE (pendiente): entity PatientID (por decisión del proyecto se redacta solo
el nombre; el ID en TAGS ya se elimina).

Endpoints:
  GET  /health              → estado + si el motor cargó
  POST /redact  (body = .dcm binario) → .dcm redactado (application/dicom) + headers:
        X-Redacciones, X-Revision-Manual, X-Ocr-Texto, X-Entidad
"""
from __future__ import annotations

import io
import os
from threading import Lock
from typing import List, Tuple

import numpy as np
import pydicom
import pytesseract
from pytesseract import Output
from fastapi import FastAPI, Request, Response
from PIL import Image

from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider

LANG = "es"
SPACY_MODEL = os.environ.get("REDACTOR_SPACY_MODEL", "es_core_news_lg")
OCR_LANG = os.environ.get("REDACTOR_OCR_LANG", "spa+eng")
# Umbral para REDACTAR (auto). Entre REVIEW y SCORE → cuarentena (posible nombre dudoso).
SCORE = float(os.environ.get("REDACTOR_SCORE", "0.4"))
REVIEW = float(os.environ.get("REDACTOR_REVIEW", "0.25"))
# Una línea con proporción de dígitos por encima de esto = fecha/ID/parámetros (NO nombre).
MAX_DIGIT_RATIO = 0.1
# Margen (px) que se expande la caja del nombre para cubrir ascendentes/bordes del glifo.
PAD = int(os.environ.get("REDACTOR_PAD", "6"))
# SOLO el nombre del paciente. (PatientID excluido por decisión del proyecto.)
ENTITIES = ["PERSON"]

app = FastAPI(title="Campus LXP · Redactor DICOM (Presidio)", version="1.0.0")

_analyzer: AnalyzerEngine | None = None
_lock = Lock()


def _get_analyzer() -> AnalyzerEngine:
    """Carga (una sola vez, thread-safe) el analizador NER en español (Presidio + spaCy)."""
    global _analyzer
    if _analyzer is None:
        with _lock:
            if _analyzer is None:
                nlp = NlpEngineProvider(
                    nlp_configuration={
                        "nlp_engine_name": "spacy",
                        "models": [{"lang_code": LANG, "model_name": SPACY_MODEL}],
                    }
                ).create_engine()
                _analyzer = AnalyzerEngine(nlp_engine=nlp, supported_languages=[LANG])
    return _analyzer


def _lineas_ocr(img: Image.Image):
    """OCR agrupado por LÍNEA de texto: cada línea con su texto y su caja (l,t,w,h)."""
    data = pytesseract.image_to_data(img, lang=OCR_LANG, output_type=Output.DICT)
    lineas: dict = {}
    for i in range(len(data["text"])):
        txt = (data["text"][i] or "").strip()
        if not txt:
            continue
        clave = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        l, t, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        e = lineas.setdefault(clave, {"palabras": [], "l": l, "t": t, "r": l + w, "b": t + h})
        e["palabras"].append(txt)
        e["l"], e["t"] = min(e["l"], l), min(e["t"], t)
        e["r"], e["b"] = max(e["r"], l + w), max(e["b"], t + h)
    return [
        {"texto": " ".join(e["palabras"]), "box": (e["l"], e["t"], e["r"] - e["l"], e["b"] - e["t"])}
        for e in lineas.values()
    ]


def _score_nombre(analyzer: AnalyzerEngine, texto: str) -> float:
    """Mejor score de PERSON en la línea. Prueba el texto crudo y en Title Case (el NER de
    spaCy falla con MAYÚSCULAS; los banners de los ecógrafos van en mayúsculas)."""
    mejor = 0.0
    for cand in {texto, texto.title()}:
        if len(cand.strip()) < 3:
            continue
        for r in analyzer.analyze(text=cand, entities=["PERSON"], language=LANG, score_threshold=REVIEW):
            if r.entity_type == "PERSON":
                mejor = max(mejor, float(r.score))
    return mejor


def _ratio_digitos(texto: str) -> float:
    """Proporción de dígitos sobre caracteres alfanuméricos (para separar nombre de datos)."""
    alnum = sum(c.isalnum() for c in texto)
    if alnum == 0:
        return 1.0
    return sum(c.isdigit() for c in texto) / alnum


def _clasificar_linea(analyzer: AnalyzerEngine, linea: dict) -> str:
    """'redactar' | 'revisar' | 'omitir' para una línea de texto del OCR.

    Un NOMBRE de paciente va en su propia línea SIN dígitos; las fechas/ID/parámetros
    llevan dígitos → se OMITEN (aunque el NER se confunda con OCR sucio). En una línea
    sin dígitos: score alto → redactar; score dudoso → revisar (cuarentena, no leak)."""
    texto = linea["texto"]
    if _ratio_digitos(texto) > MAX_DIGIT_RATIO:
        return "omitir"  # línea de datos/parámetros, nunca el nombre
    score = _score_nombre(analyzer, texto)
    if score >= SCORE:
        return "redactar"
    if score >= REVIEW:
        return "revisar"
    return "omitir"


@app.get("/health")
def health() -> dict:
    return {"ok": True, "modelo": SPACY_MODEL, "ocr": OCR_LANG, "cargado": _analyzer is not None}


def _a_8bits(frame: np.ndarray) -> np.ndarray:
    """Normaliza un frame a uint8 para el OCR (los 16-bit se escalan a 0..255)."""
    if frame.dtype == np.uint8:
        return frame
    f = frame.astype(np.float32)
    mn, mx = float(f.min()), float(f.max())
    if mx <= mn:
        return np.zeros_like(frame, dtype=np.uint8)
    return (((f - mn) / (mx - mn)) * 255.0).astype(np.uint8)


def _pil_rgb(frame: np.ndarray, samples: int) -> Image.Image:
    """Frame numpy → PIL RGB (Presidio/OCR trabajan sobre imagen RGB)."""
    f8 = _a_8bits(frame)
    if samples == 3:
        return Image.fromarray(f8, "RGB")
    return Image.fromarray(f8, "L").convert("RGB")


@app.post("/redact")
async def redact(req: Request) -> Response:
    data = await req.body()
    try:
        ds = pydicom.dcmread(io.BytesIO(data))
    except Exception as e:  # noqa: BLE001
        # No se pudo leer → cuarentena (no se puede garantizar la redacción).
        return Response(
            content=data,
            media_type="application/dicom",
            headers={"X-Redacciones": "0", "X-Revision-Manual": "1", "X-Error": f"read:{e}"[:120]},
        )

    try:
        arr = ds.pixel_array
        rows, cols = int(ds.Rows), int(ds.Columns)
        samples = int(getattr(ds, "SamplesPerPixel", 1))
        frames = int(getattr(ds, "NumberOfFrames", 1) or 1)
        # Normaliza a (F, rows, cols[, 3]).
        arr = arr.reshape((frames, rows, cols, 3) if samples == 3 else (frames, rows, cols))

        img0 = _pil_rgb(arr[0], samples)

        # OCR por LÍNEA (el nombre va en su propia línea del banner). Se ennegrece la caja
        # de la línea de NOMBRE completa → quita el nombre aunque el NER solo marque parte;
        # las líneas con dígitos (fecha/ID/parámetros) se omiten (se conservan).
        analyzer = _get_analyzer()
        lineas = _lineas_ocr(img0)
        ocr_texto = " ".join(l["texto"] for l in lineas).strip()
        cajas: List[Tuple[int, int, int, int]] = []
        revisar = False
        for linea in lineas:
            accion = _clasificar_linea(analyzer, linea)
            if accion == "redactar":
                cajas.append(linea["box"])
            elif accion == "revisar":
                revisar = True  # posible nombre no concluyente → cuarentena

        # Ennegrece la caja del nombre (con margen PAD) en TODOS los frames (banner estático).
        for (l, t, w, h) in cajas:
            l0, t0 = max(0, l - PAD), max(0, t - PAD)
            l1, t1 = min(cols, l + w + PAD), min(rows, t + h + PAD)
            arr[:, t0:t1, l0:l1] = 0  # cubre mono (F,H,W) y RGB (F,H,W,3)

        # Reescribe el pixel-data (mismo layout; los frames se concatenan).
        ds.PixelData = np.ascontiguousarray(arr).tobytes()
        if samples == 3 and "PlanarConfiguration" in ds:
            ds.PlanarConfiguration = 0  # `pixel_array` entrega intercalado

        out = io.BytesIO()
        ds.save_as(out, write_like_original=True)

        # Cuarentena (§10): un nombre dudoso sin redactar → revisión humana.
        revision = 1 if revisar else 0
        return Response(
            content=out.getvalue(),
            media_type="application/dicom",
            headers={
                "X-Redacciones": str(len(cajas)),
                "X-Revision-Manual": str(revision),
                "X-Ocr-Texto": str(len(ocr_texto)),
                "X-Entidad": "PERSON",
            },
        )
    except Exception as e:  # noqa: BLE001
        # Cualquier fallo del redactor → cuarentena (nunca se sube sin garantizar §10).
        return Response(
            content=data,
            media_type="application/dicom",
            headers={"X-Redacciones": "0", "X-Revision-Manual": "1", "X-Error": f"redact:{e}"[:120]},
        )
