/**
 * Constante del LOTE de Eco en Entregas (§7A). El pre-análisis por entrega ya es REAL
 * (lee `lxp.eco_propuestas` en `detalle-entrega`). La escala ya es 0–10 nativa (mig 0095),
 * así que el "Confirmar en lote" ya NO está bloqueado por escala — solo falta cablear su
 * UI (frente aparte). Hasta entonces el botón del lote usa este número de EJEMPLO y abre
 * un aviso (no asienta nada).
 */

/** Nº de entregas que Eco confirmaría en lote — EJEMPLO (el lote no está cableado aún). */
export const ECO_LOTE_EJEMPLO = 2;
