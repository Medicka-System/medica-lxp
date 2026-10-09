'use client';

/**
 * Render del cuerpo de un comentario con @menciones (mig 0076). El cuerpo trae tokens
 * DETERMINISTAS `@[Nombre](uuid)`; aquí se parten en segmentos (`segmentarComentario`) y cada
 * mención se pinta como `@Nombre` enlazado al perfil (abre el modal del Ateneo vía onAbrirPerfil).
 * NUNCA se muestra el uuid; si no hay onAbrirPerfil, se pinta como texto resaltado no-clicable.
 */

// (marcador de build — deploy web-only de prueba del patrón selectivo de deploy.sh)

import { segmentarComentario } from './tipos';
import { focusRing } from './ui';

export function ComentarioTexto({
  cuerpo,
  onAbrirPerfil,
}: {
  cuerpo: string;
  onAbrirPerfil?: (userId: string) => void;
}) {
  const segs = segmentarComentario(cuerpo);
  return (
    <>
      {segs.map((s, i) =>
        s.t === 'texto' ? (
          <span key={i}>{s.v}</span>
        ) : onAbrirPerfil ? (
          <button
            key={i}
            type="button"
            onClick={() => onAbrirPerfil(s.id)}
            className={`font-bold text-secondary hover:underline ${focusRing}`}
          >
            @{s.nombre}
          </button>
        ) : (
          <span key={i} className="font-bold text-secondary">
            @{s.nombre}
          </span>
        ),
      )}
    </>
  );
}
