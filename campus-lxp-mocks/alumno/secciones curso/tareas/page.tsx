"use client";

/**
 * Curso · TAREAS — lista cronológica de todas las entregas.
 * Columnas: Tarea · Estado de entrega · Puntuación · Evaluación.
 * "1 envío · 1 archivo" abre el Historial; "Comentarios" abre la rúbrica calificada.
 * Único ámbar de la pantalla: la tarea que vence pronto (≤ 3 días).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, History } from "lucide-react";
import type { Tarea } from "../_components/curso";
import { BotonSec, CabeceraPagina, Chip, Segmentado, TAREAS, card, focusRing, mono, softText, th } from "../_components/curso";

const COLS = "grid grid-cols-[minmax(0,1.6fr)_210px_150px_200px]";

export default function Tareas({ params, tareas = TAREAS }: { params: { id: string }; tareas?: Tarea[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<"todas" | "pendientes" | "entregadas">("todas");
  const base = `/curso/${params.id}/tareas`;

  const visibles = useMemo(
    () => tareas.filter((t) => (filtro === "todas" ? true : filtro === "pendientes" ? t.estado === "pendiente" : t.estado === "enviada")),
    [tareas, filtro],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina
        titulo="Tareas"
        sub="Todas las entregas del programa, con sus fechas y lo que ya le calificaron."
        acciones={
          <BotonSec icono={<History aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />} onClick={() => router.push(`${base}/historial`)}>
            Historial de envíos
          </BotonSec>
        }
      />

      <Segmentado
        valor={filtro}
        onCambio={setFiltro}
        opciones={[
          { id: "todas", etiqueta: "Todas", n: tareas.length },
          { id: "pendientes", etiqueta: "Pendientes", n: tareas.filter((t) => t.estado === "pendiente").length },
          { id: "entregadas", etiqueta: "Entregadas", n: tareas.filter((t) => t.estado === "enviada").length },
        ]}
      />

      <section className={`${card} overflow-hidden`}>
        <div className={`${COLS} border-b border-border bg-muted`}>
          {["Tarea", "Estado de entrega", "Puntuación", "Evaluación"].map((t, i) => (
            <span key={t} className={`px-[18px] py-[11px] ${th} ${i ? "border-l border-border" : ""}`}>
              {t}
            </span>
          ))}
        </div>

        {visibles.map((t, i) => {
          const pendiente = t.estado === "pendiente";
          const pct = t.puntos !== undefined ? Math.round((t.puntos / t.puntosMax) * 100) : null;
          return (
            <div key={t.id} className={`${COLS} ${i ? "border-t border-border" : ""}`}>
              <div className="min-w-0 px-[18px] py-4">
                <p className="text-[13.5px] font-bold">{t.clave}</p>
                <p className={`mt-0.5 text-[12.5px] ${softText}`}>{t.descripcion}</p>
                <p className={`${mono} mt-2 flex items-center gap-1.5 text-[11.5px] ${pendiente ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"}`}>
                  <Clock aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  Vence el {t.vence} · {t.ventana}
                </p>
              </div>

              <div className="border-l border-border px-[18px] py-4">
                {t.estado === "enviada" && (
                  <>
                    <button
                      type="button"
                      onClick={() => router.push(`${base}/historial?tarea=${t.id}`)}
                      className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-secondary ${focusRing}`}
                    >
                      <FileText aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      {t.envios} envío · {t.archivos} archivo
                    </button>
                    <p className={`${mono} mt-1 text-[11px] text-muted-foreground`}>ver historial</p>
                  </>
                )}
                {pendiente && (
                  <>
                    <Chip tono="warn" icono={<Clock className="h-[11px] w-[11px]" strokeWidth={2.2} />}>
                      Vence en {t.diasParaVencer} días
                    </Chip>
                    <p className="mt-1.5 text-[11.5px] text-muted-foreground">no enviada</p>
                  </>
                )}
                {t.estado === "no-disponible" && <span className="text-[12.5px] text-muted-foreground">Aún no disponible</span>}
              </div>

              <div className="border-l border-border px-[18px] py-4">
                <p className={`${mono} text-[13.5px] font-bold ${pct === null ? "text-muted-foreground" : ""}`}>
                  {t.puntos ?? "—"} / {t.puntosMax}
                </p>
                {pct !== null && <p className={`${mono} mt-1 text-[11.5px] text-secondary`}>{pct}%</p>}
              </div>

              <div className="border-l border-border px-[18px] py-4">
                {t.comentarios === "sin-leer" && (
                  <>
                    <button type="button" onClick={() => router.push(`${base}/${t.id}/comentarios`)} className={`inline-flex items-center gap-2 text-[12.5px] font-bold text-secondary ${focusRing}`}>
                      <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-primary" />
                      Comentarios sin leer
                    </button>
                    <p className="mt-1 text-[11px] text-muted-foreground">con rúbrica calificada</p>
                  </>
                )}
                {t.comentarios === "leidos" && (
                  <>
                    <button type="button" onClick={() => router.push(`${base}/${t.id}/comentarios`)} className={`text-[12.5px] font-semibold ${softText} ${focusRing}`}>
                      Ver comentarios
                    </button>
                    <p className="mt-1 text-[11px] text-muted-foreground">leídos</p>
                  </>
                )}
                {t.comentarios === "ninguno" && <span className="text-[12.5px] text-muted-foreground">—</span>}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
