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
import { imageIdWeb } from '@/components/dicom/engine/web-image-loader';
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
      const esImagen = s.tipo === 'imagen';
      if (esImagen) {
        // Imagen web (JPG/PNG): loader `web:`, un solo frame, SIN calibración (no mm),
        // sin cine ni auto-encuadre (no hay región de ultrasonido).
        // MINIATURA = la propia URL de la imagen (el navegador la decodifica en un `<img>`,
        // INDEPENDIENTE del visor Cornerstone). Antes se rasterizaba por Cornerstone en una lane
        // aparte y el viewport + la lane compartían el MISMO `IImage` cacheado en contextos WebGL
        // distintos → se robaban el bitmap/textura decodificados y uno de los dos salía en NEGRO
        // (se turnaban según el orden de render). Con el thumb servido por el navegador, el visor
        // es el ÚNICO consumidor del `web:` en Cornerstone → sin colisión.
        return {
          id: `${casoId}-s${i}`,
          descripcion: `Imagen ${i + 1}`,
          modalidad: s.modalidad || 'IMG',
          tipo: 'imagen' as const,
          miniaturaUrl: s.urlLectura,
          ...(s.series_uid ? { metadatos: { series_uid: s.series_uid } } : {}),
          frames: [{ imageId: imageIdWeb(s.urlLectura), indice: 0 }],
        };
      }
      // DICOM: aspect ratio real de USG (§ contexto clínico); el espaciado lo calculó la
      // ingesta y se registra por imageId (main-thread) para que Cornerstone no asuma 1:1.
      const esp = s.pixelSpacing;
      if (esp && esp.length === 2) registrarEspaciadoImagen(`wadouri:${s.urlLectura}`, esp[0], esp[1]);
      return {
        id: `${casoId}-s${i}`,
        descripcion: `Serie ${i + 1}`,
        modalidad: s.modalidad || 'US',
        tipo: 'dicom' as const,
        ...(s.series_uid ? { metadatos: { series_uid: s.series_uid } } : {}),
        // Región de ultrasonido (0018,6011) que extrajo la ingesta: el visor la usa para
        // auto-encuadrar y que la imagen clínica llene el viewport (sin bandas negras · §5A).
        ...(s.region && s.region.length === 4 ? { regionUS: s.region } : {}),
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
  efimero = false,
  // El visor manda: alto generoso por defecto (la herramienta de trabajo del médico).
  className = 'h-[72vh] min-h-[570px]',
}: {
  casoId: string;
  tabla?: TablaEstudioDicom;
  /** Sin barra de herramientas (miniatura/preview): solo se ve, no se manipula ni mide. */
  soloLectura?: boolean;
  /**
   * Modo DISCUSIÓN (Ateneo): toolset COMPLETO (zoom/pan/window-level/medición + cine) pero
   * las mediciones NO se persisten en el caso — son de sesión. Ortogonal a `soloLectura`:
   * NO oculta la barra; solo congela la persistencia (como un curado). El `limpiar()` del
   * ciclo de anotaciones sigue corriendo (config presente) → no se filtran a otro estudio.
   */
  efimero?: boolean;
  className?: string;
}) {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [estudio, setEstudio] = useState<EstudioDicom | null>(null);
  const [error, setError] = useState('');

  // Persistencia de mediciones (FASE 2). Curado (biblioteca), consulta (soloLectura) o
  // discusión (efimero · Ateneo) = CONGELADO: se ven las guardadas pero no se persisten las
  // nuevas. Memoizado para no re-disparar la carga/restauración en cada render.
  const configAnotaciones = useMemo<ConfigAnotaciones>(
    () => ({
      congelado: tabla === 'casos_biblioteca' || soloLectura || efimero,
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
    [casoId, tabla, soloLectura, efimero],
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

        // Miniaturas de las series .dcm: Cornerstone rasteriza el 1er frame (no tienen raster
        // server-side). Las imágenes WEB (JPG/PNG) NO se rasterizan aquí — ya traen su
        // `miniaturaUrl` (la propia URL, decodificada por el navegador) para NO compartir el
        // `IImage` cacheado con el viewport (evita la carrera del bitmap · ver `armarEstudio`).
        // No bloquea el visor grande: el merge sólo cambia `miniaturaUrl` (no los imageIds).
        try {
          const dcm = armado.series
            .map((s, i) => ({ imageId: s.frames[0]!.imageId, i }))
            .filter(({ i }) => armado.series[i]!.tipo === 'dicom');
          if (dcm.length > 0) {
            const { renderMiniaturas } = await import('@/components/dicom/engine/motor-cornerstone');
            const urls = await renderMiniaturas(dcm.map((d) => d.imageId));
            if (!vivo) return;
            const porIndice = new Map<number, string>();
            dcm.forEach((d, k) => {
              const u = urls[k];
              if (u) porIndice.set(d.i, u);
            });
            setEstudio((prev) =>
              prev && prev.id === armado.id
                ? { ...prev, series: prev.series.map((s, i) => (porIndice.has(i) ? { ...s, miniaturaUrl: porIndice.get(i)! } : s)) }
                : prev,
            );
          }
        } catch {
          /* miniaturas .dcm son un adorno: si fallan, el selector cae a su ícono */
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
