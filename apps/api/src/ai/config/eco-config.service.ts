import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { cargarConfigActiva } from './eco-config.repositorio';
import { renderizarPlantilla, type ResultadoRender } from './plantilla';
import type { EcoConfig } from './eco-config.tipos';

/**
 * Carga y sirve la configuración de Eco (§7A). Es el ÚNICO punto por el que el
 * engine obtiene su config: prompts, parámetros, umbral y modelo por paso. Nada
 * hardcodeado — todo viene de `lxp.eco_config`.
 *
 * Cachea la config activa (con TTL corto) para no golpear la BD en cada evaluación
 * de un lote; `invalidar()` la recarga cuando el súper admin la edita (5.5).
 */
@Injectable()
export class EcoConfigService {
  private readonly logger = new Logger(EcoConfigService.name);
  private cache?: { config: EcoConfig; expira: number };
  /** TTL del cache de config (ms). Corto: la config cambia poco pero debe propagar. */
  private static readonly TTL_MS = 30_000;

  constructor(private readonly db: DbService) {}

  /** Config activa, cacheada. Lanza si no hay ninguna configurada (no adivina). */
  async activa(): Promise<EcoConfig> {
    const ahora = Date.now();
    if (this.cache && this.cache.expira > ahora) return this.cache.config;

    const config = await cargarConfigActiva(this.db.sql);
    if (!config) {
      throw new ServiceUnavailableException(
        'Eco no tiene una configuración activa en lxp.eco_config. Configúrala antes de evaluar.',
      );
    }
    this.cache = { config, expira: ahora + EcoConfigService.TTL_MS };
    return config;
  }

  /** Fuerza recargar en la próxima lectura (tras editar la config). */
  invalidar(): void {
    this.cache = undefined;
    this.logger.log('Cache de config de Eco invalidado.');
  }

  /**
   * Renderiza el user prompt de la config activa con las variables del caso
   * (verdad, rúbrica, respuesta…). Registra variables faltantes de la plantilla:
   * son señal de config mal formada, no motivo de fallo duro (§7A: robusto).
   */
  async renderizarUserPrompt(vars: Record<string, unknown>): Promise<ResultadoRender> {
    const { userPromptTemplate } = await this.activa();
    const render = renderizarPlantilla(userPromptTemplate, vars);
    if (render.faltantes.length) {
      this.logger.warn(
        `Plantilla de Eco pide variables no provistas: ${render.faltantes.join(', ')}.`,
      );
    }
    return render;
  }
}
