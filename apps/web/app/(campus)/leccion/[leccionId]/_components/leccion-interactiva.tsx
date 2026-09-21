'use client';

/**
 * Render del alumno para las lecciones INTERACTIVAS (§5C · §7): tipo `h5p` y tipo
 * `xapi`. Lee del modelo NUEVO (`lecciones.config`) y reutiliza las piezas del course
 * builder para reproducir:
 *
 *   · h5p  → `BloqueH5P` (modo ver) contra el H5P server self-host del `api`
 *     (`@lumieducation/h5p-server` · §2/§7). El player emite xAPI de sus interacciones;
 *     al completarse, anclamos el progreso de la lección al LRS (POST /players/progreso).
 *   · xapi → `BloquePaquete` (modo ver). El paquete Articulate reporta al LRS por su
 *     cuenta (endpoint baked · cola envio-xapi). Servir el lanzador en iframe es DOMINIO
 *     (GET /xapi/play/:id) y aún no existe → el bloque se degrada con dignidad (§2); el
 *     alumno marca su avance con el pie de la lección (anclado al LRS igual que H5P).
 *
 * Regla de Oro (§2): esta pieza NO descomprime, ni firma, ni habla con el LRS directo.
 * El H5P/paquete corre contra el `api`; el progreso al LRS pasa por un server action.
 */

import { useState } from 'react';
import { BloqueH5P } from '@/components/bloques/h5p/bloque-h5p';
import { BloquePaquete } from '@/components/bloques/paquetes/bloque-paquete';
import type { TipoPaquete } from '@/components/bloques/contratos';
import { reportarProgresoInteractivo } from '@/lib/campus/players-acciones';
import type { LeccionCompleta } from '@/lib/campus/leccion-contrato';

/**
 * Prefijo del H5P server (§7 · api). El player de H5P corre en el navegador y pega
 * directo al `api` (CORS habilitado), por eso usa la URL PÚBLICA. Sin ella, `BloqueH5P`
 * muestra su estado "servidor pendiente" con dignidad.
 */
const H5P_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/h5p`
  : null;

/** Verbos xAPI que consideramos "completó la lección" al llegar desde el player H5P. */
function esCompletion(statement: unknown): boolean {
  const verbo = (statement as { verb?: { id?: string } })?.verb?.id ?? '';
  return /\/(completed|passed)$/.test(verbo);
}

/** Mapea el tipo de la config del paquete al union del bloque (fallback a xapi). */
function tipoPaquete(config: LeccionCompleta['config']): TipoPaquete {
  return config.tipo === 'scorm12' || config.tipo === 'scorm2004' ? config.tipo : 'xapi';
}

export function LeccionInteractiva({
  leccion,
  preview = false,
  onCompletado,
}: {
  leccion: LeccionCompleta;
  /** En vista previa (staff) no se registra progreso ni se emite al LRS. */
  preview?: boolean;
  /** Se dispara cuando el player reporta que la lección se completó. */
  onCompletado?: () => void;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const contexto = `${leccion.contexto.programa} · ${leccion.contexto.modulo}`;

  /** Ancla el progreso de la lección al LRS (idempotente; upsert en el `api`). */
  async function reportar(completado: boolean) {
    if (preview) return;
    const r = await reportarProgresoInteractivo({
      leccionId: leccion.id,
      contenidoId: leccion.contenidoId,
      completado,
      titulo: leccion.nombre,
    });
    if (r.ok) {
      if (completado) onCompletado?.();
      setAviso(null);
    } else {
      setAviso(r.error);
    }
  }

  if (leccion.tipo === 'h5p') {
    const contentId =
      typeof leccion.config.contentId === 'string' ? leccion.config.contentId : undefined;

    if (!contentId) {
      return (
        <SinContenido texto="El interactivo H5P de esta lección aún no está publicado." />
      );
    }

    return (
      <div className="space-y-3">
        <BloqueH5P
          modo="ver"
          contentId={contentId}
          servidorBase={H5P_BASE}
          titulo={leccion.nombre}
          contexto={contexto}
          // El player H5P emite xAPI de cada interacción; al completar/aprobar,
          // anclamos el progreso de la lección al LRS por el dominio.
          onXapi={(statement) => {
            if (esCompletion(statement)) void reportar(true);
          }}
        />
        {aviso && <MensajeAviso texto={aviso} />}
      </div>
    );
  }

  // tipo === 'xapi'
  return (
    <div className="space-y-3">
      <BloquePaquete
        modo="ver"
        titulo={leccion.config.titulo ?? leccion.nombre}
        contexto={contexto}
        paquete={{ tipo: tipoPaquete(leccion.config), titulo: leccion.config.titulo ?? leccion.nombre }}
      />
      {aviso && <MensajeAviso texto={aviso} />}
    </div>
  );
}

function SinContenido({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-[14px] text-muted-foreground">
      {texto}
    </p>
  );
}

function MensajeAviso({ texto }: { texto: string }) {
  return (
    <p className="rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[color:var(--destructive-foreground)]">
      {texto}
    </p>
  );
}
