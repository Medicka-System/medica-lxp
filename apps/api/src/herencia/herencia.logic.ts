/**
 * Lógica PURA de la herencia programa→grupo. La implementación vive en
 * `@campus/shared` (dominio/herencia) — contrato ÚNICO compartido con `apps/web`.
 * Este archivo re-exporta para no cambiar los imports internos del `api` ni sus
 * tests (`herencia.logic.spec.ts` sigue apuntando aquí).
 */
export {
  CAMPOS_PERMITIDOS,
  validarPatch,
  resolverHerencia,
  existeEntidad,
  detectarResync,
} from '@campus/shared';
export type { PatchValidado } from '@campus/shared';
