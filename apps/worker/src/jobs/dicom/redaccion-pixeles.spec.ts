import { redactarPixeles, regionesDeUltrasonido } from './redaccion-pixeles';

/** Dataset MONOCHROME2 8-bit relleno con 255, con una región US y PixelData buffer. */
function dsMono(
  rows: number,
  cols: number,
  region: { x0: number; y0: number; x1: number; y1: number } | null,
  frames = 1,
): Record<string, unknown> {
  const buf = new ArrayBuffer(rows * cols * frames);
  new Uint8Array(buf).fill(255);
  const ds: Record<string, unknown> = {
    Rows: rows,
    Columns: cols,
    BitsAllocated: 8,
    SamplesPerPixel: 1,
    PhotometricInterpretation: 'MONOCHROME2',
    PixelData: [buf],
  };
  if (frames > 1) ds.NumberOfFrames = String(frames);
  if (region) {
    ds.SequenceOfUltrasoundRegions = [
      {
        RegionLocationMinX0: region.x0,
        RegionLocationMinY0: region.y0,
        RegionLocationMaxX1: region.x1,
        RegionLocationMaxY1: region.y1,
      },
    ];
  }
  return ds;
}

/** ¿El píxel (row,col) del frame f está a 0? (mono 8-bit). */
function px(ds: Record<string, unknown>, row: number, col: number, f = 0): number {
  const cols = ds.Columns as number;
  const rows = ds.Rows as number;
  const buf = (ds.PixelData as ArrayBuffer[])[0]!;
  return new Uint8Array(buf)[f * rows * cols + row * cols + col]!;
}

describe('regionesDeUltrasonido', () => {
  it('lee y acota los rectángulos de la Sequence of US Regions', () => {
    const ds = dsMono(100, 100, { x0: 10, y0: 20, x1: 90, y1: 80 });
    expect(regionesDeUltrasonido(ds, 100, 100)).toEqual([{ x0: 10, y0: 20, x1: 90, y1: 80 }]);
  });
  it('descarta rectángulos inválidos y sin región devuelve []', () => {
    expect(regionesDeUltrasonido({}, 100, 100)).toEqual([]);
  });
});

describe('redactarPixeles — por región (§10)', () => {
  it('ennegrece TODO lo exterior a la región y conserva el interior', () => {
    const ds = dsMono(40, 40, { x0: 10, y0: 8, x1: 30, y1: 32 });
    const r = redactarPixeles(ds);
    expect(r.metodo).toBe('region');
    expect(r.revision_manual).toBe(false);
    // Banner superior (fila 0) → negro. Esquina exterior → negro. Interior → intacto (255).
    expect(px(ds, 0, 20)).toBe(0);
    expect(px(ds, 8, 5)).toBe(0); // dentro de la banda Y pero fuera en X
    expect(px(ds, 39, 39)).toBe(0);
    expect(px(ds, 8, 10)).toBe(255); // borde superior-izq de la región
    expect(px(ds, 32, 30)).toBe(255); // borde inferior-der de la región
    expect(px(ds, 20, 20)).toBe(255); // centro
  });

  it('multi-frame: redacta cada frame igual', () => {
    const ds = dsMono(20, 20, { x0: 5, y0: 5, x1: 15, y1: 15 }, 3);
    redactarPixeles(ds);
    for (const f of [0, 1, 2]) {
      expect(px(ds, 0, 0, f)).toBe(0);
      expect(px(ds, 10, 10, f)).toBe(255);
    }
  });

  it('RGB intercalado (PlanarConfiguration 0): ennegrece las 3 muestras', () => {
    const rows = 10, cols = 10;
    const buf = new ArrayBuffer(rows * cols * 3);
    new Uint8Array(buf).fill(200);
    const ds: Record<string, unknown> = {
      Rows: rows, Columns: cols, BitsAllocated: 8, SamplesPerPixel: 3, PlanarConfiguration: 0,
      PhotometricInterpretation: 'RGB', PixelData: [buf],
      SequenceOfUltrasoundRegions: [{ RegionLocationMinX0: 3, RegionLocationMinY0: 3, RegionLocationMaxX1: 7, RegionLocationMaxY1: 7 }],
    };
    redactarPixeles(ds);
    const v = new Uint8Array(buf);
    // píxel (0,0) exterior → RGB 0,0,0
    expect([v[0], v[1], v[2]]).toEqual([0, 0, 0]);
    // píxel (5,5) interior → intacto
    const i = (5 * cols + 5) * 3;
    expect([v[i], v[i + 1], v[i + 2]]).toEqual([200, 200, 200]);
  });
});

describe('redactarPixeles — fallback sin región (§10)', () => {
  it('ennegrece banda superior 15% y EXIGE revisión manual', () => {
    const ds = dsMono(100, 20, null);
    const r = redactarPixeles(ds);
    expect(r.metodo).toBe('banda_superior');
    expect(r.revision_manual).toBe(true);
    expect(px(ds, 0, 10)).toBe(0); // banda superior → negro
    expect(px(ds, 14, 10)).toBe(0); // aún en la banda (15% de 100 = 15 filas)
    expect(px(ds, 50, 10)).toBe(255); // debajo de la banda → conservado
  });
});
