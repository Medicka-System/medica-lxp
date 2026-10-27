/**
 * Tipos de la herencia programa→grupo. La fuente de verdad del shape vive en
 * `@campus/shared` (dominio/herencia) para que `apps/api` y `apps/web` compartan el
 * MISMO contrato (sin divergencia). Este archivo re-exporta para no cambiar los
 * imports internos del `api`.
 */
export type {
  EntidadOverride,
  OverrideCrudo,
  ContenidoTpl,
  ActividadTpl,
  BloqueTpl,
  LeccionTpl,
  ModuloTpl,
  ProgramaTpl,
  MetaHerencia,
  ConHerencia,
  ContenidoResuelto,
  ActividadResuelta,
  LeccionResuelta,
  ModuloResuelto,
  AvisoResync,
  ResumenHerencia,
  VistaEfectiva,
} from '@campus/shared';
