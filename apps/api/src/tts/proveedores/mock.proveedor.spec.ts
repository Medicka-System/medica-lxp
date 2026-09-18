import { MockTtsProvider } from './mock.proveedor';
import type { SolicitudTTS } from './tts-proveedor.interface';

describe('MockTtsProvider (WAV determinista para dev/tests)', () => {
  const mock = new MockTtsProvider();
  const base: SolicitudTTS = {
    texto: 'Hola mundo',
    modelo: 'tts-1',
    voz: 'nova',
    velocidad: 1,
    formato: 'wav',
  };

  it('devuelve un WAV con cabecera RIFF/WAVE válida', async () => {
    const r = await mock.sintetizar(base);
    expect(r.proveedor).toBe('mock');
    expect(r.mime).toBe('audio/wav');
    expect(r.audio.slice(0, 4).toString('ascii')).toBe('RIFF');
    expect(r.audio.slice(8, 12).toString('ascii')).toBe('WAVE');
    expect(r.audio.length).toBeGreaterThan(44); // cabecera + datos
  });

  it('es DETERMINISTA: mismo texto → mismo audio', async () => {
    const a = await mock.sintetizar(base);
    const b = await mock.sintetizar(base);
    expect(a.audio.equals(b.audio)).toBe(true);
  });

  it('el tamaño crece con la longitud del texto', async () => {
    const corto = await mock.sintetizar({ ...base, texto: 'a' });
    const largo = await mock.sintetizar({ ...base, texto: 'a'.repeat(50) });
    expect(largo.audio.length).toBeGreaterThan(corto.audio.length);
  });
});
