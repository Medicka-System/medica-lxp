import {
  firmaZoom,
  mensajeZoom,
  tokenValidacionUrl,
  validarFirmaZoom,
} from './firma-zoom';

const SECRET = 'zoom_webhook_secret_de_prueba';
const AHORA = new Date('2026-09-18T12:00:00.000Z');
const TS = String(Math.floor(AHORA.getTime() / 1000));
const CUERPO = JSON.stringify({ event: 'recording.completed', payload: { object: { id: '999' } } });

describe('firma-zoom', () => {
  it('el mensaje canónico es v0:{ts}:{cuerpo}', () => {
    expect(mensajeZoom('123', 'x')).toBe('v0:123:x');
  });

  it('valida una firma correcta dentro de la ventana', () => {
    const firma = firmaZoom(SECRET, TS, CUERPO);
    expect(firma.startsWith('v0=')).toBe(true);
    expect(
      validarFirmaZoom({ secret: SECRET, timestamp: TS, cuerpoCrudo: CUERPO, firma, ahora: AHORA }),
    ).toBe(true);
  });

  it('rechaza una firma con secreto distinto', () => {
    const firma = firmaZoom('otro_secreto', TS, CUERPO);
    expect(
      validarFirmaZoom({ secret: SECRET, timestamp: TS, cuerpoCrudo: CUERPO, firma, ahora: AHORA }),
    ).toBe(false);
  });

  it('rechaza si el cuerpo fue alterado', () => {
    const firma = firmaZoom(SECRET, TS, CUERPO);
    expect(
      validarFirmaZoom({
        secret: SECRET,
        timestamp: TS,
        cuerpoCrudo: CUERPO + 'x',
        firma,
        ahora: AHORA,
      }),
    ).toBe(false);
  });

  it('rechaza fuera de la ventana anti-replay', () => {
    const firma = firmaZoom(SECRET, TS, CUERPO);
    const tarde = new Date(AHORA.getTime() + 10 * 60 * 1000); // +10 min
    expect(
      validarFirmaZoom({ secret: SECRET, timestamp: TS, cuerpoCrudo: CUERPO, firma, ahora: tarde }),
    ).toBe(false);
  });

  it('rechaza firma/secreto/timestamp vacíos', () => {
    expect(validarFirmaZoom({ secret: '', timestamp: TS, cuerpoCrudo: CUERPO, firma: 'v0=x' })).toBe(
      false,
    );
    expect(validarFirmaZoom({ secret: SECRET, timestamp: '', cuerpoCrudo: CUERPO, firma: 'v0=x' })).toBe(
      false,
    );
  });

  it('el challenge de url_validation es HMAC del plainToken', () => {
    const t = tokenValidacionUrl(SECRET, 'abc123');
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    // Determinista.
    expect(tokenValidacionUrl(SECRET, 'abc123')).toBe(t);
    expect(tokenValidacionUrl(SECRET, 'otro')).not.toBe(t);
  });
});
