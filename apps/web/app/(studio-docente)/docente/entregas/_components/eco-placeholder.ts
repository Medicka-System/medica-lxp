/**
 * Constante del LOTE de Eco en Entregas (§7A). El pre-análisis por entrega ya es REAL
 * (lee `lxp.eco_propuestas` en `detalle-entrega`); lo que sigue PENDIENTE es el
 * "Confirmar en lote", bloqueado por el choque de escala 0–100 ↔ 0–10 del asiento de
 * entregas (frente de backend aparte). Hasta entonces el botón del lote usa este número
 * de EJEMPLO y abre un aviso (no asienta nada).
 */

/** Nº de entregas que Eco confirmaría en lote — EJEMPLO (el lote no está conectado). */
export const ECO_LOTE_EJEMPLO = 2;
