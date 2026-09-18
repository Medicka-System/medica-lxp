/**
 * Troceo de texto para RAG (§7A/§8, `indexar-rag`). Puro y determinista: parte el
 * texto en fragmentos de ~`max` caracteres respetando límites de línea/oración
 * cuando puede, con un `solape` para no cortar contexto entre chunks.
 */
export function dividirEnChunks(texto: string, max = 800, solape = 100): string[] {
  const limpio = texto.trim();
  if (!limpio) return [];
  if (limpio.length <= max) return [limpio];

  const chunks: string[] = [];
  let inicio = 0;
  while (inicio < limpio.length) {
    let fin = Math.min(inicio + max, limpio.length);
    // Intenta cortar en un límite natural (salto de línea o punto) hacia atrás.
    if (fin < limpio.length) {
      const ventana = limpio.slice(inicio, fin);
      const corte = Math.max(ventana.lastIndexOf('\n'), ventana.lastIndexOf('. '));
      if (corte > max * 0.5) fin = inicio + corte + 1;
    }
    chunks.push(limpio.slice(inicio, fin).trim());
    if (fin >= limpio.length) break;
    inicio = Math.max(fin - solape, inicio + 1);
  }
  return chunks.filter(Boolean);
}
