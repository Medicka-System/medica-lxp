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

import { useEffect, useMemo, useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import type { TablaEstudioDicom } from '@campus/shared';
import { VisorDicom, type EstudioDicom, type FrameDicom } from '@/components/dicom';
import type { ConfigAnotaciones } from '@/components/dicom/use-anotaciones';
import { registrarEspaciadoImagen } from '@/components/dicom/engine/espaciado-ultrasonido';
import { lecturaEstudioDicom, type SerieLectura } from '@/lib/dicom/acciones';
import { getAnotaciones, guardarAnotaciones } from '@/lib/dicom/anotaciones-acciones';

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
 * Construye el EstudioDicom: **cada `.dcm` = UNA imagen/serie** (una miniatura en la tira).
 *
 * La distinción cine-loop vs galería la da el TAG DICOM, no la extensión ni el UID:
 *   · UN `.dcm` con NumberOfFrames > 1  → un CINE LOOP real (frames dentro del archivo) →
 *     la serie trae N frames y el visor muestra play/scrubbing/velocidad.
 *   · VARIOS `.dcm` single-frame        → imágenes/series SEPARADAS → cada una es su propia
 *     serie de 1 frame; el visor muestra la GALERÍA de miniaturas (una por imagen) SIN play.
 * NO se fusionan archivos distintos por compartir SeriesInstanceUID: subir 2-3 imágenes son
 * 2-3 series, no un loop. El play solo aparece cuando UN archivo es multi-frame de verdad.
 *
 * El `id` de cada serie es un id de UI (key de React + selección en `useVisorDicom`),
 * derivado del índice → siempre único. El UID real se conserva en `metadatos`.
 */
function armarEstudio(casoId: string, series: SerieLectura[]): EstudioDicom {
  return {
    id: casoId,
    series: series.map((s, i) => {
      // Aspect ratio real de USG (§ contexto clínico): el espaciado lo calculó la ingesta;
      // se registra por imageId (main-thread) para que Cornerstone no asuma píxel 1:1.
      const esp = s.pixelSpacing;
      if (esp && esp.length === 2) registrarEspaciadoImagen(`wadouri:${s.urlLectura}`, esp[0], esp[1]);
      return {
        id: `${casoId}-s${i}`,
        descripcion: `Serie ${i + 1}`,
        modalidad: s.modalidad || 'US',
        ...(s.series_uid ? { metadatos: { series_uid: s.series_uid } } : {}),
        // Cine loop SOLO si este único `.dcm` es multi-frame (frames > 1).
        frames: framesDeDcm(s.urlLectura, s.frames ?? 1, 0),
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

  // Persistencia de mediciones (FASE 2). Curado (biblioteca) o consulta (soloLectura) =
  // CONGELADO: se ven las guardadas pero no se persisten las nuevas. Memoizado para no
  // re-disparar la carga/restauración en cada render.
  const configAnotaciones = useMemo<ConfigAnotaciones>(
    () => ({
      congelado: tabla === 'casos_biblioteca' || soloLectura,
      cargar: async () => {
        const r = await getAnotaciones(casoId, tabla);
        return r.ok
          ? r.datos.map((a) => ({
              id: a.id,
              serie: a.serie,
              frame: a.frame,
              tipo: a.tipo,
              datos: a.datos,
              valor: a.valor,
              autorNombre: a.autorNombre,
              esMia: a.esMia,
            }))
          : [];
      },
      guardar: async (items) => {
        await guardarAnotaciones(casoId, tabla, items);
      },
    }),
    [casoId, tabla, soloLectura],
  );

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
      anotaciones={configAnotaciones}
      className={className}
    />
  );
}
