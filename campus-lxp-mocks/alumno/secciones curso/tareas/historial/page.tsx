"use client";

/**
 * Tareas › HISTORIAL DE ENVÍOS — cada archivo entregado a una tarea.
 * Selector de tarea (lee ?tarea=), tipo de entrega, puntuación y tabla ID · Archivo · Fecha · Estado.
 * Cuenta el último envío antes del cierre; los anteriores quedan como "Reemplazado".
 */

import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, Download, FileText } from "lucide-react";
import type { Envio } from "../../_components/curso";
import { BotonSec, CabeceraPagina, Chip, ENVIOS, TAREAS, card, focusRing, mono, th } from "../../_components/curso";

const COLS = "grid grid-cols-[140px_minmax(0,1fr)_220px_150px] items-center";

export default function HistorialEnvios({ params, envios = ENVIOS }: { params: { id: string }; envios?: Envio[] }) {
  const q = useSearchParams();
  const tarea = TAREAS.find((t) => t.id === q.get("tarea")) ?? TAREAS[0];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina
        titulo="Historial de envíos"
        migas={[{ etiqueta: "Tareas", href: `/curso/${params.id}/tareas` }, { etiqueta: "Historial de envíos" }]}
        acciones={<BotonSec icono={<Download aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />}>Descargar todo</BotonSec>}
      />

      <section className={`${card} flex flex-wrap items-end gap-6 p-5`}>
        <label className="block w-[380px]">
          <span className="block text-[11.5px] font-semibold">Tarea</span>
          <span className="relative mt-1.5 block">
            <select defaultValue={tarea.id} className={`h-11 w-full appearance-none rounded-[10px] border border-border bg-card pl-3 pr-9 text-[13px] font-semibold ${focusRing}`}>
              {TAREAS.filter((t) => t.envios > 0).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.clave} · {t.descripcion}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          </span>
        </label>
        <span className="block">
          <span className="block text-[11.5px] font-semibold">Tipo de entrega</span>
          <span className="mt-1.5 flex h-11 items-center text-[13px] text-[color:var(--foreground-soft)]">Individual</span>
        </span>
        {tarea.puntos !== undefined && (
          <span className="ml-auto flex items-baseline gap-2.5 rounded-[10px] bg-accent px-4 py-3">
            <span className={`${mono} text-[20px] font-extrabold text-secondary`}>
              {tarea.puntos} / {tarea.puntosMax}
            </span>
            <span className="text-[11.5px] text-secondary">calificada</span>
          </span>
        )}
      </section>

      <section className={`${card} overflow-hidden`}>
        <div className={`${COLS} border-b border-border bg-muted`}>
          {["ID de envío", "Archivo", "Fecha de envío", "Estado"].map((t) => (
            <span key={t} className={`px-[18px] py-[11px] ${th}`}>
              {t}
            </span>
          ))}
        </div>
        {envios.map((e, i) => (
          <div key={e.id} className={`${COLS} ${i ? "border-t border-border" : ""}`}>
            <span className={`${mono} px-[18px] py-[15px] text-[12.5px] font-semibold text-[color:var(--foreground-soft)]`}>{e.id}</span>
            <span className="flex min-w-0 items-center gap-2.5 px-[18px] py-[15px]">
              <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
                <FileText className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <a href="#" className="min-w-0 truncate text-[13px] font-semibold text-secondary no-underline">
                {e.archivo}
              </a>
              <span className={`${mono} shrink-0 text-[11.5px] text-muted-foreground`}>{e.peso}</span>
            </span>
            <span className={`${mono} px-[18px] py-[15px] text-[12.5px]`}>{e.fecha}</span>
            <span className="px-[18px] py-[15px]">
              {e.estado === "calificado" ? (
                <Chip tono="ok" icono={<Check className="h-[11px] w-[11px]" strokeWidth={2.2} />}>Calificado</Chip>
              ) : e.estado === "reemplazado" ? (
                <Chip tono="neutro">Reemplazado</Chip>
              ) : (
                <Chip tono="neutro">Recibido</Chip>
              )}
            </span>
          </div>
        ))}
      </section>
      <p className="text-[12px] text-muted-foreground">Cuenta el último envío antes del cierre. Los anteriores quedan en el historial.</p>
    </div>
  );
}
