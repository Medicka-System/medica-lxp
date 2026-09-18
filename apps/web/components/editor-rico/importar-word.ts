/**
 * Importar Word (.docx → HTML) con mammoth (§3). Corre SOLO en el navegador (el
 * bundle standalone `mammoth.browser.js`), así que se carga con import dinámico
 * para no arrastrarlo al SSR ni al bundle inicial.
 *
 * mammoth mapea estilos de Word a HTML semántico (encabezados, listas, negritas,
 * tablas…). Devuelve también avisos (estilos no mapeados) para poder informarlos.
 */

export type ResultadoImportacion = {
  html: string;
  avisos: string[];
};

/** Extensiones aceptadas por el importador. */
export const EXT_WORD = '.docx';

/** Convierte un archivo .docx a HTML listo para inyectar en el editor. */
export async function importarWord(archivo: File): Promise<ResultadoImportacion> {
  // El bundle browser es UMD: según el empaquetador queda en el módulo o en `.default`.
  const mod = await import('mammoth/mammoth.browser.js');
  const mammoth = mod.default ?? mod;

  const arrayBuffer = await archivo.arrayBuffer();
  const resultado = await mammoth.convertToHtml({ arrayBuffer });

  return {
    html: resultado.value,
    avisos: resultado.messages.map((m) => m.message),
  };
}
