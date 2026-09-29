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
    es estático en un cine).

DICOM COMPRIMIDO (§10 · el formato REAL de los ecógrafos — JPEG baseline/lossless, JPEG
2000, JPEG-LS, RLE): se DECODIFICA con el stack completo de handlers (gdcm + pylibjpeg),
se tapa el nombre, y se **NORMALIZA a SIN COMPRIMIR** (`decompress()` → TransferSyntax =
ExplicitVRLittleEndian, sin encapsulación/undefined-length) ANTES de guardar. Sin esta
normalización, `save_as` lanzaba y el servicio devolvía el original SIN redactar (leak §10).

VERIFICACIÓN POST-REDACCIÓN (§10): tras guardar, se RE-LEE la salida y se RE-CORRE el OCR+NER
sobre los píxeles resultantes. Si sobrevive un nombre → se trata como FALLO (no como éxito).

FAIL-CLOSED ABSOLUTO (§10): cualquier excepción, archivo no decodificable, nombre dudoso
(NER sin confianza) o verificación fallida → respuesta de FALLO (`X-Revision-Manual: 1`,
`X-Redaccion-Fallida: 1`) con CUERPO VACÍO — NUNCA se devuelve el original sin redactar como
válido. El worker pone el estudio en CUARENTENA (`revision_manual`), no lo publica.

Config: SOLO entity PERSON. NO toca fechas, parámetros, escalas ni anotaciones clínicas.
NUNCA sale a la nube (modelo y OCR locales).

Endpoints:
  GET  /health              → estado + si el motor cargó
  POST /redact  (body = .dcm o imagen) → binario redactado (2xx) + headers:
        X-Redacciones, X-Revision-Manual, X-Redaccion-Fallida, X-Ocr-Texto, X-Entidad,
        X-Transfer-Syntax-In, X-Error
"""
from __future__ import annotations

import io
import logging
import os
from threading import Lock
from typing import List, Tuple

import numpy as np
import pydicom
import pytesseract
from pytesseract import Output
from fastapi import FastAPI, Request, Response
from PIL import Image
from pydicom.uid import ExplicitVRLittleEndian

from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider

logging.basicConfig(level=logging.INFO, format="[redactor] %(levelname)s %(message)s")
log = logging.getLogger("redactor")

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

app = FastAPI(title="Campus LXP · Redactor DICOM (Presidio)", version="2.0.0")

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


def _verificar_limpia(img: Image.Image) -> Tuple[bool, int]:
    """VERIFICACIÓN §10: re-corre OCR+NER sobre la imagen YA redactada. Limpia si NO queda
    ninguna caja de nombre (`redactar`) NI línea dudosa (`revisar`). Devuelve (limpia?, n_restantes)."""
    cajas, revisar, _ = _cajas_y_revision(img)
    restantes = len(cajas) + (1 if revisar else 0)
    return restantes == 0, restantes


# ── Cabeceras de respuesta ──────────────────────────────────────────────────
def _ok(body: bytes, media: str, redacciones: int, ts_in: str = "") -> Response:
    """Éxito verificado: se devuelve el binario REDACTADO (sin PII quemada)."""
    return Response(
        content=body,
        media_type=media,
        headers={
            "X-Redacciones": str(redacciones),
            "X-Revision-Manual": "0",
            "X-Redaccion-Fallida": "0",
            "X-Entidad": "PERSON",
            "X-Transfer-Syntax-In": ts_in,
        },
    )


def _fallo(motivo: str, ts_in: str = "") -> Response:
    """FALLO fail-closed (§10): CUERPO VACÍO + banderas de cuarentena. NUNCA se devuelve el
    original sin redactar. El worker pone el estudio en `revision_manual` (no lo publica)."""
    log.warning("redact FALLO ts_in=%s motivo=%s", ts_in or "?", motivo[:160])
    return Response(
        content=b"",
        status_code=200,
        media_type="application/octet-stream",
        headers={
            "X-Redacciones": "0",
            "X-Revision-Manual": "1",
            "X-Redaccion-Fallida": "1",
            "X-Transfer-Syntax-In": ts_in,
            "X-Error": motivo[:160],
        },
    )


def _redact_imagen(data: bytes, content_type: str) -> Response:
    """Redacta la PII quemada de una IMAGEN web (JPG/PNG) — screenshot del equipo (§3/§10).
    Decodifica → tapa el nombre → re-codifica → VERIFICA. Fail-closed."""
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
        formato = (img.format or ("PNG" if "png" in content_type else "JPEG")).upper()
    except Exception as e:  # noqa: BLE001
        return _fallo(f"open:{e}", content_type)
    try:
        cajas, revisar, _ = _cajas_y_revision(img)
        if revisar:
            return _fallo("nombre dudoso (NER sin confianza) → cuarentena", content_type)
        arr = np.asarray(img).copy()  # (H,W,3)
        rows, cols = arr.shape[0], arr.shape[1]
        arr4 = arr[np.newaxis, ...]  # `_tapar_cajas` espera (F,H,W,3)
        _tapar_cajas(arr4, cajas, rows, cols)
        salida = Image.fromarray(arr4[0], "RGB")

        out = io.BytesIO()
        if formato == "PNG":
            salida.save(out, format="PNG")
            media = "image/png"
        else:
            salida.save(out, format="JPEG", quality=92, subsampling=0)
            media = "image/jpeg"
        cuerpo = out.getvalue()

        # VERIFICACIÓN §10: re-abrir la salida y re-OCR. Si sobrevive un nombre → FALLO.
        limpia, restantes = _verificar_limpia(Image.open(io.BytesIO(cuerpo)).convert("RGB"))
        if not limpia:
            return _fallo(f"verificacion: {restantes} nombre(s) sobreviven tras redactar", content_type)
        log.info("redact IMG ok content_type=%s redacciones=%d", content_type, len(cajas))
        return _ok(cuerpo, media, len(cajas), content_type)
    except Exception as e:  # noqa: BLE001
        return _fallo(f"img:{e}", content_type)


def _redact_dicom(data: bytes) -> Response:
    """Redacta la PII quemada de un `.dcm` (cualquier TransferSyntax). Decodifica (gdcm/pylibjpeg)
    → tapa el nombre en TODOS los frames → NORMALIZA a SIN COMPRIMIR → guarda → VERIFICA."""
    # 1) Leer (estricto; fallback force para tolerar P10 no-canónicos de dcmjs).
    ts_in = ""
    try:
        ds = pydicom.dcmread(io.BytesIO(data))
    except Exception:  # noqa: BLE001
        try:
            ds = pydicom.dcmread(io.BytesIO(data), force=True)
        except Exception as e:  # noqa: BLE001
            return _fallo(f"read:{e}")
    try:
        ts_in = str(getattr(ds.file_meta, "TransferSyntaxUID", "") or "")
        if not ts_in:
            # Sin TransferSyntax no se puede saber cómo están codificados los píxeles.
            return _fallo("sin TransferSyntaxUID (no se puede decodificar el pixel-data)")

        # 2) NORMALIZAR: si viene comprimido (JPEG/JPEG2000/JPEG-LS/RLE), decodificar a crudo.
        #    Esto reescribe PixelData sin encapsular y fija TS = ExplicitVRLittleEndian.
        if ds.file_meta.TransferSyntaxUID.is_compressed:
            ds.decompress()  # requiere gdcm/pylibjpeg; si falla → except → fail-closed

        rows, cols = int(ds.Rows), int(ds.Columns)
        samples = int(getattr(ds, "SamplesPerPixel", 1))
        frames = int(getattr(ds, "NumberOfFrames", 1) or 1)
        arr = ds.pixel_array.reshape(
            (frames, rows, cols, 3) if samples == 3 else (frames, rows, cols)
        ).copy()

        # 3) Detectar el nombre en el frame 0 (el banner es estático en el cine).
        cajas, revisar, ocr_texto = _cajas_y_revision(_pil_rgb(arr[0], samples))
        if revisar:
            return _fallo("nombre dudoso (NER sin confianza) → cuarentena", ts_in)

        # 4) Tapar en TODOS los frames (mono (F,H,W) o RGB (F,H,W,3)).
        _tapar_cajas(arr, cajas, rows, cols)

        # 5) Reescribir SIN COMPRIMIR: pixel-data crudo + TS explícito little-endian, y limpiar
        #    la longitud indefinida (encapsulación) que dejaba el formato comprimido.
        ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
        ds.is_little_endian = True
        ds.is_implicit_VR = False
        if samples == 3:
            # `pixel_array` entrega el frame LISTO para mostrar, intercalado (R,G,B). Tras
            # decodificar un JPEG YBR el dato ya viene full-size RGB, pero la etiqueta podía
            # seguir en YBR_FULL_422 (subsampled) → los visores lo malinterpretarían. Se alinea.
            ds.PhotometricInterpretation = "RGB"
            ds.PlanarConfiguration = 0
        ds.PixelData = np.ascontiguousarray(arr).tobytes()
        ds["PixelData"].is_undefined_length = False

        out = io.BytesIO()
        ds.save_as(out, write_like_original=False)  # P10 canónico (preámbulo + DICM)
        cuerpo = out.getvalue()

        # 6) VERIFICACIÓN §10: re-leer la SALIDA, re-OCR sobre el frame 0. Si sobrevive un
        #    nombre (o la salida no es legible) → FALLO.
        try:
            rr = pydicom.dcmread(io.BytesIO(cuerpo))
            rframes = int(getattr(rr, "NumberOfFrames", 1) or 1)
            rarr = rr.pixel_array.reshape(
                (rframes, rows, cols, 3) if samples == 3 else (rframes, rows, cols)
            )
            limpia, restantes = _verificar_limpia(_pil_rgb(rarr[0], samples))
        except Exception as e:  # noqa: BLE001
            return _fallo(f"verificacion-relectura:{e}", ts_in)
        if not limpia:
            return _fallo(f"verificacion: {restantes} nombre(s) sobreviven tras redactar", ts_in)

        log.info(
            "redact DICOM ok ts_in=%s redacciones=%d frames=%d ocr=%d",
            ts_in, len(cajas), frames, len(ocr_texto),
        )
        return _ok(cuerpo, "application/dicom", len(cajas), ts_in)
    except Exception as e:  # noqa: BLE001
        return _fallo(f"redact:{e}", ts_in)


@app.post("/redact")
async def redact(req: Request) -> Response:
    data = await req.body()
    # Ramifica por content-type: imagen web (JPG/PNG) vs DICOM P10. Presidio (OCR+NER) es
    # el mismo en ambos — solo cambia el contenedor (§3).
    content_type = (req.headers.get("content-type") or "").lower()
    if content_type.startswith("image/"):
        return _redact_imagen(data, content_type)
    return _redact_dicom(data)
