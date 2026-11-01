/**
 * Armado del SHELL mismo-origen del player SCORM (§7). El SCO debe ser MISMO ORIGEN que el
 * shell para alcanzar `window.parent.API`; el `index.html` del paquete vive en MinIO (otro
 * origen). Solución: el shell (servido desde el origen de la app) incrusta el `index.html`
 * (bajado server-side) en un `<iframe srcdoc>` — el srcdoc HEREDA el origen del shell → el SCO
 * ve `window.parent.API` sin postMessage. Un `<base href>` → MinIO hace que los ASSETS pesados
 * (js/css/img, rutas relativas) sigan cargando directo del storage; solo el `index.html` se
 * re-sirve. El runtime (window.API/API_1484_11) va en el `<head>` del shell (padre).
 *
 * Funciones PURAS (testeables); el route handler solo orquesta I/O.
 */

/** Inserta `<base href>` tras el primer `<head…>` (o lo sintetiza) — gana el primer `<base>`. */
export function inyectarBase(indexHtml: string, baseHref: string): string {
  const base = `<base href="${baseHref.replace(/"/g, '&quot;')}">`;
  const m = /<head[^>]*>/i.exec(indexHtml);
  if (m) {
    const at = m.index + m[0].length;
    return indexHtml.slice(0, at) + base + indexHtml.slice(at);
  }
  const h = /<html[^>]*>/i.exec(indexHtml);
  if (h) {
    const at = h.index + h[0].length;
    return indexHtml.slice(0, at) + `<head>${base}</head>` + indexHtml.slice(at);
  }
  return `<head>${base}</head>` + indexHtml;
}

/** Escapa un HTML para ponerlo como valor del atributo `srcdoc` (comillas dobles). */
export function escaparSrcdoc(html: string): string {
  return html.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Deriva el `baseHref` (directorio) de la URL del entryPoint — todo hasta el último `/`. */
export function baseDeLanzador(lanzadorUrl: string): string {
  const i = lanzadorUrl.lastIndexOf('/');
  return i >= 0 ? lanzadorUrl.slice(0, i + 1) : lanzadorUrl;
}

/**
 * Documento HTML del shell padre: runtime en `<head>`, SCO en `<iframe srcdoc>` (mismo origen).
 * `indexHtml` ya debe venir con `<base>` inyectado (`inyectarBase`).
 */
export function construirShellHtml(opts: {
  runtimeScript: string;
  indexHtmlConBase: string;
  titulo: string;
}): string {
  const titulo = opts.titulo.replace(/</g, '&lt;');
  const srcdoc = escaparSrcdoc(opts.indexHtmlConBase);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>html,body{margin:0;height:100%;background:#0f2d52}#sco{display:block;width:100%;height:100%;border:0}</style>
<script>${opts.runtimeScript}</script>
</head>
<body>
<iframe id="sco" title="${titulo}" srcdoc="${srcdoc}" allow="fullscreen" referrerpolicy="no-referrer"></iframe>
</body>
</html>`;
}
