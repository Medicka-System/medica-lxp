/**
 * Prefijo del servidor H5P visto DESDE EL NAVEGADOR (§7 · P1).
 *
 * El editor y el player de H5P (@lumieducation) corren en el browser y pegan a rutas
 * del MISMO origen (`/h5p/*`). Un rewrite de Next (`next.config.mjs`) las reenvía al
 * `api` por la red interna Docker (`API_URL` → `http://api:8000/h5p/*`). Por eso aquí
 * NO se usa `NEXT_PUBLIC_API_URL`: esa apunta al host del web y devolvía 404. Las demás
 * features llaman al api SERVER-SIDE con `API_URL` interno — ese flujo no cambia.
 *
 * Relativo a propósito (sin host): el navegador pega al propio web y el rewrite hace
 * el salto al api.
 */
export const H5P_BASE = '/h5p';
