/**
 * Firma ESTABLE/cacheable para `media/imagenes/*` (Fase 1 entrega). Verifica que la URL es
 * BYTE-IDÉNTICA dentro de la ventana (el navegador cachea por URL → 0 re-descarga) y que
 * cambia UNA vez al cruzar la ventana, con expiry holgado que cubre el cruce.
 */
import { StorageService } from './storage.service';

const REF = 'media/imagenes/f2ebb440.jpg';
const qs = (u: string) => Object.fromEntries(new URL(u).searchParams);

describe('StorageService.firmarLecturaEstable', () => {
  const prev = { ...process.env };
  beforeAll(() => {
    process.env.STORAGE_ACCESS_KEY_ID = 'lxpminio';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'lxpminio_dev_secret';
    process.env.STORAGE_ENDPOINT_PUBLICO = 'http://localhost:9000';
    process.env.STORAGE_BUCKET = 'campus-lxp-media';
  });
  afterAll(() => {
    process.env = prev;
  });

  it('dos renders en la MISMA ventana → URL byte-idéntica (diff=0)', () => {
    const s = new StorageService();
    const u1 = s.firmarLecturaEstable(REF, new Date('2026-10-10T12:05:00Z'), true);
    const u2 = s.firmarLecturaEstable(REF, new Date('2026-10-10T12:55:00Z'), true);
    expect(u1).toBe(u2);
  });

  it('cruzar la ventana → la URL cambia UNA vez', () => {
    const s = new StorageService();
    const dentro = s.firmarLecturaEstable(REF, new Date('2026-10-10T12:55:00Z'), true);
    const siguiente = s.firmarLecturaEstable(REF, new Date('2026-10-10T13:00:01Z'), true);
    expect(dentro).not.toBe(siguiente);
    // Ancladas al inicio de su hora (12:00 vs 13:00).
    expect(qs(dentro)['X-Amz-Date']).toBe('20261010T120000Z');
    expect(qs(siguiente)['X-Amz-Date']).toBe('20261010T130000Z');
  });

  it('expiry holgado (2 h) que cubre el cruce de ventana → la imagen no se rompe', () => {
    const s = new StorageService();
    const u = s.firmarLecturaEstable(REF, new Date('2026-10-10T12:55:00Z'), true);
    // Anclada a 12:00 + 7200 s = válida hasta 14:00 → cubre con holgura el cruce de 13:00.
    expect(qs(u)['X-Amz-Expires']).toBe('7200');
    expect(qs(u)['X-Amz-Date']).toBe('20261010T120000Z');
  });

  it('firma NO estable (vieja) SÍ cambiaba por render (contraste)', () => {
    const s = new StorageService();
    const f1 = s.firmarLectura(REF, new Date('2026-10-10T12:05:00Z'), true);
    const f2 = s.firmarLectura(REF, new Date('2026-10-10T12:55:00Z'), true);
    expect(f1).not.toBe(f2); // distinto X-Amz-Date por render → no cacheable
  });
});
