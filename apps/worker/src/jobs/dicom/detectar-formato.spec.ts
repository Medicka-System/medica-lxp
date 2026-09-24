import { detectarFormato, contentTypeDe } from './detectar-formato';

/** Construye un ArrayBuffer con los bytes dados en el offset 0 (rellena a `len`). */
function buf(bytes: number[], len = bytes.length, offset = 0): ArrayBuffer {
  const u = new Uint8Array(Math.max(len, offset + bytes.length));
  u.set(bytes, offset);
  return u.buffer;
}

describe('detectarFormato (bytes mágicos)', () => {
  it('DICOM P10: «DICM» en el offset 128', () => {
    const ab = buf([0x44, 0x49, 0x43, 0x4d], 132, 128);
    expect(detectarFormato(ab)).toEqual({ tipo: 'dicom', ext: 'dcm' });
  });

  it('ZIP: «PK» al inicio', () => {
    expect(detectarFormato(buf([0x50, 0x4b, 0x03, 0x04]))).toEqual({ tipo: 'zip', ext: 'zip' });
  });

  it('JPEG: «\\xFF\\xD8\\xFF»', () => {
    expect(detectarFormato(buf([0xff, 0xd8, 0xff, 0xe0]))).toEqual({ tipo: 'imagen', ext: 'jpg' });
  });

  it('PNG: «\\x89PNG\\r\\n\\x1a\\n»', () => {
    expect(detectarFormato(buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({
      tipo: 'imagen',
      ext: 'png',
    });
  });

  it('desconocido → fallback DICOM (lo valida dcmjs; si no, el job falla · §10)', () => {
    expect(detectarFormato(buf([0x00, 0x01, 0x02, 0x03]))).toEqual({ tipo: 'dicom', ext: 'dcm' });
  });
});

describe('contentTypeDe', () => {
  it('mapea extensión → content-type S3', () => {
    expect(contentTypeDe('jpg')).toBe('image/jpeg');
    expect(contentTypeDe('png')).toBe('image/png');
    expect(contentTypeDe('dcm')).toBe('application/dicom');
    expect(contentTypeDe('otro')).toBe('application/dicom');
  });
});
