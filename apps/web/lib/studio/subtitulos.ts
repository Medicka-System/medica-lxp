/**
 * Parser de subtítulos (WebVTT / SRT) → `CueTranscripcion[]` (§5B · lección VIDEO).
 *
 * Módulo PURO (sin React ni server-only): lo usa el editor de la lección VIDEO para
 * dejar SUBIR una transcripción y guardarla en `lecciones.config`. La generación
 * AUTOMÁTICA de la transcripción es del worker (§8 · pendiente de API); esto cubre el
 * camino "el diseñador ya tiene el .vtt/.srt" sin depender del backend.
 *
 * Soporta los dos formatos que exportan las herramientas comunes:
 *   · WebVTT  — `00:00:01.000 --> 00:00:04.000`  (voz opcional `<v Nombre>…`)
 *   · SubRip  — `00:00:01,000 --> 00:00:04,000`
 */

import type { CueTranscripcion } from '@/components/bloques/contratos';

/** `HH:MM:SS.mmm` / `MM:SS.mmm` (coma o punto en los milisegundos) → segundos. */
function aSegundos(sello: string): number | null {
  const limpio = sello.trim().replace(',', '.');
  const partes = limpio.split(':');
  if (partes.length < 2 || partes.length > 3) return null;
  const nums = partes.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const [h, m, s] = partes.length === 3 ? nums : [0, nums[0]!, nums[1]!];
  return h! * 3600 + m! * 60 + s!;
}

/** Extrae locutor de una etiqueta de voz VTT `<v Nombre>texto` (si la hay). */
function extraerLocutor(texto: string): { texto: string; locutor?: string } {
  const voz = texto.match(/^<v\s+([^>]+)>([\s\S]*)$/i);
  if (voz) {
    return { locutor: voz[1]!.trim(), texto: voz[2]!.replace(/<\/v>/i, '').trim() };
  }
  // Convención "Nombre: texto" al inicio de la primera línea.
  const dosPuntos = texto.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ .]{2,30}):\s+([\s\S]+)$/);
  if (dosPuntos) return { locutor: dosPuntos[1]!.trim(), texto: dosPuntos[2]!.trim() };
  return { texto };
}

/** Quita etiquetas de estilo VTT inline (`<c>`, `<i>`, `<00:00:01.000>`…). */
function limpiarInline(texto: string): string {
  return texto.replace(/<[^>]+>/g, '').trim();
}

/** Quita un BOM inicial (U+FEFF) sin escribir el carácter en el código fuente. */
function sinBom(texto: string): string {
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

/**
 * Parsea un archivo WebVTT o SRT a cues ordenados por inicio. Ignora encabezados
 * (`WEBVTT`), índices numéricos y bloques `NOTE`; tolera saltos `\r\n`. Devuelve `[]`
 * si no encuentra ningún cue válido (el editor muestra su estado vacío).
 */
export function parsearSubtitulos(contenido: string): CueTranscripcion[] {
  const bloques = sinBom(contenido.replace(/\r\n/g, '\n')).split(/\n{2,}/);

  const cues: CueTranscripcion[] = [];
  for (const bloque of bloques) {
    const lineas = bloque.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lineas.length === 0) continue;
    if (/^WEBVTT/i.test(lineas[0]!) || /^NOTE\b/i.test(lineas[0]!)) continue;

    // La línea del tiempo puede venir tras un índice numérico o un identificador de cue.
    const iTiempo = lineas.findIndex((l) => l.includes('-->'));
    if (iTiempo === -1) continue;

    const [ini, resto] = lineas[iTiempo]!.split('-->');
    if (!ini || !resto) continue;
    const inicio = aSegundos(ini);
    // El fin puede traer settings VTT tras el sello (`... align:start`): corta al 1er token.
    const fin = aSegundos(resto.trim().split(/\s+/)[0] ?? '');
    if (inicio === null || fin === null) continue;

    const cuerpo = lineas.slice(iTiempo + 1).join(' ').trim();
    if (!cuerpo) continue;
    const { texto, locutor } = extraerLocutor(cuerpo);
    const textoLimpio = limpiarInline(texto);
    if (!textoLimpio) continue;
    cues.push(locutor ? { inicio, fin, texto: textoLimpio, locutor } : { inicio, fin, texto: textoLimpio });
  }

  return cues.sort((a, b) => a.inicio - b.inicio);
}
