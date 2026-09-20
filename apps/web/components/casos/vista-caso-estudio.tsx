import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { focusRing } from '@/components/tokens';

/**
 * `VistaCasoEstudio` — layout TRANSVERSAL del detalle de un caso (§4.7 · fiel al mock
 * de detalle de caso). Dos columnas: el VISOR manda a la izquierda (grande, con su tira
 * de series debajo) y el panel del caso a la derecha. Lo consumen Bitácora (alumno),
 * Studio/Casos (curaduría) y Biblioteca — cada pantalla aporta su `visor` (visor real,
 * uploader o placeholder) y su `panel` (contexto/estado/verdad/edición).
 *
 * Es un primitivo de LAYOUT: no sabe de datos ni de sesión; solo compone. Así el mismo
 * marco visual sirve las tres pantallas sin duplicar la rejilla ni la cabecera.
 */
export function VistaCasoEstudio({
  volverHref,
  volverLabel,
  visor,
  debajoDelVisor,
  panel,
}: {
  volverHref: string;
  volverLabel: string;
  /** Columna izquierda: el estudio (VisorEstudio real, uploader o placeholder). */
  visor: ReactNode;
  /** Contenido opcional bajo el visor (viñeta, hallazgos, puntos clave…). */
  debajoDelVisor?: ReactNode;
  /** Columna derecha: ficha/estado/verdad/acciones del caso. */
  panel: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <Link
        href={volverHref}
        className={`inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        {volverLabel}
      </Link>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_396px]">
        <div className="min-w-0">
          {visor}
          {debajoDelVisor && <div className="mt-5 flex flex-col gap-5">{debajoDelVisor}</div>}
        </div>
        <aside className="flex min-w-0 flex-col gap-5">{panel}</aside>
      </div>
    </div>
  );
}
