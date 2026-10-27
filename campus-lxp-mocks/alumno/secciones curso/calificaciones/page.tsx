"use client";

/**
 * Curso · CALIFICACIONES — todo lo calificado: tareas, foros, autoevaluaciones y casos.
 * Distinto de Tareas: aquí no hay fechas, hay resultados.
 * 3 cifras de resumen · filtro por tipo · tabla Elemento · Tipo · Puntos · Resultado · Comentarios.
 * "Ver rúbrica calificada" abre Comentarios de esa tarea. Sin color de atención.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Table2 } from "lucide-react";
import type { Calificacion, TipoCalificable } from "../_components/curso";
import { BotonSec, CALIFICACIONES, CabeceraPagina, Chip, Segmentado, card, focusRing, kicker, mono, softText, th } from "../_components/curso";

const COLS = "grid grid-cols-[minmax(0,1.3fr)_150px_110px_124px_minmax(0,1.5fr)] items-start";
const TIPO: Record<TipoCalificable, { etiqueta: string; tono: "neutro" | "info" | "ok" }> = {
  tarea: { etiqueta: "Tarea", tono: "neutro" },
  foro: { etiqueta: "Foro", tono: "neutro" },
  autoevaluacion: { etiqueta: "Autoevaluación", tono: "info" },
  caso: { etiqueta: "Caso validado", tono: "ok" },
};

export default function Calificaciones({ params, items = CALIFICACIONES }: { params: { id: string }; items?: Calificacion[] }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"todo" | TipoCalificable>("todo");
  const visibles = useMemo(() => items.filter((c) => tipo === "todo" || c.tipo === tipo), [items, tipo]);

  const calificados = items.filter((c) => c.resultado.includes("%"));
  const promedio = Math.round(calificados.reduce((s, c) => s + parseFloat(c.resultado), 0) / (calificados.length || 1));

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina
        titulo="Calificaciones"
        sub="Lo que ya le calificaron en tareas, foros, autoevaluaciones y casos."
        acciones={<BotonSec icono={<Printer aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />} onClick={() => window.print()}>Imprimir</BotonSec>}
      />

      <div className="grid gap-3.5 sm:grid-cols-3">
        {[
          ["Promedio actual", String(promedio), "%", "sobre lo calificado"],
          ["Calificado", String(items.filter((c) => c.resultado !== "sin calificar").length), `de ${items.length}`, "elementos del periodo"],
          ["Horas acreditadas", "480", "h", "de 1000 del programa"],
        ].map(([t, v, u, s]) => (
          <div key={t} className={`${card} px-[18px] py-4`}>
            <p className={kicker}>{t}</p>
            <p className="mt-2.5 flex items-baseline gap-1.5">
              <span className={`${mono} text-[28px] font-extrabold leading-none tracking-[-0.02em]`}>{v}</span>
              <span className="text-[13px] font-semibold text-muted-foreground">{u}</span>
            </p>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>

      <Segmentado
        valor={tipo}
        onCambio={setTipo}
        opciones={[
          { id: "todo", etiqueta: "Todo" },
          { id: "tarea", etiqueta: "Tareas" },
          { id: "foro", etiqueta: "Foros" },
          { id: "autoevaluacion", etiqueta: "Autoevaluaciones" },
          { id: "caso", etiqueta: "Casos" },
        ]}
      />

      <section className={`${card} overflow-hidden`}>
        <div className={`${COLS} border-b border-border bg-muted`}>
          {["Elemento", "Tipo", "Puntos", "Resultado", "Comentarios y evaluación"].map((t, i) => (
            <span key={t} className={`px-[18px] py-[11px] ${th} ${i === 2 || i === 3 ? "text-right" : ""}`}>
              {t}
            </span>
          ))}
        </div>
        {visibles.map((c, i) => {
          const sinNota = c.puntos.startsWith("—");
          return (
            <div key={c.id} className={`${COLS} ${i ? "border-t border-border" : ""}`}>
              <span className="min-w-0 px-[18px] py-[15px]">
                <span className="block text-[13px] font-bold">{c.clave}</span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">{c.descripcion}</span>
              </span>
              <span className="px-[18px] py-[15px]">
                <Chip tono={TIPO[c.tipo].tono}>{TIPO[c.tipo].etiqueta}</Chip>
              </span>
              <span className={`${mono} px-[18px] py-[15px] text-right text-[13px] font-bold ${sinNota ? "text-muted-foreground" : ""}`}>{c.puntos}</span>
              <span className={`${mono} whitespace-nowrap px-[18px] py-[15px] text-right text-[12.5px] font-bold ${c.resultado.includes("%") ? "text-secondary" : "text-muted-foreground"}`}>
                {c.resultado}
              </span>
              <span className="min-w-0 px-[18px] py-[15px]">
                {c.comentario && <span className={`block text-[12.5px] leading-relaxed ${softText}`}>{c.comentario}</span>}
                {c.tieneRubrica && (
                  <button
                    type="button"
                    onClick={() => router.push(`/curso/${params.id}/tareas/${c.id}/comentarios`)}
                    className={`inline-flex items-center gap-1.5 text-[12px] font-semibold text-secondary ${c.comentario ? "mt-1.5" : ""} ${focusRing}`}
                  >
                    <Table2 aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                    Ver rúbrica calificada
                  </button>
                )}
                {!c.comentario && !c.tieneRubrica && <span className="text-[12.5px] text-muted-foreground">—</span>}
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}
