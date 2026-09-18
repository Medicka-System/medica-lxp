import { MockTtsProvider } from './mock.proveedor';
import { OpenAiTtsProvider } from './openai.proveedor';
import { TtsProveedorFactory } from './tts-proveedor.factory';

describe('TtsProveedorFactory (adaptador intercambiable · §3)', () => {
  const mock = new MockTtsProvider();
  const openai = new OpenAiTtsProvider();
  const factory = new TtsProveedorFactory(mock, openai);

  const envOrig = { ...process.env };
  afterEach(() => {
    process.env = { ...envOrig };
  });

  it('con TTS_PROVIDER=mock devuelve SIEMPRE el mock (interruptor global de dev)', () => {
    process.env.TTS_PROVIDER = 'mock';
    process.env.OPENAI_API_KEY = 'sk-existe';
    expect(factory.obtener('openai')).toBe(mock);
  });

  it('con proveedor real cableado (TTS_PROVIDER=openai + key) devuelve OpenAI', () => {
    process.env.TTS_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-existe';
    expect(factory.obtener('openai')).toBe(openai);
  });

  it('pide OpenAI pero sin API key → cae al mock (no revienta el flujo)', () => {
    process.env.TTS_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    expect(factory.obtener('openai')).toBe(mock);
  });

  it('proveedor desconocido → mock', () => {
    process.env.TTS_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-existe';
    expect(factory.obtener('elevenlabs')).toBe(mock);
  });
});
