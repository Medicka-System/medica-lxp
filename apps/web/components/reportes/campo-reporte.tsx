'use client';

/**
 * `CampoReporte` — renderiza UN campo de una plantilla de reporte por su tipo (§6.5).
 *
 * Desde 1b-1 el control por tipo NO vive aquí: se DESPACHA al REGISTRO DE UI
 * (`registro-ui-campos.tsx`, `REGISTRO_UI[tipo].render`). Este componente solo aporta el
 * ENVOLTORIO compartido (etiqueta + unidad + texto de ayuda) y el caso de solo-presentación.
 *   · `modo="llenar"` (médico): inputs activos, escribe valores; `imagen/dicom` monta el visor.
 *   · `modo="previa"` (constructor): misma apariencia, inputs deshabilitados.
 *
 * El visor DICOM NO se importa aquí (WASM de Cornerstone fuera del bundle del Studio): el editor
 * del médico lo inyecta por `renderVisorDicom`.
 */

import type { ReactNode } from 'react';
import { esCampoEstatico, type CampoPlantilla, type RefDicom } from '@/lib/reportes/estructura';
import { REGISTRO_UI, type ModoCampo } from '@/components/reportes/registro-ui-campos';

export type { ModoCampo };

/** Clase de col-span del campo dentro del grid de la sección. */
export function claseSpan(campo: CampoPlantilla, columnas: number): string {
  // Honra el `span` configurado para TODOS los tipos — IGUAL que el constructor, donde
  // `CampoCard` aplica `gridColumn: span min(span, columnas)` sin distinguir por tipo. Antes
  // `tabla/imagen/galeria/titulo` se forzaban a fila completa e IGNORABAN su ancho, por lo que el
  // render del alumno no coincidía con el layout de columnas propuesto en el constructor (FIX).
  const span = campo.span ?? 1;
  if (span >= columnas || span >= 4) return 'col-span-full';
  if (span >= 3) return 'lg:col-span-3';
  if (span >= 2) return 'sm:col-span-2';
  return '';
}

export function CampoReporte({
  campo,
  valor,
  modo,
  onCambio,
  onElegirEstudio,
  onQuitarEstudio,
  renderVisorDicom,
  ocultarEtiqueta = false,
  reporteId,
  soloLectura = false,
}: {
  campo: CampoPlantilla;
  valor: unknown;
  modo: ModoCampo;
  onCambio?: (valor: unknown) => void;
  /** `imagen/dicom`, modo llenar: abre el selector de estudios del médico. */
  onElegirEstudio?: () => void;
  onQuitarEstudio?: () => void;
  /** `imagen/dicom`, modo llenar: el editor del médico inyecta el visor real. */
  renderVisorDicom?: (ref: RefDicom) => ReactNode;
  /** El constructor pone su propia etiqueta editable en línea → oculta la del control. */
  ocultarEtiqueta?: boolean;
  /** `galeria`, modo llenar: id del reporte para anclar y firmar las subidas. */
  reporteId?: string;
  /** Reporte FINALIZADO: muestra el contenido (valores/imágenes) pero bloquea toda edición. */
  soloLectura?: boolean;
}) {
  const deshabilitado = modo === 'previa' || soloLectura;
  const control = REGISTRO_UI[campo.tipo].render({
    campo,
    valor,
    modo,
    deshabilitado,
    soloLectura,
    cambia: (v: unknown) => onCambio?.(v),
    onElegirEstudio,
    onQuitarEstudio,
    renderVisorDicom,
    reporteId,
  });

  // Solo-presentación (título/guía): el control ES el bloque completo, sin etiqueta ni ayuda.
  if (esCampoEstatico(campo.tipo)) return <>{control}</>;

  const etiqueta = campo.nombre || '(sin nombre)';
  const ayuda = campo.guia?.trim();

  return (
    <label className="block">
      {!ocultarEtiqueta && (
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[11.5px] font-semibold text-foreground">{etiqueta}</span>
          {campo.tipo === 'medida' && campo.unidad && (
            <span className="text-[10.5px] text-muted-foreground">({campo.unidad})</span>
          )}
        </span>
      )}

      {control}

      {ayuda && (
        <span className="mt-1.5 block text-[11px] leading-snug text-muted-foreground">{ayuda}</span>
      )}
    </label>
  );
}
