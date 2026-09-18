import { Injectable, Logger } from '@nestjs/common';
import type { LLMProvider } from './proveedor.interface';
import { MockProvider } from './mock.proveedor';
import { AnthropicProvider } from './anthropic.proveedor';

/**
 * Resuelve QUÉ adaptador de LLM usar (§7A, model-agnóstico). El nombre del proveedor
 * viene de la config del paso (`lxp.eco_config.modelos.<paso>.proveedor`); el factory
 * mapea ese nombre a una implementación.
 *
 * Regla de seguridad de este sprint: si el proveedor real no está cableado
 * (`ECO_PROVIDER=mock` o falta `ANTHROPIC_API_KEY`), SIEMPRE cae al MOCK. Así el
 * sistema corre sin credenciales y "enchufar el modelo real" es cambiar un valor de
 * entorno, no de código.
 */
@Injectable()
export class ProveedorFactory {
  private readonly logger = new Logger(ProveedorFactory.name);

  constructor(
    private readonly mock: MockProvider,
    private readonly anthropic: AnthropicProvider,
  ) {}

  /** Devuelve el adaptador para el `proveedor` pedido, con fallback seguro a mock. */
  obtener(proveedor: string): LLMProvider {
    // Interruptor global: fuerza mock aunque la config pida otro proveedor.
    const forzarMock = (process.env.ECO_PROVIDER ?? 'mock').toLowerCase() === 'mock';
    if (forzarMock) return this.mock;

    switch (proveedor.toLowerCase()) {
      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          this.logger.warn(
            'Config pide Anthropic pero falta ANTHROPIC_API_KEY; usando MOCK.',
          );
          return this.mock;
        }
        return this.anthropic;
      case 'mock':
        return this.mock;
      default:
        this.logger.warn(`Proveedor "${proveedor}" no reconocido; usando MOCK.`);
        return this.mock;
    }
  }
}
