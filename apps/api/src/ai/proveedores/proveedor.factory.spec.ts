import { ProveedorFactory } from './proveedor.factory';
import { MockProvider } from './mock.proveedor';
import { AnthropicProvider } from './anthropic.proveedor';

describe('ProveedorFactory (model-agnóstico · §7A)', () => {
  const mock = new MockProvider();
  const anthropic = new AnthropicProvider();
  const factory = new ProveedorFactory(mock, anthropic);

  const envOrig = { ...process.env };
  afterEach(() => {
    process.env = { ...envOrig };
  });

  it('con ECO_PROVIDER=mock devuelve SIEMPRE el mock (interruptor global)', () => {
    process.env.ECO_PROVIDER = 'mock';
    process.env.ANTHROPIC_API_KEY = 'sk-existe';
    expect(factory.obtener('anthropic')).toBe(mock);
  });

  it('con proveedor real cableado (ECO_PROVIDER=anthropic + key) devuelve Anthropic', () => {
    process.env.ECO_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-existe';
    expect(factory.obtener('anthropic')).toBe(anthropic);
  });

  it('pide Anthropic pero sin API key → cae al mock (arranca sin credenciales)', () => {
    process.env.ECO_PROVIDER = 'anthropic';
    delete process.env.ANTHROPIC_API_KEY;
    expect(factory.obtener('anthropic')).toBe(mock);
  });

  it('proveedor desconocido → mock', () => {
    process.env.ECO_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-existe';
    expect(factory.obtener('gemini')).toBe(mock);
  });
});
