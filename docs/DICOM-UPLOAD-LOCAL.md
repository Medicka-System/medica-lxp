# Subida DICOM de punta a punta — en LOCAL

Cómo probar el flujo completo: **subir un `.dcm` real → verlo anonimizarse → verlo en
el visor Cornerstone3D**, todo en tu máquina. (Rama `dicom-upload`, §4.7 del CLAUDE.md.)

El pipeline (§2/§3/§8/§10):

```
[navegador] --PUT binario directo-->  [MinIO]           (el .dcm NUNCA pasa por api/web)
    |  (1) solicitar URL firmada            ^
    v                                       | (5) el visor lee el .dcm anonimizado (wadouri)
  [apps/api]  --encola procesar-dicom-->  [worker]  --dcmjs: quita PII, reescribe .dcm-->  [MinIO]
                                             |  borra el crudo con PII (§10)
                                             v
                                        [Postgres] estudio_estado + traza de anonimización
```

---

## 0) Requisitos

- Docker Desktop corriendo.
- `.env` en la raíz (copia de `.env.example`). Verifica el bloque de storage:

  ```env
  STORAGE_ENDPOINT=http://localhost:9000
  STORAGE_ACCESS_KEY_ID=lxpminio
  STORAGE_SECRET_ACCESS_KEY=lxpminio_dev_secret
  STORAGE_BUCKET=campus-lxp-media
  ```

  > **Importante (modo híbrido):** `STORAGE_ENDPOINT` debe ser `http://localhost:9000`
  > (no `minio:9000`). El `api` firma la URL sobre ese host y el navegador la usa tal
  > cual para subir/leer; si apuntara a `minio:9000`, el navegador no lo alcanzaría.

- El `api` y el `worker` deben tener las variables `STORAGE_*` en su entorno (igual que
  `DATABASE_URL`). En el arranque híbrido, exporta el `.env` antes de `pnpm dev`
  (PowerShell no lo hace solo):

  ```bash
  # bash / git-bash
  set -a && . ./.env && set +a
  ```

## 1) Levanta la infraestructura (Docker)

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis minio createbuckets
```

- `minio` = object storage S3-compatible (API en `:9000`, consola en `:9001`).
- `createbuckets` crea el bucket `campus-lxp-media` y termina (es de un solo uso).
- Consola de MinIO: <http://localhost:9001> (usuario `lxpminio` / clave `lxpminio_dev_secret`).

Si es tu primera vez, aplica migraciones y seed:

```bash
pnpm --filter db migrate:up
pnpm --filter db seed
```

## 2) Levanta las apps (host)

En terminales separadas (con el `.env` exportado, ver paso 0):

```bash
pnpm --filter @campus/api dev      # API de dominio → http://localhost:8000
pnpm --filter @campus/worker dev   # workers BullMQ (procesar-dicom)
pnpm --filter web dev              # Campus → http://localhost:3000
```

## 3) Consigue un `.dcm` de prueba

Ya hay uno versionado: **`muestras/estudio-muestra.dcm`** (ultrasonido sintético
256×256 con PII del paciente para que se vea la anonimización).

Para regenerarlo (o crear otro):

```bash
pnpm --filter @campus/worker muestra:dicom
# → muestras/estudio-muestra.dcm
```

La muestra incluye PII que **debe desaparecer** (nombre, ID, fecha de nacimiento,
médico de referencia, institución, número de acceso, StudyID, una etiqueta privada)
y datos clínicos que **deben conservarse** (Modality=US, descripciones, la imagen).

## 4) Súbelo desde el navegador

1. Abre el Campus: <http://localhost:3000/bitacora>.
2. Clic en **Subir caso**.
3. Elige un módulo, escribe un hallazgo (obligatorio).
4. En **Estudio DICOM (.dcm)** → **Elegir archivo .dcm** → selecciona
   `muestras/estudio-muestra.dcm`.
5. Clic en **Subir caso y estudio**. Verás la barra de estado avanzar:
   **Guardando el caso… → Subiendo el estudio a storage… → Anonimizando el estudio… →
   Estudio anonimizado y listo**.
6. La hoja se cierra sola al terminar. En la tarjeta del caso, pasa el cursor sobre la
   imagen y clic en **Ver estudio**: se abre el **visor Cornerstone3D** con el `.dcm`
   **anonimizado** (puedes hacer zoom, medir, ajustar brillo/contraste).

## 5) Comprueba la anonimización (opcional, en la consola de MinIO)

- <http://localhost:9001> → bucket `campus-lxp-media`:
  - `dicom/casos/<casoId>/estudio.dcm` → existe (estudio **anonimizado**, sin PII).
  - `dicom/crudo/<casoId>/…` → **vacío** (el crudo con PII se borró tras anonimizar, §10).

---

## Qué verifica cada pieza

| Paso | Quién | Qué garantiza |
|---|---|---|
| solicitar / confirmar / estudio | `apps/api` (`dicom`) | El `api` es el único que **firma** (SigV4); nunca toca el binario. |
| PUT del `.dcm` | navegador → MinIO | El binario va **directo** a storage (§2), no por api/web. |
| `procesar-dicom` | `apps/worker` (dcmjs) | Parsea el P10, **quita la PII** (verifica bloqueante), **reescribe** el `.dcm` y **borra el crudo** (§10). |
| Ver estudio | `apps/web` + Cornerstone3D | Carga el `.dcm` anonimizado vía `wadouri:` con URL firmada de lectura. |

## Notas y límites

- **Anonimización a nivel de TAGS.** Se remueven los identificadores del paciente y las
  etiquetas privadas del *dataset*. La PII "quemada" en los píxeles (texto sobreimpreso
  en la imagen) **no** se redacta aquí — eso requeriría redacción de pixel-data y queda
  fuera de este paso.
- **Multi-frame (cine-loop):** la muestra es de un solo frame (render garantizado). Un
  `.dcm` multi-frame real se anonimiza igual; el visor arma los frames desde
  `estudio_series.frames`.
- **`full-compose`** (todo en Docker) no está soportado para la subida por navegador: la
  URL firmada usaría el host interno `minio:9000`, inalcanzable desde el navegador. Usa
  el modo híbrido (infra en Docker, apps con `pnpm dev`).
