/**
 * Contrato del GASTO DE ECO (§7A · telemetría `lxp.eco_uso`). Tipos PUROS (sin
 * server-only ni React): los comparten el loader (`gasto-eco.ts`), el dashboard admin
 * y la analítica. Solo AGREGADOS de costo/tokens — nunca contenido de las llamadas.
 */

/** Un punto de la serie temporal diaria (misma forma que `PuntoSerie` de analítica). */
export type GastoEcoPunto = { x: string; v: number };

/** Gasto desglosado por una dimensión (paso o modelo). */
export type GastoEcoDesglose = {
  etiqueta: string;
  usd: number;
  /** Costo ya formateado (p. ej. `$0.0123`). */
  fmt: string;
  /** Porcentaje del total del periodo (0 si el total es 0). */
  pct: number;
  /** Tokens sumados (solo aplica al desglose por modelo). */
  tokens?: number;
};

export type GastoEco = {
  /** Mes en curso, legible (p. ej. "octubre 2026"). */
  periodo: string;
  moneda: 'USD';
  /** Total del periodo en USD (número crudo, para comparaciones). */
  totalUsd: number;
  /** Total formateado (`$0.00` cuando no hay uso — 0 REAL, no placeholder). */
  totalFmt: string;
  /** Llamadas al LLM registradas en el periodo. */
  llamadas: number;
  /** Tokens totales (entrada+salida+cache) del periodo. */
  tokens: number;
  /** Gasto por paso del pipeline (evaluación/chat/borrador…). */
  porPaso: GastoEcoDesglose[];
  /** Gasto por modelo (Haiku/Sonnet…). */
  porModelo: GastoEcoDesglose[];
  /** Serie diaria de los últimos 30 días (zero-filled). */
  serie: GastoEcoPunto[];
};
