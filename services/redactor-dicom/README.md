# Redactor DICOM (Presidio) · §10

Microservicio Python ON-PREM que redacta la **PII quemada en los píxeles** de estudios
DICOM (el nombre del paciente que los ecógrafos imprimen sobre la imagen). Reemplaza al
enmascarado por región (que tapaba de más: Doppler, escalas, barra de color).

**Cómo:** Tesseract (OCR) detecta todo el texto y su caja → spaCy `es_core_news_lg` (NER,
vía Presidio) identifica cuál es un **nombre de persona** → se ennegrece SOLO esa caja, en
todos los frames. Lossless (no recomprime). NUNCA sale a la nube.

- Redacta **solo `PERSON`** (el nombre). NO toca fechas, parámetros del equipo, escalas,
  barra de color ni anotaciones clínicas. El PatientID en TAGS ya se elimina aparte.
- **Fallback / cuarentena (§10):** si falla el servicio, o el OCR ve texto pero NER no
  reconoce un nombre con confianza, responde `X-Revision-Manual: 1` → el pipeline marca el
  caso para revisión humana (nunca se deja pasar un posible nombre sin redactar).

## Endpoints
- `GET /health` → estado + si el motor cargó.
- `POST /redact` (body = `.dcm` binario, `content-type: application/dicom`) → `.dcm`
  redactado + headers `X-Redacciones`, `X-Revision-Manual`, `X-Ocr-Texto`, `X-Entidad`.

## Config (env)
- `REDACTOR_SPACY_MODEL` (default `es_core_news_lg`)
- `REDACTOR_OCR_LANG` (default `spa+eng`)
- `REDACTOR_SCORE` (default `0.4`) — umbral de confianza NER.

## Formatos
MONOCHROME (8/16-bit) y RGB (`SamplesPerPixel=3`), single y multi-frame. Los 16-bit se
normalizan a 8-bit solo para el OCR; el ennegrecido se aplica sobre el pixel-data original.

## Pendiente (fuera de alcance)
PII quemada DENTRO de la región de ultrasonido con formato no textual, u otros idiomas.
