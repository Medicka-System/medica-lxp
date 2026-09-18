/**
 * Análisis y validación del manifiesto de un paquete de contenido empaquetado
 * (§7 · course builder). PURO (sin adm-zip ni IO): recibe el XML ya extraído y
 * decide el tipo y los metadatos. Así el parseo se testea sin tocar el filesystem.
 *
 *  · SCORM  → `imsmanifest.xml` (Articulate Storyline/Rise, compat material previo).
 *  · xAPI   → `tincan.xml` (Tin Can / xAPI de Articulate; reporta al LRS directo · §7).
 */
import { XMLParser } from 'fast-xml-parser';

export type TipoPaquete = 'scorm' | 'xapi';

export interface ResultadoManifiesto {
  tipo: TipoPaquete;
  titulo: string;
  /** Archivo de arranque (href/launch) relativo a la raíz del paquete. */
  entryPoint: string | null;
  /** Identificador declarado en el manifiesto (si lo hay). */
  identificador: string | null;
  /** Versión SCORM detectada (1.2 / 2004) cuando aplica. */
  version: string | null;
}

/** Entradas de manifiesto candidatas (contenido XML por nombre de archivo raíz). */
export interface ManifiestosCandidatos {
  imsmanifest?: string; // contenido de imsmanifest.xml
  tincan?: string; // contenido de tincan.xml
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  trimValues: true,
});

/** Normaliza a arreglo (fast-xml-parser da objeto para 1, arreglo para N). */
function comoArreglo<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function texto(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // fast-xml-parser puede envolver texto con atributos en { '#text': ... }.
  if (typeof v === 'object' && '#text' in (v as Record<string, unknown>)) {
    return texto((v as Record<string, unknown>)['#text']);
  }
  return null;
}

/**
 * Decide el tipo de paquete y extrae sus metadatos. Prioriza SCORM (imsmanifest)
 * sobre xAPI si ambos existen (Articulate a veces incluye los dos). Lanza si no hay
 * manifiesto válido — un .zip sin manifiesto NO es un paquete de contenido.
 */
export function analizarManifiesto(c: ManifiestosCandidatos): ResultadoManifiesto {
  if (c.imsmanifest && c.imsmanifest.trim()) {
    return analizarScorm(c.imsmanifest);
  }
  if (c.tincan && c.tincan.trim()) {
    return analizarXapi(c.tincan);
  }
  throw new Error(
    'Paquete inválido: no contiene imsmanifest.xml (SCORM) ni tincan.xml (xAPI).',
  );
}

function analizarScorm(xml: string): ResultadoManifiesto {
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`imsmanifest.xml no es XML válido: ${(e as Error).message}`);
  }
  const manifest = doc.manifest as Record<string, unknown> | undefined;
  if (!manifest) {
    throw new Error('imsmanifest.xml sin elemento <manifest>: paquete SCORM inválido.');
  }

  // Título: organizations/organization/title (el primero declarado).
  const organizations = manifest.organizations as Record<string, unknown> | undefined;
  const organization = comoArreglo(organizations?.organization as unknown)[0] as
    | Record<string, unknown>
    | undefined;
  const titulo =
    texto(organization?.title) ??
    texto((manifest.metadata as Record<string, unknown> | undefined)?.title) ??
    'Paquete SCORM';

  // Entry point: primer resource con href.
  const resources = manifest.resources as Record<string, unknown> | undefined;
  const resource = comoArreglo(resources?.resource as unknown)[0] as
    | Record<string, unknown>
    | undefined;
  const entryPoint = (resource?.['@_href'] as string | undefined) ?? null;

  // Versión SCORM: schemaversion de metadata (1.2 vs 2004) si está.
  const metadata = manifest.metadata as Record<string, unknown> | undefined;
  const version = texto(metadata?.schemaversion);

  return {
    tipo: 'scorm',
    titulo,
    entryPoint,
    identificador: (manifest['@_identifier'] as string | undefined) ?? null,
    version,
  };
}

function analizarXapi(xml: string): ResultadoManifiesto {
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`tincan.xml no es XML válido: ${(e as Error).message}`);
  }
  const tincan = doc.tincan as Record<string, unknown> | undefined;
  if (!tincan) {
    throw new Error('tincan.xml sin elemento <tincan>: paquete xAPI inválido.');
  }
  const activities = tincan.activities as Record<string, unknown> | undefined;
  const activity = comoArreglo(activities?.activity as unknown)[0] as
    | Record<string, unknown>
    | undefined;
  if (!activity) {
    throw new Error('tincan.xml sin <activity>: paquete xAPI inválido.');
  }

  const titulo = texto(activity.name) ?? 'Paquete xAPI';
  const entryPoint = texto(activity.launch);
  const identificador = (activity['@_id'] as string | undefined) ?? null;

  return { tipo: 'xapi', titulo, entryPoint, identificador, version: null };
}
