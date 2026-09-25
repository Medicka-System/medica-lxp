import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../../db/db.service';

/**
 * Telemetría de costo de Eco (§7A · "captura de correcciones / costo"). Registra UNA
 * fila por llamada al LLM en `lxp.eco_uso`: modelo, paso, tokens (entrada/salida/caché),
 * costo calculado y a qué objeto (caso/entrega) correspondió. Es OBSERVABILIDAD, no
 * control: emite una ALERTA (log/flag) al pasar un umbral configurable, pero NUNCA corta
 * (sin cap · este paso). Best-effort: si el registro falla, la evaluación no se rompe.
 */
@Injectable()
export class EcoTelemetriaService {
  private readonly logger = new Logger(EcoTelemetriaService.name);

  constructor(private readonly db: DbService) {}

  /**
   * Precios USD por 1M tokens (aprox., editables). Anthropic cobra el caché aparte:
   * `cacheWrite` (5m) ≈ 1.25× la entrada; `cacheRead` ≈ 0.1× la entrada. Se resuelve por
   * familia del id de modelo (haiku/sonnet/opus); desconocido → tarifa de Sonnet.
   */
  private static readonly PRECIOS: Record<
    string,
    { entrada: number; salida: number; cacheWrite: number; cacheRead: number }
  > = {
    haiku: { entrada: 1, salida: 5, cacheWrite: 1.25, cacheRead: 0.1 },
    sonnet: { entrada: 3, salida: 15, cacheWrite: 3.75, cacheRead: 0.3 },
    opus: { entrada: 15, salida: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  };

  private tarifa(modelo: string): (typeof EcoTelemetriaService.PRECIOS)['sonnet'] {
    const m = modelo.toLowerCase();
    if (m.includes('haiku')) return EcoTelemetriaService.PRECIOS.haiku;
    if (m.includes('opus')) return EcoTelemetriaService.PRECIOS.opus;
    return EcoTelemetriaService.PRECIOS.sonnet;
  }

  /** Costo USD de una llamada, con caché desglosado (la entrada NO incluye lo cacheado). */
  costoDe(
    modelo: string,
    t: { entrada: number; salida: number; cacheWrite?: number; cacheRead?: number },
  ): number {
    const p = this.tarifa(modelo);
    const usd =
      (t.entrada * p.entrada +
        t.salida * p.salida +
        (t.cacheWrite ?? 0) * p.cacheWrite +
        (t.cacheRead ?? 0) * p.cacheRead) /
      1_000_000;
    return Number(usd.toFixed(6));
  }

  /**
   * Registra el consumo de UNA llamada. Sin tokens (p. ej. proveedor que no los reporta)
   * no escribe fila. Nunca lanza: la telemetría no debe tumbar la evaluación.
   */
  async registrar(uso: {
    modelo: string;
    paso: string;
    objetoTipo: string;
    objetoId: string;
    tokens?: { entrada: number; salida: number; cacheWrite?: number; cacheRead?: number };
  }): Promise<void> {
    if (!uso.tokens) return;
    const t = uso.tokens;
    const costo = this.costoDe(uso.modelo, t);
    try {
      await this.db.sql`
        insert into lxp.eco_uso
          (modelo, paso, objeto_tipo, objeto_id, tokens_entrada, tokens_salida,
           tokens_cache_write, tokens_cache_read, costo_usd)
        values (${uso.modelo}, ${uso.paso}, ${uso.objetoTipo}, ${uso.objetoId},
           ${t.entrada}, ${t.salida}, ${t.cacheWrite ?? 0}, ${t.cacheRead ?? 0}, ${costo})`;
      await this.avisarSiExcede(costo);
    } catch (e) {
      this.logger.warn(`No se pudo registrar telemetría de Eco: ${(e as Error).message}`);
    }
  }

  /** Alerta SUAVE: si el gasto del día supera `ECO_COSTO_ALERTA_USD`, lo loggea (no corta). */
  private async avisarSiExcede(costoLlamada: number): Promise<void> {
    const umbral = Number(process.env.ECO_COSTO_ALERTA_USD ?? '');
    if (!Number.isFinite(umbral) || umbral <= 0) return;
    const [row] = await this.db.sql<{ total: number }[]>`
      select coalesce(sum(costo_usd), 0)::float8 as total
      from lxp.eco_uso where created_at >= date_trunc('day', now())`;
    const totalDia = row?.total ?? 0;
    if (totalDia >= umbral) {
      this.logger.warn(
        `⚠ Eco superó el umbral de costo del día: $${totalDia.toFixed(4)} ≥ $${umbral} ` +
          `(última llamada $${costoLlamada.toFixed(6)}). Alerta, NO corte (§7A).`,
      );
    }
  }
}
