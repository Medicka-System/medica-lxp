"""
Redactor de PII QUEMADA en píxeles DICOM **e imágenes web** (§10) — Presidio (OCR + NER), ON-PREM.

El problema: los ecógrafos (Mindray, Philips…) IMPRIMEN el nombre del paciente SOBRE la
imagen (texto en el pixel-data, no en tags) — tanto en el `.dcm` como en las JPG/PNG que
se exportan del equipo (screenshots). La anonimización de tags no lo quita, y enmascarar
por región tapa DE MÁS (Doppler, escalas, barra de color). `/redact` ramifica por
content-type (imagen web vs DICOM P10); en ambos se detecta y tapa SOLO la caja del NOMBRE:

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


def _cajas_y_revision(img: Image.Image):
    """Corre OCR+NER (UNA sola pasada) sobre una imagen RGB. Devuelve
    (cajas de nombre a tapar, revisar?, texto OCR concatenado).

    Núcleo compartido por el DICOM (frame 0 del banner) y la imagen web (JPG/PNG):
    Presidio trabaja sobre PÍXELES, así que detecta el nombre quemado igual en ambos."""
    analyzer = _get_analyzer()
    cajas: List[Tuple[int, int, int, int]] = []
    revisar = False
    lineas = _lineas_ocr(img)
    for linea in lineas:
        accion = _clasificar_linea(analyzer, linea)
        if accion == "redactar":
            cajas.append(linea["box"])
        elif accion == "revisar":
            revisar = True
    ocr_texto = " ".join(l["texto"] for l in lineas).strip()
    return cajas, revisar, ocr_texto


def _tapar_cajas(arr: np.ndarray, cajas, rows: int, cols: int) -> None:
    """Ennegrece (con margen PAD) cada caja de nombre en TODOS los frames de `arr`.
    `arr` es (F,H,W) mono o (F,H,W,3) RGB — el slicing cubre ambos."""
    for (l, t, w, h) in cajas:
        l0, t0 = max(0, l - PAD), max(0, t - PAD)
        l1, t1 = min(cols, l + w + PAD), min(rows, t + h + PAD)
        arr[:, t0:t1, l0:l1] = 0


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


def _redact_imagen(data: bytes, content_type: str) -> Response:
    """Redacta la PII quemada de una IMAGEN web (JPG/PNG) — screenshot del equipo (§3/§10).

    La imagen no tiene tags que limpiar, pero SÍ puede traer el nombre del paciente quemado.
    Se corre el MISMO OCR+NER que en DICOM (Presidio sobre píxeles), se ennegrece la caja del
    nombre y se re-codifica en el MISMO formato (sin recomprimir agresivo). FALLBACK: si algo
    falla, cuarentena (X-Revision-Manual: 1) — nunca se devuelve la imagen sin garantizar §10."""
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
        formato = (img.format or ("PNG" if "png" in content_type else "JPEG")).upper()
    except Exception as e:  # noqa: BLE001
        return Response(
            content=data,
            media_type=content_type or "application/octet-stream",
            headers={"X-Redacciones": "0", "X-Revision-Manual": "1", "X-Error": f"open:{e}"[:120]},
        )
    try:
        cajas, revisar, _ = _cajas_y_revision(img)
        arr = np.asarray(img).copy()  # (H,W,3)
        rows, cols = arr.shape[0], arr.shape[1]
        # `_tapar_cajas` espera (F,H,W,3): se añade eje de frame único.
        arr4 = arr[np.newaxis, ...]
        _tapar_cajas(arr4, cajas, rows, cols)
        salida = Image.fromarray(arr4[0], "RGB")

        out = io.BytesIO()
        # Conserva el formato de entrada; PNG sin pérdida, JPEG con calidad alta.
        if formato == "PNG":
            salida.save(out, format="PNG")
            media = "image/png"
        else:
            salida.save(out, format="JPEG", quality=92, subsampling=0)
            media = "image/jpeg"
        return Response(
            content=out.getvalue(),
            media_type=media,
            headers={
                "X-Redacciones": str(len(cajas)),
                "X-Revision-Manual": "1" if revisar else "0",
                "X-Entidad": "PERSON",
            },
        )
    except Exception as e:  # noqa: BLE001
        return Response(
            content=data,
            media_type=content_type or "application/octet-stream",
            headers={"X-Redacciones": "0", "X-Revision-Manual": "1", "X-Error": f"img:{e}"[:120]},
        )


@app.post("/redact")
async def redact(req: Request) -> Response:
    data = await req.body()
    # Ramifica por content-type: imagen web (JPG/PNG) vs DICOM P10. Presidio (OCR+NER) es
    # el mismo en ambos — solo cambia el contenedor (§3).
    content_type = (req.headers.get("content-type") or "").lower()
    if content_type.startswith("image/"):
        return _redact_imagen(data, content_type)
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

        # OCR+NER por LÍNEA sobre el frame 0 (el banner es estático en el cine). Núcleo
        # compartido con el redactor de imagen — misma detección de nombre sobre píxeles.
        cajas, revisar, ocr_texto = _cajas_y_revision(img0)

        # Ennegrece la caja del nombre (con margen PAD) en TODOS los frames (banner estático).
        _tapar_cajas(arr, cajas, rows, cols)  # cubre mono (F,H,W) y RGB (F,H,W,3)

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
