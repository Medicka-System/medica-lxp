'use client';

/**
 * Tareas › HISTORIAL DE ENVÍOS — el envío vigente del alumno para la tarea elegida.
 * `lxp.entregas` es única por tarea×alumno → no hay versiones "reemplazadas": se muestra
 * la entrega vigente. El selector de tarea actualiza la URL (?tarea=).
 */

import { useRouter } from 'next/navigation';
import { Check, Download, FileText } from 'lucide-react';
import type { Envio } from '../../_components/curso';
import { BotonSec, CabeceraPagina, Chip, card, mono, th } from '../../_components/curso';
import { Select } from '@/components/ui/select';

const COLS = 'grid grid-cols-[140px_minmax(0,1fr)_220px_150px] items-center';

export function HistorialVista({
  cursoId,
  opciones,
  seleccion,
  envios,
  puntos,
  puntosMax,
}: {
  cursoId: string;
  opciones: { value: string; label: string }[];
  seleccion: string | null;
  envios: Envio[];
  puntos: number | null;
  puntosMax: number;
}) {
  const router = useRouter();
  const base = `/curso/${cursoId}/tareas`;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina
        titulo="Historial de envíos"
        migas={[{ etiqueta: 'Tareas', href: base }, { etiqueta: 'Historial de envíos' }]}
        acciones={<BotonSec icono={<Download aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />}>Descargar todo</BotonSec>}
      />

      {opciones.length === 0 ? (
        <div className={`${card} px-6 py-14 text-center text-[13px] text-muted-foreground`}>Aún no ha enviado ninguna tarea.</div>
      ) : (
        <>
          <section className={`${card} flex flex-wrap items-end gap-6 p-5`}>
            <label className="block w-[380px] max-w-full">
              <span className="mb-1.5 block text-[11.5px] font-semibold">Tarea</span>
              <Select
                options={opciones}
                value={seleccion ?? ''}
                onChange={(v) => router.push(`${base}/historial?tarea=${v}`)}
                aria-label="Elegir tarea"
              />
            </label>
            <span className="block">
              <span className="block text-[11.5px] font-semibold">Tipo de entrega</span>
              <span className="mt-1.5 flex h-11 items-center text-[13px] text-[color:var(--foreground-soft)]">Individual</span>
            </span>
            {puntos !== null && (
              <span className="ml-auto flex items-baseline gap-2.5 rounded-[10px] bg-accent px-4 py-3">
                <span className={`${mono} text-[20px] font-extrabold text-secondary`}>
                  {puntos} / {puntosMax}
                </span>
                <span className="text-[11.5px] text-secondary">calificada</span>
              </span>
            )}
          </section>

          <section className={`${card} overflow-hidden`}>
            <div className={`${COLS} border-b border-border bg-muted`}>
              {['ID de envío', 'Archivo', 'Fecha de envío', 'Estado'].map((t) => (
                <span key={t} className={`px-[18px] py-[11px] ${th}`}>
                  {t}
                </span>
              ))}
            </div>
            {envios.map((e, i) => (
              <div key={e.id} className={`${COLS} ${i ? 'border-t border-border' : ''}`}>
                <span className={`${mono} px-[18px] py-[15px] text-[12.5px] font-semibold text-[color:var(--foreground-soft)]`}>{e.id}</span>
                <span className="flex min-w-0 items-center gap-2.5 px-[18px] py-[15px]">
                  <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 truncate text-[13px] font-semibold">{e.archivo}</span>
                  {e.peso && <span className={`${mono} shrink-0 text-[11.5px] text-muted-foreground`}>{e.peso}</span>}
                </span>
                <span className={`${mono} px-[18px] py-[15px] text-[12.5px]`}>{e.fecha}</span>
                <span className="px-[18px] py-[15px]">
                  {e.estado === 'calificado' ? (
                    <Chip tono="ok" icono={<Check className="h-[11px] w-[11px]" strokeWidth={2.2} />}>Calificado</Chip>
                  ) : e.estado === 'reemplazado' ? (
                    <Chip tono="neutro">Reemplazado</Chip>
                  ) : (
                    <Chip tono="neutro">Recibido</Chip>
                  )}
                </span>
              </div>
            ))}
          </section>
          <p className="text-[12px] text-muted-foreground">Se muestra la entrega vigente de cada tarea.</p>
        </>
      )}
    </div>
  );
}
