/**
 * Shim de tipos para `@lumieducation/h5p-server`.
 *
 * Los componentes de `@lumieducation/h5p-react` declaran sus callbacks con tipos que
 * viven en `@lumieducation/h5p-server` (`IEditorModel`, `IPlayerModel`,
 * `IContentMetadata`). Ese paquete es del DOMINIO (§2): corre el servidor H5P self-host
 * en `apps/api`, NO en el bundle del front. Aquí solo necesitamos que TypeScript resuelva
 * los nombres para compilar el cableado del editor/player; el modelo real lo produce la API.
 *
 * Declaración mínima y permisiva — no reimplementa la spec (§7: "no reimplementan la spec").
 */
declare module '@lumieducation/h5p-server' {
  export interface IEditorModel {
    [clave: string]: unknown;
  }
  export interface IPlayerModel {
    [clave: string]: unknown;
  }
  export interface IContentMetadata {
    [clave: string]: unknown;
  }
}
