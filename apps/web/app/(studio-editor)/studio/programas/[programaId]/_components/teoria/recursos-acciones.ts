'use server';

/**
 * Lecturas para el "Selector de recursos existentes" del editor de teoría (§5C).
 *
 * El selector inserta como BLOQUE un recurso que YA existe en dos fuentes:
 *   · Biblioteca de Contenido (lxp.recursos · video/H5P/PDF/docs) — `getRecursos`.
 *   · Banco de Casos (lxp.casos_biblioteca · casos DICOM curados) — `getCasos`.
 *
 * Son lecturas simples web→Supabase bajo RLS (Regla de Oro §2): reusan las lecturas
 * de `datos.ts` con el `userId` de la sesión de autoría. La Biblioteca degrada con
 * `pendienteDb: true` mientras la tabla `lxp.recursos` no exista (contrato en
 * `contenido-contrato.ts`) — el selector muestra el aviso y sigue con los casos.
 */

import { requireAutoria } from '@/lib/studio/session';
import { getCasos, getRecursos, type BibliotecaContenido } from '@/lib/studio/datos';
import type { CasoResumen } from '@/lib/studio/casos-contrato';

/** Recursos de la Biblioteca de Contenido (degrada `pendienteDb` si la tabla no existe). */
export async function buscarRecursosBiblioteca(): Promise<BibliotecaContenido> {
  const { userId } = await requireAutoria();
  return getRecursos(userId);
}

/** Casos del Banco (curados y por curar; el selector marca su estado). */
export async function buscarCasosBanco(): Promise<CasoResumen[]> {
  const { userId } = await requireAutoria();
  return getCasos(userId);
}
