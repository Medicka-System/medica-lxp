import * as dcmjs from 'dcmjs';
import {
  anonimizarDicomBinario,
  espaciadoDeDataset,
  regionUltrasonidoDataset,
} from './anonimizacion-binaria';

const { DicomMessage, DicomMetaDictionary, DicomDict } = dcmjs.data;

/**
 * Construye un `.dcm` P10 sintético (8×8 MONOCHROME2) con PII + tags clínicos +
 * una etiqueta privada, para ejercitar la anonimización binaria real (dcmjs).
 */
function dcmConPII(overrides: Record<string, unknown> = {}): ArrayBuffer {
  const meta = {
    MediaStorageSOPClassUID: '1.2.840.10008.5.1.4.1.1.6.1',
    MediaStorageSOPInstanceUID: '1.2.3.4.5',
    TransferSyntaxUID: '1.2.840.10008.1.2.1', // Explicit VR Little Endian
  };
  const pixels = new Uint8Array(64).fill(128);
  const dict = new DicomDict(meta);
  dict.dict = DicomMetaDictionary.denaturalizeDataset({
    // PII (debe desaparecer)
    PatientName: 'DOE^JANE',
    PatientID: 'MRN-42',
    PatientBirthDate: '19800101',
    ReferringPhysicianName: 'HOUSE^G',
    InstitutionName: 'Hospital Central',
    AccessionNumber: 'ACC-9',
    StudyID: 'STID-1',
    // clínico (debe permanecer)
    Modality: 'US',
    StudyDescription: 'POCUS Abdomen',
    SeriesDescription: 'Rinon derecho',
    StudyInstanceUID: '1.2.3',
    SeriesInstanceUID: '1.2.3.9',
    SOPInstanceUID: '1.2.3.4.5',
    SOPClassUID: '1.2.840.10008.5.1.4.1.1.6.1',
    Rows: 8,
    Columns: 8,
    SamplesPerPixel: 1,
    PhotometricInterpretation: 'MONOCHROME2',
    BitsAllocated: 8,
    BitsStored: 8,
    HighBit: 7,
    PixelRepresentation: 0,
    NumberOfFrames: 1,
    PixelData: [pixels.buffer],
    ...overrides,
  });
  const buf = Buffer.from(dict.write());
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** Re-lee un `.dcm` y lo naturaliza (para aseverar sobre el resultado). */
function releer(buffer: Buffer): Record<string, unknown> {
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  return DicomMetaDictionary.naturalizeDataset(DicomMessage.readFile(ab).dict);
}

describe('anonimizarDicomBinario', () => {
  it('remueve la PII del binario y conserva lo clínico + el pixel-data', () => {
    const { buffer, series } = anonimizarDicomBinario(dcmConPII());
    const nat = releer(buffer);

    // PII fuera.
    for (const k of [
      'PatientName',
      'PatientID',
      'PatientBirthDate',
      'ReferringPhysicianName',
      'InstitutionName',
      'AccessionNumber',
      'StudyID',
    ]) {
      expect(nat[k]).toBeUndefined();
    }

    // Clínico intacto.
    expect(nat.Modality).toBe('US');
    expect(nat.SeriesDescription).toBe('Rinon derecho');
    expect(nat.Rows).toBe(8);
    expect(nat.Columns).toBe(8);

    // Pixel-data preservado (8×8 = 64 bytes).
    const px = nat.PixelData as ArrayBuffer[] | undefined;
    expect(px?.[0]?.byteLength).toBe(64);

    // Series derivadas.
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ modalidad: 'US', frames: 1, instancias: 1 });
  });

  it('produce una traza auditable de lo removido (§10)', () => {
    const { traza } = anonimizarDicomBinario(dcmConPII());
    expect(traza.verificado).toBe(true);
    expect(traza.series_procesadas).toBe(1);
    expect(traza.campos_removidos).toContain('PatientName');
    expect(traza.campos_removidos).toContain('AccessionNumber');
    // 7 campos PII con valor.
    expect(traza.removidos_n).toBeGreaterThanOrEqual(7);
  });

  it('refleja el cine-loop multi-frame en frames', () => {
    const px = new Uint8Array(64 * 3).fill(90);
    const { series } = anonimizarDicomBinario(
      dcmConPII({ NumberOfFrames: 3, PixelData: [px.buffer] }),
    );
    expect(series[0]?.frames).toBe(3);
  });

  it('lanza si la entrada no es un DICOM P10 válido (§5: no traga excepciones)', () => {
    const basura = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    expect(() => anonimizarDicomBinario(basura)).toThrow(/DICOM P10/);
  });

  it('extrae el aspect ratio real de USG (Pixel Aspect Ratio 2:1) en la serie', () => {
    const { series } = anonimizarDicomBinario(dcmConPII({ PixelAspectRatio: [2, 1] }));
    expect(series[0]?.pixelSpacing).toEqual([2, 1]);
  });

  it('sin datos de aspecto → pixelSpacing null (píxel cuadrado)', () => {
    expect(anonimizarDicomBinario(dcmConPII()).series[0]?.pixelSpacing).toBeNull();
  });
});

describe('espaciadoDeDataset (aspect ratio de USG)', () => {
  it('prioriza PixelSpacing [row, col] en mm', () => {
    expect(espaciadoDeDataset({ PixelSpacing: [0.3, 0.2], PixelAspectRatio: [2, 1] })).toEqual([0.3, 0.2]);
  });

  it('usa la región de ultrasonido en cm (unidad 3) → mm ×10', () => {
    const ds = {
      SequenceOfUltrasoundRegions: [
        { PhysicalDeltaX: 0.02, PhysicalDeltaY: 0.03, PhysicalUnitsXDirection: 3, PhysicalUnitsYDirection: 3 },
      ],
    };
    expect(espaciadoDeDataset(ds)).toEqual([0.3, 0.2]);
  });

  it('cae a Pixel Aspect Ratio (vertical\\horizontal → col 1)', () => {
    expect(espaciadoDeDataset({ PixelAspectRatio: [3, 2] })).toEqual([1.5, 1]);
  });

  it('1:1 o sin datos → null', () => {
    expect(espaciadoDeDataset({ PixelAspectRatio: [1, 1] })).toBeNull();
    expect(espaciadoDeDataset({})).toBeNull();
  });
});

describe('regionUltrasonidoDataset (auto-encuadre)', () => {
  it('devuelve la caja [x0,y0,x1,y1] de una sola región', () => {
    const ds = {
      SequenceOfUltrasoundRegions: [
        { RegionLocationMinX0: 120, RegionLocationMinY0: 60, RegionLocationMaxX1: 900, RegionLocationMaxY1: 700 },
      ],
    };
    expect(regionUltrasonidoDataset(ds)).toEqual([120, 60, 900, 700]);
  });

  it('une (bounding box) varias regiones', () => {
    const ds = {
      SequenceOfUltrasoundRegions: [
        { RegionLocationMinX0: 120, RegionLocationMinY0: 60, RegionLocationMaxX1: 500, RegionLocationMaxY1: 400 },
        { RegionLocationMinX0: 80, RegionLocationMinY0: 100, RegionLocationMaxX1: 900, RegionLocationMaxY1: 700 },
      ],
    };
    expect(regionUltrasonidoDataset(ds)).toEqual([80, 60, 900, 700]);
  });

  it('acepta valores en string y redondea', () => {
    const ds = {
      SequenceOfUltrasoundRegions: [
        { RegionLocationMinX0: '120', RegionLocationMinY0: '60', RegionLocationMaxX1: '900.4', RegionLocationMaxY1: '700' },
      ],
    };
    expect(regionUltrasonidoDataset(ds)).toEqual([120, 60, 900, 700]);
  });

  it('ignora regiones con límites incompletos o degenerados', () => {
    expect(
      regionUltrasonidoDataset({
        SequenceOfUltrasoundRegions: [{ RegionLocationMinX0: 10, RegionLocationMinY0: 10 }],
      }),
    ).toBeNull();
    expect(
      regionUltrasonidoDataset({
        SequenceOfUltrasoundRegions: [
          { RegionLocationMinX0: 100, RegionLocationMinY0: 100, RegionLocationMaxX1: 100, RegionLocationMaxY1: 200 },
        ],
      }),
    ).toBeNull();
  });

  it('sin regiones → null', () => {
    expect(regionUltrasonidoDataset({})).toBeNull();
  });
});
