import { presignS3 } from './sigv4';

const base = {
  endpoint: 'http://localhost:9000',
  region: 'auto',
  bucket: 'campus-lxp-media',
  accessKey: 'AKIAEJEMPLO',
  secretKey: 'secretoejemplo',
  expiraSeg: 900,
  ahora: new Date('2026-09-17T12:00:00.000Z'),
} as const;

describe('presignS3', () => {
  it('produce una URL SigV4 con los parámetros esperados', () => {
    const url = presignS3({ ...base, metodo: 'PUT', key: 'dicom/crudo/c1/estudio.json' });
    expect(url).toContain('http://localhost:9000/campus-lxp-media/dicom/crudo/c1/estudio.json?');
    expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(url).toContain('X-Amz-Credential=AKIAEJEMPLO%2F20260917%2Fauto%2Fs3%2Faws4_request');
    expect(url).toContain('X-Amz-Date=20260917T120000Z');
    expect(url).toContain('X-Amz-Expires=900');
    expect(url).toMatch(/X-Amz-Signature=[0-9a-f]{64}$/);
  });

  it('es determinista para las mismas entradas', () => {
    const a = presignS3({ ...base, metodo: 'GET', key: 'k/x.json' });
    const b = presignS3({ ...base, metodo: 'GET', key: 'k/x.json' });
    expect(a).toBe(b);
  });

  it('cambia la firma si cambia el método o la key', () => {
    const get = presignS3({ ...base, metodo: 'GET', key: 'k/x.json' });
    const put = presignS3({ ...base, metodo: 'PUT', key: 'k/x.json' });
    const otra = presignS3({ ...base, metodo: 'GET', key: 'k/y.json' });
    expect(get).not.toBe(put);
    expect(get).not.toBe(otra);
  });

  it('exige credenciales', () => {
    expect(() =>
      presignS3({ ...base, metodo: 'GET', key: 'k', accessKey: '', secretKey: '' }),
    ).toThrow(/credenciales/);
  });
});
