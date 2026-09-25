"use client";

import { Award } from "lucide-react";
import type { EstudioAlumno } from "./tipos";

const mono = "font-mono tabular-nums";

/** Resumen de una línea al pie de la rejilla. Se calcula de los estudios; no es un dato aparte. */
export function ResumenEstudios({ estudios }: { estudios: EstudioAlumno[] }) {
  if (!estudios.length) return null;
  const aprobados = estudios.filter((e) => e.estado === "aprobado");
  const horas = aprobados.reduce((s, e) => s + e.horas, 0);
  const devueltos = estudios.filter((e) => e.estado === "devuelto").length;

  return (
    <div className="mt-[18px] flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
        <Award className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <p className="m-0 min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--foreground-soft)]">
        Lleva <span className="font-bold text-foreground">{aprobados.length} de {estudios.length}</span> estudios aprobados y{" "}
        <span className={`${mono} font-bold text-foreground`}>{horas} h</span> acreditadas por casos.
        {devueltos > 0 && ` ${devueltos === 1 ? "El devuelto sigue abierto" : `Los ${devueltos} devueltos siguen abiertos`}: puede volver a subirlo corregido.`}
      </p>
    </div>
  );
}

/** Estado vacío: el alumno aún no ha enviado estudios, o el filtro no devuelve nada. */
export function VacioEstudios({ filtrado, onLimpiar }: { filtrado: boolean; onLimpiar: () => void }) {
  return (
    <div className="mt-4 rounded-[14px] border-[1.5px] border-dashed border-border bg-card px-6 py-12 text-center">
      <p className="text-[15px] font-bold text-foreground">{filtrado ? "No hay estudios con este filtro" : "Aún no ha enviado estudios"}</p>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-[color:var(--foreground-soft)]">
        {filtrado ? "Cambie de filtro para ver el resto." : "Aparecerán aquí en cuanto suba un caso desde su bitácora."}
      </p>
      {filtrado && (
        <button type="button" onClick={onLimpiar} className="mt-4 h-10 rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground">
          Ver todos
        </button>
      )}
    </div>
  );
}
