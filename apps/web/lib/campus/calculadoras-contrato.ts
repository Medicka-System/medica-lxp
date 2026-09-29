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
 *   • Motor genérico: la `definicion` (inputs/fórmula/salida) del catálogo se EJECUTA
 *     en el cliente con un runner seguro (sin `eval`) — ver `calculadoras-motor.ts`.
 *     Si la definición es inválida o no compila, la calculadora se muestra pero no corre.
 *
 * PENDIENTE:
 *   • Constructor de calculadoras en el Studio del diseñador (autoría de la `definicion`):
 *     hoy las del catálogo se siembran/insertan en BD; el motor de ejecución ya está listo.
 */

import type { DefinicionCalculadora } from './calculadoras-motor';

/** Entrada de catálogo (calculadora configurada por la escuela en BD). */
export type CalculadoraCatalogo = {
  clave: string;
  nombre: string;
  descripcion: string | null;
  /** Definición ejecutable ya validada; `null` si el jsonb es inválido/no compila. */
  definicion: DefinicionCalculadora | null;
};
