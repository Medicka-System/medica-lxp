'use client';

/**
 * Editor de la LECCIÓN tipo VIDEO (§5C · mig 0023). La lección ES un video: ocupa toda
 * la lección (no es un bloque dentro de teoría). La herramienta de autoría completa vive
 * en `EditorVideoAutoria` (componente COMPARTIDO con el bloque de video de teoría, para
 * que ambos se vean y funcionen IDÉNTICO): subir/enlace, hitos, transcripción, preview.
 *
 * Persistencia = la CONFIG de la lección (`lecciones.config`, §5C):
 *   { videotecaId | url, recursoRef, estado, duracionSeg, hitos[], transcripcion[] }
 * Reparto (§2 · Regla de Oro): firmar subida/lectura del binario → dominio; el binario
 * viaja navegador → object storage (PUT firmado); la config → CRUD directo web→Supabase.
 */

import { useCallback, useState } from 'react';
import { EditorVideoAutoria } from '@/components/bloques/video/editor-video-autoria';
import type { FuenteVideoConfig } from '@/components/bloques/contratos';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import { guardarConfigLeccion } from '@/lib/studio/acciones';

function normalizar(config: Record<string, unknown>): FuenteVideoConfig {
  const c = config as FuenteVideoConfig;
  return {
    videotecaId: typeof c.videotecaId === 'string' ? c.videotecaId : undefined,
    url: typeof c.url === 'string' ? c.url : undefined,
    recursoRef: typeof c.recursoRef === 'string' ? c.recursoRef : undefined,
    estado: c.estado === 'listo' || c.estado === 'procesando' ? c.estado : undefined,
    duracionSeg: typeof c.duracionSeg === 'number' ? c.duracionSeg : undefined,
    hitos: Array.isArray(c.hitos) ? c.hitos : [],
    transcripcion: Array.isArray(c.transcripcion) ? c.transcripcion : [],
  };
}

export function EditorVideo({ programaId, leccionId, titulo, config, correr }: EditorLeccionProps) {
  const [cfg, setCfg] = useState<FuenteVideoConfig>(() => normalizar(config));

  const persistir = useCallback(
    (nueva: FuenteVideoConfig) => {
      setCfg(nueva);
      correr(() => guardarConfigLeccion(programaId, leccionId, nueva as Record<string, unknown>));
    },
    [correr, programaId, leccionId],
  );

  return <EditorVideoAutoria titulo={titulo} leccionId={leccionId} config={cfg} onCambio={persistir} />;
}
