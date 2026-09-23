'use client';

/**
 * `VisorEstudio` — carga el estudio ANONIMIZADO de un caso (bitácora del alumno o
 * banco curado) y lo muestra en el visor real Cornerstone3D (§4.7) con la TIRA de
 * series debajo (fiel al mock de detalle de caso). Pide al `api` una URL firmada por
 * SERIE (`lecturaEstudioDicom`) y arma el `EstudioDicom` multi-serie; cada `.dcm`
 * anonimizado va object storage → navegador directo (nunca por el web/api · §2/§3).
 *
 * Reutilizable y TRANSVERSAL: lo consumen Bitácora, Studio/Casos y Biblioteca. Se
 * monta bajo demanda para no arrastrar el WASM de Cornerstone a las listas.
 */

import { useEffect, useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import type { TablaEstudioDicom } from '@campus/shared';
import { VisorDicom, type EstudioDicom, type FrameDicom } from '@/components/dicom';
import { registrarEspaciadoImagen } from '@/components/dicom/engine/espaciado-ultrasonido';
import { lecturaEstudioDicom, type SerieLectura } from '@/lib/dicom/acciones';

/** Imagen (o frames de un multi-frame) de UN `.dcm` anonimizado firmado. */
function framesDeDcm(urlLectura: string, nFrames: number, desde: number): FrameDicom[] {
  const n = Math.max(1, nFrames || 1);
  // Un cine loop guardado como UN `.dcm` multi-frame: el frame va en la query (`&frame=`).
  // OJO: el loader wadouri usa frames 1-based (`parseImageId` resta 1) → empezamos en 1.
  if (n > 1) {
    return Array.from({ length: n }, (_, f) => ({
      imageId: `wadouri:${urlLectura}&frame=${f + 1}`,
      indice: desde + f,
    }));
  }
  // Imagen fija: un solo frame, la URL tal cual.
  return [{ imageId: `wadouri:${urlLectura}`, indice: desde }];
}

/**
 * Construye el EstudioDicom AGRUPANDO por SeriesInstanceUID (contexto clínico · FASE 1).
 *
 * El pipeline registra un `.dcm` por FUENTE (una imagen o un ZIP expandido), pero varios
 * `.dcm` con el MISMO SeriesInstanceUID son FRAMES de UNA sola serie (un cine loop), no
 * series distintas — así llega un estudio de ultrasonido troceado en instancias. Aquí se
 * reconcilian:
 *   · Mismo `series_uid` (no vacío)  → UNA serie con N frames (los frames de cada `.dcm`
 *     miembro, concatenados en orden de subida). Un cine loop.
 *   · `series_uid` distinto o vacío  → series distintas (longitudinal, transversal,
 *     Doppler…), items separados en la tira de miniaturas.
 * Un `.dcm` que ya es multi-frame (NumberOfFrames > 1) aporta sus N frames a su grupo.
 *
 * El `id` de cada serie es un id de UI (key de React + selección en `useVisorDicom`),
 * derivado del índice del GRUPO → siempre único (nunca choca aunque el UID se repita).
 * El UID real se conserva en `metadatos` para overlays/diagnóstico.
 */
function armarEstudio(casoId: string, series: SerieLectura[]): EstudioDicom {
  // Agrupa preservando el orden de aparición. UID vacío = grupo propio (no fusionar).
  const grupos = new Map<string, SerieLectura[]>();
  const orden: string[] = [];
  series.forEach((s, i) => {
    const uid = s.series_uid?.trim();
    const clave = uid ? `uid:${uid}` : `idx:${i}`;
    const g = grupos.get(clave);
    if (g) g.push(s);
    else {
      grupos.set(clave, [s]);
      orden.push(clave);
    }
  });

  return {
    id: casoId,
    series: orden.map((clave, gi) => {
      const miembros = grupos.get(clave)!;
      const frames: FrameDicom[] = [];
      for (const m of miembros) {
        frames.push(...framesDeDcm(m.urlLectura, m.frames ?? 1, frames.length));
        // Aspect ratio real de USG (§ contexto clínico): el espaciado lo calculó la
        // ingesta; se registra por imageId (main-thread) para que Cornerstone no asuma 1:1.
        const esp = m.pixelSpacing;
        if (esp && esp.length === 2) registrarEspaciadoImagen(`wadouri:${m.urlLectura}`, esp[0], esp[1]);
      }
      const uid = miembros[0]!.series_uid;
      return {
        id: `${casoId}-s${gi}`,
        descripcion: `Serie ${gi + 1}`,
        modalidad: miembros[0]!.modalidad || 'US',
        ...(uid ? { metadatos: { series_uid: uid } } : {}),
        frames,
      };
    }),
  };
}

export function VisorEstudio({
  casoId,
  tabla = 'bitacora_casos',
  soloLectura = false,
  // El visor manda: alto generoso por defecto (la herramienta de trabajo del médico).
  className = 'h-[72vh] min-h-[520px]',
}: {
  casoId: string;
  tabla?: TablaEstudioDicom;
  soloLectura?: boolean;
  className?: string;
}) {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [estudio, setEstudio] = useState<EstudioDicom | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    (async () => {
      const r = await lecturaEstudioDicom(casoId, tabla);
      if (!vivo) return;
      if (r.ok && r.datos.series.length > 0) {
        const armado = armarEstudio(casoId, r.datos.series);
        setEstudio(armado);
        setEstado('listo');

        // Miniaturas REALES por serie (Cornerstone renderiza el 1er frame). No bloquea
        // el visor grande: merge sólo cambia `miniaturaUrl` (no los imageIds), así que
        // `useVisorDicom` no recarga la serie activa.
        try {
          const { renderMiniaturas } = await import('@/components/dicom/engine/motor-cornerstone');
          const urls = await renderMiniaturas(armado.series.map((s) => s.frames[0]!.imageId));
          if (!vivo) return;
          setEstudio((prev) =>
            prev && prev.id === armado.id
              ? { ...prev, series: prev.series.map((s, i) => ({ ...s, miniaturaUrl: urls[i] ?? s.miniaturaUrl })) }
              : prev,
          );
        } catch {
          /* miniaturas son un adorno: si fallan, el selector cae a su ícono */
        }
      } else {
        setError(r.ok ? 'El estudio no tiene series.' : r.error);
        setEstado('error');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [casoId, tabla]);

  if (estado === 'cargando') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted text-muted-foreground ${className}`}
      >
        <Loader2 className="animate-spin" size={26} strokeWidth={1.75} />
        <span className="text-[12px] font-medium">Abriendo estudio…</span>
      </div>
    );
  }

  if (estado === 'error' || !estudio) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-4 text-center text-muted-foreground ${className}`}
      >
        <ImageOff size={26} strokeWidth={1.5} />
        <span className="text-[13px] font-semibold">No se pudo abrir el estudio</span>
        <span className="text-[11.5px]">{error}</span>
      </div>
    );
  }

  return (
    <VisorDicom
      estudio={estudio}
      seriesLayout="horizontal"
      soloLectura={soloLectura}
      className={className}
    />
  );
}
