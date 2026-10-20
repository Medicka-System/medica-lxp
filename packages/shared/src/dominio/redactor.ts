/**
 * Contrato ÚNICO de la respuesta del servicio `redactor-dicom` (`POST /redact`, §10).
 *
 * El redactor (services/redactor-dicom/app.py) responde:
 *   · `!ok`                      → error (el consumidor reintenta / aborta).
 *   · CUARENTENA (fail-closed)   → `200` + `X-Revision-Manual: 1` + CUERPO VACÍO. No hay
 *     multipart que parsear: el estudio NO se publica (posible PII sobreviviente · §10).
 *   · ÉXITO                      → `200` + `multipart/form-data`: parte `bin` (binario
 *     REDACTADO, obligatoria) + parte `thumb` (JPEG del frame YA redactado, opcional).
 *
 * Este parser vive en UN solo lugar para que el formato (multipart + headers) no vuelva a
 * DRIFTAR entre consumidores. Antes el worker DICOM parseaba multipart (`formData()`) pero el
 * servicio de imágenes de reporte leía `arrayBuffer()` y guardaba el SOBRE entero como imagen
 * → binario corrupto. Todo consumidor del redactor DEBE usar `parsearRespuestaRedactor`.
 *
 * Sin dependencia de DOM/Node lib: se tipa por FORMA (estructural) la `Response`/`Blob` reales
 * (undici en Node, fetch en el navegador) que se le pasen — así compila igual en `shared`.
 */

/** Resultado normalizado de `POST /redact` (binarios como `Uint8Array`, agnóstico de runtime). */
export interface RespuestaRedactor {
  /** Binario REDACTADO (parte `bin`). Vacío (`length 0`) si cuarentena. */
  bin: Uint8Array;
  /** Thumb JPEG del frame YA redactado (parte `thumb`, opcional · §10). `null` si no vino. */
  thumb: Uint8Array | null;
  /** Nº de cajas de NOMBRE ennegrecidas (header `X-Redacciones`). */
  redacciones: number;
  /** CUARENTENA (§10): el redactor no garantizó la redacción → NO publicar el estudio. */
  revisionManual: boolean;
}

/** Error del contrato con el redactor (respuesta no-ok o multipart sin la parte `bin`). */
export class RedactorError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'RedactorError';
  }
}

/** Forma mínima de un `Blob`/`File` del multipart que consumimos (estructural, sin DOM lib). */
interface ParteBinaria {
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** Forma mínima de la `Response` del redactor que consumimos (estructural, sin DOM lib). */
export interface RespuestaHttpRedactor {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  formData(): Promise<{ get(name: string): unknown }>;
}

function esParteBinaria(v: unknown): v is ParteBinaria {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as ParteBinaria).arrayBuffer === 'function' &&
    typeof (v as ParteBinaria).size === 'number'
  );
}

/**
 * Parsea la respuesta de `POST /redact` según el contrato §10 (arriba). Fail-closed:
 *  · `!ok` o multipart sin parte `bin` (ausente/vacía) → `RedactorError` (nada se guarda).
 *  · CUARENTENA → `{ revisionManual: true, bin: vacío, thumb: null }` (el caller no publica).
 *  · ÉXITO → `{ bin, thumb?, redacciones }`.
 *
 * El caller decide qué hacer con `revisionManual` (el worker DICOM lo pone en cuarentena; un
 * consumidor síncrono puede tratarlo como error) — pero NINGUNO debe guardar `bin` vacío.
 */
export async function parsearRespuestaRedactor(resp: RespuestaHttpRedactor): Promise<RespuestaRedactor> {
  if (!resp.ok) {
    throw new RedactorError(`El servicio redactor-dicom respondió ${resp.status}.`);
  }
  const redacciones = Number(resp.headers.get('x-redacciones') ?? '0') || 0;
  const revisionManual = resp.headers.get('x-revision-manual') === '1';
  // CUARENTENA: cuerpo vacío, no hay multipart que parsear (fail-closed · §10).
  if (revisionManual) {
    return { bin: new Uint8Array(0), thumb: null, redacciones, revisionManual: true };
  }
  // ÉXITO: multipart (parte `bin` obligatoria; `thumb` opcional).
  const form = await resp.formData();
  const bin = form.get('bin');
  if (!esParteBinaria(bin) || bin.size === 0) {
    throw new RedactorError('El redactor no devolvió la parte `bin` del multipart.');
  }
  const binBytes = new Uint8Array(await bin.arrayBuffer());
  const parteThumb = form.get('thumb');
  const thumb = esParteBinaria(parteThumb) && parteThumb.size > 0
    ? new Uint8Array(await parteThumb.arrayBuffer())
    : null;
  return { bin: binBytes, thumb, redacciones, revisionManual: false };
}
