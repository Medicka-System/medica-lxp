import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import type { Logger } from '@nestjs/common';
import type { H5PEditor, IUser } from '@lumieducation/h5p-server';

/**
 * Siembra del servidor H5P (§5C/§7 · P2). El volumen `H5P_DATA_DIR` nace VACÍO y
 * `@lumieducation/h5p-server` NO trae ni el core/editor cliente ni content types: hay
 * que instalarlos. Esto corre una sola vez (idempotente) y queda persistido en el
 * volumen, así sobrevive deploys y recreaciones del contenedor.
 *
 *   · CORE   (h5p-php-library)        → `${dataDir}/core`   → servido en `/h5p/core`
 *   · EDITOR (h5p-editor-php-library) → `${dataDir}/editor` → servido en `/h5p/editor`
 *   · CONTENT TYPES (set común)       → `${dataDir}/libraries` (vía library manager)
 *
 * El core/editor se bajan de los releases oficiales de H5P en GitHub, fijados a la
 * versión que declara el server (`h5pVersion` = 1.27.0 en h5p-server 10.x).
 */

// El CORE (h5p-php-library) versiona en la línea semver clásica; `1.27.0` es la que
// declara `@lumieducation/h5p-server` 10.x (`h5pVersion`). El EDITOR (h5p-editor-php-
// library) dejó la línea 1.x en `1.25` y pasó al esquema `wp-*` (snapshots del plugin de
// WordPress); `wp-1.16.0` es el editor que H5P empareja con el core 1.27 (WP plugin 1.16).
// Por eso son DOS versiones distintas (el tag 1.27.0 NO existe en el repo del editor).
export const H5P_CORE_VERSION = '1.27.0';
export const H5P_EDITOR_VERSION = 'wp-1.16.0';

const FUENTE_CORE = `https://github.com/h5p/h5p-php-library/archive/refs/tags/${H5P_CORE_VERSION}.zip`;
const FUENTE_EDITOR = `https://github.com/h5p/h5p-editor-php-library/archive/refs/tags/${H5P_EDITOR_VERSION}.zip`;

/**
 * Set común educativo (§5C) por `machineName` del Hub. `installLibraryFromHub` instala
 * también sus dependencias (p. ej. H5P.Question, FontAwesome…), así que el set efectivo
 * instalado es mayor. Los que el Hub no tenga disponibles se reportan y se omiten.
 */
export const SET_COMUN = [
  'H5P.InteractiveVideo',
  'H5P.CoursePresentation',
  'H5P.QuestionSet',
  'H5P.MultiChoice',
  'H5P.DragQuestion', // Drag and Drop
  'H5P.Blanks', // Fill in the Blanks
  'H5P.Flashcards',
  'H5P.TrueFalse',
  'H5P.MarkTheWords',
  'H5P.Summary',
] as const;

async function descargarZip(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`descarga ${url} → HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Descarga un release de GitHub y lo deja en `destino` (sin la carpeta raíz que mete
 * GitHub). Idempotente: si `centinela` ya existe, no hace nada. Extrae a `${destino}.tmp`
 * y mueve la única carpeta raíz del zip a `destino` (rename atómico en el mismo volumen).
 */
async function instalarEstatico(
  url: string,
  destino: string,
  centinela: string,
  etiqueta: string,
  logger: Logger,
): Promise<'presente' | 'instalado'> {
  if (existsSync(centinela)) {
    logger.log(`H5P ${etiqueta} ya presente (${destino}).`);
    return 'presente';
  }
  logger.log(`H5P ${etiqueta}: descargando ${url} …`);
  const buf = await descargarZip(url);
  // Carga perezosa: adm-zip no se necesita en los tests (la siembra no corre ahí).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdmZip = require('adm-zip') as typeof import('adm-zip');
  const tmp = `${destino}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  new AdmZip(buf).extractAllTo(tmp, true);
  const raices = await readdir(tmp);
  const raiz = raices[0];
  if (!raiz) throw new Error(`el zip de ${etiqueta} vino vacío`);
  rmSync(destino, { recursive: true, force: true });
  await rename(join(tmp, raiz), destino);
  rmSync(tmp, { recursive: true, force: true });
  logger.log(`H5P ${etiqueta} instalado en ${destino}.`);
  return 'instalado';
}

/** Asegura el core + editor cliente en el volumen (idempotente). */
export async function asegurarCoreEditor(dataDir: string, logger: Logger): Promise<void> {
  mkdirSync(dataDir, { recursive: true });
  await instalarEstatico(
    FUENTE_CORE,
    join(dataDir, 'core'),
    join(dataDir, 'core', 'js', 'h5p.js'),
    'core',
    logger,
  );
  await instalarEstatico(
    FUENTE_EDITOR,
    join(dataDir, 'editor'),
    join(dataDir, 'editor', 'scripts', 'h5peditor.js'),
    'editor',
    logger,
  );
}

/**
 * Instala el set común de content types desde el Hub (idempotente: el library manager
 * salta los ya instalados por versión). Refresca primero la caché del Hub. Reporta qué
 * quedó instalado y qué falló/no estaba disponible, sin abortar por uno que falle.
 */
export async function sembrarContentTypes(
  editor: H5PEditor,
  usuario: IUser,
  logger: Logger,
): Promise<{ instalados: string[]; fallidos: string[] }> {
  try {
    await editor.contentTypeCache.updateIfNecessary();
  } catch (e) {
    logger.warn(`H5P: no se pudo refrescar la caché del Hub: ${(e as Error).message}`);
  }
  const instalados: string[] = [];
  const fallidos: string[] = [];
  for (const machineName of SET_COMUN) {
    try {
      await editor.installLibraryFromHub(machineName, usuario);
      instalados.push(machineName);
      logger.log(`H5P content type OK: ${machineName}`);
    } catch (e) {
      fallidos.push(machineName);
      logger.warn(`H5P content type FALLÓ (${machineName}): ${(e as Error).message}`);
    }
  }
  logger.log(
    `H5P siembra content types: ${instalados.length} ok, ${fallidos.length} fallidos` +
      (fallidos.length ? ` (${fallidos.join(', ')})` : ''),
  );
  return { instalados, fallidos };
}
