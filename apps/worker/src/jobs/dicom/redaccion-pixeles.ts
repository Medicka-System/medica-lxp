/**
 * Redacción de PII QUEMADA en los PÍXELES (§10 · Sprint 4.7 · FASE anon-píxeles).
 *
 * Los ecógrafos (Mindray, Philips…) IMPRIMEN el nombre/ID/fecha del paciente SOBRE la
 * imagen — texto pintado en el pixel-data, no en tags. La anonimización de tags (dcmjs)
 * NO lo quita. Aquí se ENNEGRECE todo lo EXTERIOR a la Sequence of Ultrasound Regions
 * (0018,6011): el equipo declara el rectángulo de la imagen ecográfica real; el banner
 * del paciente vive fuera (arriba/lados/pie). Determinístico, sin OCR.
 *
 * Maneja MONOCHROME2/MONOCHROME1 (8/16-bit), RGB (SamplesPerPixel=3, PlanarConfiguration
 * 0 intercalado / 1 planar) y multi-frame.
 *
 * FALLBACK (§10): si el estudio NO trae US Regions, no se puede localizar la imagen →
 * se ennegrece una BANDA SUPERIOR conservadora (donde va el banner) y se marca el caso
 * `revision_manual` (nadie confía en el auto: un humano debe revisar). NUNCA se deja el
 * caso con la PII intacta.
 *
 * FUERA DE ALCANCE (pendiente): PII quemada DENTRO de la región de ultrasonido (raro en
 * Mindray/Philips) — requiere OCR/detección de texto (capa 2).
 */

/** Fracción superior de la imagen que se ennegrece cuando no hay US Regions (banner). */
const BANDA_SUPERIOR_FRAC = 0.15;

export type MetodoRedaccion = 'region' | 'banda_superior' | 'ninguna';

export interface ResultadoRedaccion {
  /** Cómo se redactó: por región US, por banda superior (fallback), o nada aplicable. */
  metodo: MetodoRedaccion;
  /** El caso quedó con redacción NO confiable (fallback) → exige revisión humana. */
  revision_manual: boolean;
  /** Nº de regiones de ultrasonido usadas. */
  regiones: number;
  /** Píxeles ennegrecidos (suma sobre frames) — para la traza. */
  pixeles_redactados: number;
}

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Extrae los rectángulos (0-based, inclusivos) de la Sequence of Ultrasound Regions. */
export function regionesDeUltrasonido(ds: Record<string, unknown>, cols: number, rows: number): Rect[] {
  const seq = ds.SequenceOfUltrasoundRegions;
  const items = Array.isArray(seq) ? seq : seq ? [seq] : [];
  const rects: Rect[] = [];
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const r = it as Record<string, unknown>;
    const x0 = num(r.RegionLocationMinX0);
    const y0 = num(r.RegionLocationMinY0);
    const x1 = num(r.RegionLocationMaxX1);
    const y1 = num(r.RegionLocationMaxY1);
    if (x0 == null || y0 == null || x1 == null || y1 == null) continue;
    // Acota a los límites de la imagen y descarta rectángulos inválidos.
    const cx0 = Math.max(0, Math.min(cols - 1, Math.round(Math.min(x0, x1))));
    const cx1 = Math.max(0, Math.min(cols - 1, Math.round(Math.max(x0, x1))));
    const cy0 = Math.max(0, Math.min(rows - 1, Math.round(Math.min(y0, y1))));
    const cy1 = Math.max(0, Math.min(rows - 1, Math.round(Math.max(y0, y1))));
    if (cx1 < cx0 || cy1 < cy0) continue;
    rects.push({ x0: cx0, y0: cy0, x1: cx1, y1: cy1 });
  }
  return rects;
}

/** Intervalos de columnas [a,b] a CONSERVAR en una fila (unión de regiones que la cubren). */
function intervalosFila(regs: Rect[], row: number, cols: number): Array<[number, number]> {
  const spans = regs.filter((r) => row >= r.y0 && row <= r.y1).map((r): [number, number] => [r.x0, r.x1]);
  if (spans.length === 0) return [];
  spans.sort((a, b) => a[0] - b[0]);
  const fusion: Array<[number, number]> = [spans[0]!];
  for (let i = 1; i < spans.length; i++) {
    const ult = fusion[fusion.length - 1]!;
    const s = spans[i]!;
    if (s[0] <= ult[1] + 1) ult[1] = Math.max(ult[1], s[1]);
    else fusion.push(s);
  }
  // Acota al ancho.
  return fusion.map(([a, b]): [number, number] => [Math.max(0, a), Math.min(cols - 1, b)]);
}

/**
 * Ennegrece los píxeles a redactar (fuera de la región / en la banda superior) EN SITIO
 * sobre el buffer del dataset naturalizado (dcmjs). Devuelve qué se hizo para la traza.
 */
export function redactarPixeles(ds: Record<string, unknown>): ResultadoRedaccion {
  const rows = num(ds.Rows) ?? 0;
  const cols = num(ds.Columns) ?? 0;
  const bits = num(ds.BitsAllocated) ?? 8;
  const samples = num(ds.SamplesPerPixel) ?? 1;
  const planar = (num(ds.PlanarConfiguration) ?? 0) === 1 && samples > 1;
  const bpp = Math.max(1, Math.ceil(bits / 8)); // bytes por muestra

  const buffers = (Array.isArray(ds.PixelData) ? ds.PixelData : [ds.PixelData]).filter(
    (b): b is ArrayBuffer => b instanceof ArrayBuffer,
  );
  if (rows <= 0 || cols <= 0 || buffers.length === 0) {
    return { metodo: 'ninguna', revision_manual: true, regiones: 0, pixeles_redactados: 0 };
  }

  const regs = regionesDeUltrasonido(ds, cols, rows);
  const metodo: MetodoRedaccion = regs.length > 0 ? 'region' : 'banda_superior';
  const revision_manual = metodo === 'banda_superior';
  const bandaFin = metodo === 'banda_superior' ? Math.ceil(rows * BANDA_SUPERIOR_FRAC) : 0;

  const frameLen = rows * cols * samples * bpp;
  const planeLen = rows * cols * bpp; // por muestra (para planar)
  let redactados = 0;

  // Ennegrece un rango de columnas [a,b] de una fila (todas las muestras) → valor 0.
  const negrearRango = (view: Uint8Array, frameBase: number, row: number, a: number, b: number): void => {
    if (b < a) return;
    if (planar) {
      for (let s = 0; s < samples; s++) {
        const filaBase = frameBase + s * planeLen + row * cols * bpp;
        view.fill(0, filaBase + a * bpp, filaBase + (b + 1) * bpp);
      }
    } else {
      const filaBase = frameBase + row * cols * samples * bpp;
      view.fill(0, filaBase + a * samples * bpp, filaBase + (b + 1) * samples * bpp);
    }
    redactados += (b - a + 1);
  };

  for (const buf of buffers) {
    const view = new Uint8Array(buf);
    const framesEnBuf = Math.max(1, Math.floor(buf.byteLength / frameLen));
    for (let f = 0; f < framesEnBuf; f++) {
      const frameBase = f * frameLen;
      for (let row = 0; row < rows; row++) {
        // Intervalos a CONSERVAR en esta fila; el complemento se ennegrece.
        const keep: Array<[number, number]> =
          metodo === 'region'
            ? intervalosFila(regs, row, cols)
            : row < bandaFin
              ? [] // banner: se ennegrece toda la fila
              : [[0, cols - 1]]; // fuera del banner: se conserva entera
        // Ennegrece [0..cols-1] menos los intervalos conservados.
        let cursor = 0;
        for (const [a, b] of keep) {
          if (a > cursor) negrearRango(view, frameBase, row, cursor, a - 1);
          cursor = Math.max(cursor, b + 1);
        }
        if (cursor <= cols - 1) negrearRango(view, frameBase, row, cursor, cols - 1);
      }
    }
  }

  return { metodo, revision_manual, regiones: regs.length, pixeles_redactados: redactados };
}
