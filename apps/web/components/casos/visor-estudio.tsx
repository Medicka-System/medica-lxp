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
import { VisorDicom, type EstudioDicom } from '@/components/dicom';
import { lecturaEstudioDicom, type SerieLectura } from '@/lib/dicom/acciones';

/** Construye el EstudioDicom multi-serie a partir de las URLs firmadas por serie. */
function armarEstudio(casoId: string, series: SerieLectura[]): EstudioDicom {
  return {
    id: casoId,
    series: series.map((s, i) => {
      const frames = Math.max(1, s.frames ?? 1);
      return {
        id: s.series_uid || `${casoId}-s${i}`,
        descripcion: `Serie ${i + 1}`,
        modalidad: s.modalidad || 'US',
        frames:
          frames <= 1
            ? [{ imageId: `wadouri:${s.urlLectura}`, indice: 0 }]
            : // Multi-frame: la URL ya trae query firmada; el frame va con '&'.
              Array.from({ length: frames }, (_, f) => ({
                imageId: `wadouri:${s.urlLectura}&frame=${f}`,
                indice: f,
              })),
      };
    }),
  };
}

export function VisorEstudio({
  casoId,
  tabla = 'bitacora_casos',
  soloLectura = false,
  className = 'min-h-[440px]',
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
        setEstudio(armarEstudio(casoId, r.datos.series));
        setEstado('listo');
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
