/**
 * Orquestación CLIENTE del "Subir recurso" de la Biblioteca (§5C). Encadena, por tipo:
 *   1) firmar/ingerir el artefacto en el api (server actions),
 *   2) subir el binario DIRECTO a object storage (PUT firmado · §2, no pasa por el api;
 *      los paquetes .zip/.h5p sí van por el api porque requieren descompresión/instalación),
 *   3) crear la fila `lxp.recursos` (CRUD web→Supabase bajo RLS).
 * Se importa perezosamente desde el diálogo para no cargar este código hasta subir.
 */

import {
  crearRecurso,
  firmarSubidaMediaArchivo,
  ingestarPaqueteBiblioteca,
  subirH5pBiblioteca,
} from '@/lib/studio/contenido-acciones';
import { solicitarSubidaVideo, confirmarVideo, firmarSubidaImagenContenido } from '@/lib/studio/media-acciones';
import type { TipoRecurso } from '@/lib/studio/contenido-contrato';

type Resultado = { ok: true } | { ok: false; error: string };
type Progreso = (m: string) => void;

function extDe(nombre: string): string {
  return nombre.split('.').pop()?.toLowerCase() ?? '';
}

/** PUT del binario a la URL firmada (navegador → object storage). */
async function putBinario(url: string, archivo: File): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'PUT',
      body: archivo,
      headers: { 'content-type': archivo.type || 'application/octet-stream' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Lee la duración del video en el navegador (best-effort). */
function duracionVideo(archivo: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    try {
      const el = document.createElement('video');
      el.preload = 'metadata';
      const url = URL.createObjectURL(archivo);
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(el.duration) ? Math.round(el.duration) : undefined);
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      el.src = url;
    } catch {
      resolve(undefined);
    }
  });
}

function mmss(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Convierte el resultado de crearRecurso en el resultado de flujo. */
async function crearYMapear(input: Parameters<typeof crearRecurso>[0]): Promise<Resultado> {
  const r = await crearRecurso(input);
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function subirRecursoFlujo(
  archivo: File,
  tipo: TipoRecurso | 'zip',
  nombre: string,
  etiquetas: string[],
  onProgreso: Progreso,
): Promise<Resultado> {
  const ext = extDe(archivo.name);

  if (tipo === 'video') {
    onProgreso('Firmando subida…');
    const sol = await solicitarSubidaVideo({ titulo: nombre });
    if (!sol.ok) return sol;
    onProgreso('Subiendo video…');
    if (!(await putBinario(sol.datos.urlSubida, archivo))) {
      return { ok: false, error: 'No se pudo subir el video a object storage (¿MinIO/R2 disponible?).' };
    }
    const dur = await duracionVideo(archivo);
    onProgreso('Confirmando…');
    const conf = await confirmarVideo(sol.datos.videotecaId, dur);
    if (!conf.ok) return conf;
    onProgreso('Registrando en la biblioteca…');
    return crearYMapear({
      tipo: 'video',
      nombre,
      storageKey: sol.datos.videotecaId,
      reproduccion: 'Cloudflare Stream',
      etiquetas,
      meta: {
        ...(dur ? { duracion: mmss(dur) } : {}),
        peso: `${(archivo.size / 1024 / 1024).toFixed(1)} MB`,
      },
    });
  }

  if (tipo === 'imagen') {
    onProgreso('Firmando subida…');
    const sol = await firmarSubidaImagenContenido(ext);
    if (!sol.ok) return sol;
    onProgreso('Subiendo imagen…');
    if (!(await putBinario(sol.datos.urlSubida, archivo))) {
      return { ok: false, error: 'No se pudo subir la imagen a object storage.' };
    }
    onProgreso('Registrando en la biblioteca…');
    return crearYMapear({
      tipo: 'imagen',
      nombre,
      storageKey: sol.datos.ref,
      etiquetas,
      meta: { peso: `${(archivo.size / 1024).toFixed(0)} KB` },
    });
  }

  if (tipo === 'pdf' || tipo === 'word' || tipo === 'ppt') {
    onProgreso('Firmando subida…');
    const sol = await firmarSubidaMediaArchivo(ext);
    if (!sol.ok) return sol;
    onProgreso('Subiendo documento…');
    if (!(await putBinario(sol.datos.urlSubida, archivo))) {
      return { ok: false, error: 'No se pudo subir el documento a object storage.' };
    }
    onProgreso('Registrando en la biblioteca…');
    return crearYMapear({
      tipo,
      nombre,
      storageKey: sol.datos.ref,
      etiquetas,
      meta: { peso: `${(archivo.size / 1024 / 1024).toFixed(1)} MB` },
    });
  }

  if (tipo === 'zip') {
    onProgreso('Validando el paquete (manifiesto)…');
    const fd = new FormData();
    fd.append('archivo', archivo);
    fd.append('titulo', nombre);
    const ing = await ingestarPaqueteBiblioteca(fd);
    if (!ing.ok) return ing;
    const t: TipoRecurso = ing.datos.tipo === 'xapi' ? 'xapi' : 'scorm';
    onProgreso('Registrando en la biblioteca…');
    return crearYMapear({
      tipo: t,
      nombre,
      storageKey: ing.datos.recursoRef,
      reproduccion: 'Reporta progreso',
      etiquetas,
      meta: {
        peso: `${(archivo.size / 1024 / 1024).toFixed(1)} MB`,
        ...(ing.datos.entryPoint ? { entryPoint: ing.datos.entryPoint } : {}),
        ...(t === 'xapi' ? { fuente: 'Articulate' } : {}),
      },
    });
  }

  if (tipo === 'h5p') {
    onProgreso('Instalando el paquete H5P…');
    const fd = new FormData();
    fd.append('archivo', archivo);
    fd.append('titulo', nombre);
    const ing = await subirH5pBiblioteca(fd);
    if (!ing.ok) return ing;
    onProgreso('Registrando en la biblioteca…');
    return crearYMapear({
      tipo: 'h5p',
      nombre,
      storageKey: ing.datos.contentId,
      reproduccion: 'Reporta progreso',
      etiquetas,
    });
  }

  return { ok: false, error: 'Tipo de archivo no soportado.' };
}
