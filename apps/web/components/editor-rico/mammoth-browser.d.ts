/**
 * mammoth publica su bundle standalone de navegador (`mammoth.browser.js`) sin
 * declaraciones de tipos. Declaramos aquí la superficie mínima que usa el
 * importador de Word (§3) para no perder el strict del repo.
 */
declare module 'mammoth/mammoth.browser.js' {
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{
    value: string;
    messages: { message: string }[];
  }>;
  const mammoth: { convertToHtml: typeof convertToHtml };
  export default mammoth;
}
