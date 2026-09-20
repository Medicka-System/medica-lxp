'use client';

/**
 * `VisorEstudioCaso` — carga el estudio ANONIMIZADO de un caso de bitácora y lo
 * muestra en el visor real Cornerstone3D (§4.7). Pide al `api` la URL firmada de
 * lectura del `.dcm` anonimizado (`lecturaEstudioDicom`) y arma el `EstudioDicom`
 * del visor con `imageId` `wadouri:<url firmada>`. El binario va MinIO → navegador
 * directo (nunca por el web/api · §2/§3).
 *
 * Se monta bajo demanda (modal desde la tarjeta) para no arrastrar el WASM de
 * Cornerstone a cada tarjeta de la bitácora.
 */

import { useEffect, useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { VisorDicom, type EstudioDicom } from '@/components/dicom';
import { lecturaEstudioDicom, type SerieVisor } from '@/lib/campus/dicom-acciones';

/** Construye el EstudioDicom del visor a partir de la URL firmada + series. */
function armarEstudio(casoId: string, urlLectura: string, series: SerieVisor[]): EstudioDicom {
  const s = series[0];
  const frames = Math.max(1, s?.frames ?? 1);
  return {
    id: casoId,
    series: [
      {
        id: s?.series_uid || `${casoId}-s0`,
        descripcion: 'Estudio anonimizado',
        modalidad: s?.modalidad || 'US',
        frames:
          frames <= 1
            ? [{ imageId: `wadouri:${urlLectura}`, indice: 0 }]
            : // Multi-frame: la URL ya trae query firmada, el frame va con '&'.
              Array.from({ length: frames }, (_, i) => ({
                imageId: `wadouri:${urlLectura}&frame=${i}`,
                indice: i,
              })),
      },
    ],
  };
}

export function VisorEstudioCaso({ casoId }: { casoId: string }) {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [estudio, setEstudio] = useState<EstudioDicom | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      const r = await lecturaEstudioDicom(casoId);
      if (!vivo) return;
      if (r.ok) {
        setEstudio(armarEstudio(casoId, r.datos.urlLectura, r.datos.series));
        setEstado('listo');
      } else {
        setError(r.error);
        setEstado('error');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [casoId]);

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted text-muted-foreground">
        <Loader2 className="animate-spin" size={26} strokeWidth={1.75} />
        <span className="text-[12px] font-medium">Abriendo estudio…</span>
      </div>
    );
  }

  if (estado === 'error' || !estudio) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-4 text-center text-muted-foreground">
        <ImageOff size={26} strokeWidth={1.5} />
        <span className="text-[13px] font-semibold">No se pudo abrir el estudio</span>
        <span className="text-[11.5px]">{error}</span>
      </div>
    );
  }

  return <VisorDicom estudio={estudio} className="min-h-[360px]" />;
}
