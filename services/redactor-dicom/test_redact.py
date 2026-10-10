"""
Regresión §10 del redactor — que el nombre QUEMADO NUNCA vuelva a filtrarse en silencio.

Prueba el pipeline REAL (`_redact_dicom` / `_redact_imagen` de app.py): construye DICOMs con
un nombre de paciente QUEMADO en los píxeles en varios TransferSyntax (sin comprimir, JPEG
baseline, RLE, JPEG 2000, y multi-frame) y ASERTA que la salida:
  · no fue fail-open (X-Revision-Manual == '0', X-Redaccion-Fallida == '0'),
  · quedó SIN COMPRIMIR (TransferSyntax = ExplicitVRLittleEndian),
  · y su OCR ya NO contiene el nombre (verificación de píxeles).
Además: un archivo corrupto/no-decodificable → CUARENTENA (X-Revision-Manual == '1', cuerpo
vacío), nunca el original sin redactar.

Requiere el stack del servicio (tesseract + spaCy es_core_news_lg + gdcm/pylibjpeg): corre
dentro del contenedor `redactor-dicom` (`pytest` en /app) o en CI con la imagen construida.
"""
from __future__ import annotations

import io
import re

import numpy as np
import pydicom
import pytesseract
import pytest
from PIL import Image, ImageDraw
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.encaps import encapsulate
from pydicom.uid import (
    ExplicitVRLittleEndian,
    JPEG2000Lossless,
    JPEGBaseline8Bit,
    RLELossless,
    SecondaryCaptureImageStorage,
    generate_uid,
)

import app as redactor

NOMBRE = "RAMIREZ LOPEZ MARIA GUADALUPE"


def _lienzo(frames: int = 1) -> np.ndarray:
    """(F,H,W,3) uint8 con el nombre quemado + una línea de datos (que NO debe tocarse)."""
    H, W = 512, 760
    base = Image.new("RGB", (W, H), (12, 12, 12))
    d = ImageDraw.Draw(base)
    d.text((25, 20), NOMBRE, fill=(255, 255, 255))
    d.text((25, 48), "ID 998877  2026-09-28  MINDRAY", fill=(255, 255, 255))
    uno = np.asarray(base, dtype=np.uint8)
    return np.stack([uno] * frames, axis=0)


def _base_ds(arr: np.ndarray) -> Dataset:
    frames, H, W, _ = arr.shape
    fm = FileMetaDataset()
    fm.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
    fm.MediaStorageSOPInstanceUID = generate_uid()
    ds = Dataset()
    ds.file_meta = fm
    ds.preamble = b"\x00" * 128
    ds.PatientName = "RAMIREZ LOPEZ^MARIA GUADALUPE"
    ds.PatientID = "998877"
    ds.Modality = "US"
    ds.SOPClassUID = SecondaryCaptureImageStorage
    ds.SOPInstanceUID = fm.MediaStorageSOPInstanceUID
    ds.Rows, ds.Columns = H, W
    ds.SamplesPerPixel = 3
    ds.PhotometricInterpretation = "RGB"
    ds.PlanarConfiguration = 0
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0
    if frames > 1:
        ds.NumberOfFrames = frames
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    return ds


def _dcm_sin_comprimir(frames: int = 1) -> bytes:
    arr = _lienzo(frames)
    ds = _base_ds(arr)
    ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    ds.PixelData = np.ascontiguousarray(arr).tobytes()
    out = io.BytesIO()
    ds.save_as(out, write_like_original=False)
    return out.getvalue()


def _dcm_jpeg_baseline() -> bytes:
    """JPEG baseline encapsulado (PIL codifica; el redactor debe decodificar con gdcm/pylibjpeg)."""
    arr = _lienzo(1)[0]
    buf = io.BytesIO()
    Image.fromarray(arr, "RGB").save(buf, format="JPEG", quality=92)
    ds = _base_ds(arr[np.newaxis, ...])
    ds.PhotometricInterpretation = "YBR_FULL_422"
    ds.file_meta.TransferSyntaxUID = JPEGBaseline8Bit
    ds.PixelData = encapsulate([buf.getvalue()])
    ds["PixelData"].is_undefined_length = True
    out = io.BytesIO()
    ds.save_as(out, write_like_original=False)
    return out.getvalue()


def _dcm_comprimido(ts) -> bytes:
    """Comprime con los plugins de pydicom (RLE / JPEG 2000)."""
    arr = _lienzo(1)
    ds = _base_ds(arr)
    ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    ds.PixelData = np.ascontiguousarray(arr).tobytes()
    ds.compress(ts)  # usa pylibjpeg-rle / pylibjpeg-openjpeg
    out = io.BytesIO()
    ds.save_as(out, write_like_original=False)
    return out.getvalue()


def _ocr(texto_img: Image.Image) -> str:
    return pytesseract.image_to_string(texto_img).upper()


def _partes_multipart(resp) -> dict:
    """Parsea la respuesta MULTIPART de éxito en {name: bytes} (partes `bin` y `thumb`)."""
    ct = resp.headers["content-type"]
    assert ct.startswith("multipart/form-data"), f"no es multipart: {ct}"
    boundary = ct.split("boundary=")[1].strip().encode()
    partes = {}
    for seg in resp.body.split(b"--" + boundary):
        seg = seg.lstrip(b"\r\n")
        if not seg or seg.startswith(b"--"):  # preámbulo vacío o cierre
            continue
        head, _, data = seg.partition(b"\r\n\r\n")
        if data.endswith(b"\r\n"):
            data = data[:-2]
        m = re.search(rb'name="([^"]+)"', head)
        if m:
            partes[m.group(1).decode()] = data
    return partes


def _assert_thumb(partes: dict) -> None:
    """El thumb (parte `thumb` del multipart) existe, es JPEG válido, borde largo <= 480 y NO
    tiene el nombre (§10: sale del frame YA redactado, nunca del original)."""
    thumb = partes.get("thumb")
    assert thumb, "no se emitió el thumb (parte `thumb` ausente)"
    img = Image.open(io.BytesIO(thumb))
    assert img.format == "JPEG", f"el thumb no es JPEG: {img.format}"
    assert max(img.size) <= 480, f"thumb mayor al borde objetivo: {img.size}"
    txt = _ocr(img.convert("RGB"))
    assert "RAMIREZ" not in txt and "GUADALUPE" not in txt, f"nombre sobrevive en el thumb: {txt!r}"


def _assert_redactado(resp) -> pydicom.Dataset:
    """Aserciones comunes de ÉXITO: no fail-open, TS sin comprimir, y sin el nombre en píxeles.
    La salida es MULTIPART: `bin` = .dcm redactado, `thumb` = JPEG del frame redactado."""
    assert resp.status_code == 200
    assert resp.headers["X-Revision-Manual"] == "0", resp.headers.get("X-Error")
    assert resp.headers["X-Redaccion-Fallida"] == "0"
    assert int(resp.headers["X-Redacciones"]) >= 1
    partes = _partes_multipart(resp)
    ds = pydicom.dcmread(io.BytesIO(partes["bin"]))  # strict: la salida es P10 canónico
    assert str(ds.file_meta.TransferSyntaxUID) == str(ExplicitVRLittleEndian)
    frames = int(getattr(ds, "NumberOfFrames", 1) or 1)
    arr = ds.pixel_array.reshape((frames, ds.Rows, ds.Columns, 3))
    for f in range(frames):
        txt = _ocr(Image.fromarray(arr[f], "RGB"))
        assert "RAMIREZ" not in txt and "GUADALUPE" not in txt, f"nombre sobrevive en frame {f}: {txt!r}"
    _assert_thumb(partes)  # el thumb server-side viaja en el body (parte `thumb` · §5A/§10)
    return ds


def test_sin_comprimir_redacta():
    _assert_redactado(redactor._redact_dicom(_dcm_sin_comprimir()))


def test_jpeg_baseline_redacta():
    # El caso EXACTO del diagnóstico: DICOM comprimido → antes fail-open, ahora redacta.
    _assert_redactado(redactor._redact_dicom(_dcm_jpeg_baseline()))


def test_rle_redacta():
    _assert_redactado(redactor._redact_dicom(_dcm_comprimido(RLELossless)))


def test_jpeg2000_redacta():
    # El redactor DECODIFICA J2K (openjpeg). Construir el INPUT comprimido en J2K necesita un
    # ENCODER, que puede no estar en la imagen; si falta, se salta (no es fallo del redactor).
    try:
        data = _dcm_comprimido(JPEG2000Lossless)
    except (NotImplementedError, RuntimeError) as e:
        pytest.skip(f"sin encoder J2K para construir el input de prueba ({e}); decoder openjpeg presente")
    _assert_redactado(redactor._redact_dicom(data))


def test_multiframe_redacta_todos_los_frames():
    ds = _assert_redactado(redactor._redact_dicom(_dcm_sin_comprimir(frames=3)))
    assert int(ds.NumberOfFrames) == 3


def test_corrupto_va_a_cuarentena_no_fail_open():
    resp = redactor._redact_dicom(b"esto no es un dicom" * 100)
    assert resp.headers["X-Revision-Manual"] == "1"
    assert resp.headers["X-Redaccion-Fallida"] == "1"
    assert resp.body == b""  # jamás se devuelve el original como válido


def test_imagen_web_quemada_redacta():
    arr = _lienzo(1)[0]
    buf = io.BytesIO()
    Image.fromarray(arr, "RGB").save(buf, format="PNG")
    resp = redactor._redact_imagen(buf.getvalue(), "image/png")
    assert resp.headers["X-Revision-Manual"] == "0", resp.headers.get("X-Error")
    assert int(resp.headers["X-Redacciones"]) >= 1
    partes = _partes_multipart(resp)
    txt = _ocr(Image.open(io.BytesIO(partes["bin"])).convert("RGB"))
    assert "RAMIREZ" not in txt and "GUADALUPE" not in txt
    _assert_thumb(partes)  # el thumb server-side también en el camino de imagen web (parte `thumb`)
