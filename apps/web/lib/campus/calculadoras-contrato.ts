/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Calculadoras clínicas (§ Sprint 8, §6). Qué es REAL y qué es PENDIENTE.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * REAL:
 *   • Calculadoras destacadas: cómputo 100% CLIENTE con fórmulas clínicas
 *     estándar (volumen vesical elipsoide, FEVI por Teichholz, edad gestacional por
 *     LCC · Robinson-Fleming). No requieren backend.
 *   • Catálogo: lxp.calculadoras PUBLICADAS (policy calculadoras_select · 0010) — se
 *     leen con RLS (comoAlumno) para listar las que la escuela configure.
 *
 * PENDIENTE:
 *   • Motor genérico que ejecute la `definicion` (inputs/fórmula/salida) de una
 *     calculadora configurada en BD: hoy el catálogo solo se lista; ejecutar una
 *     definición arbitraria es trabajo del diseñador (Studio) + un runner seguro.
 */

/** Entrada de catálogo (calculadora configurada por la escuela en BD). */
export type CalculadoraCatalogo = {
  clave: string;
  nombre: string;
  descripcion: string | null;
};
