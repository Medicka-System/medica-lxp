"use client";

import { ArrowRight, Check, Clock, Layers, Play, Sparkles, Undo2 } from "lucide-react";
import { HORAS_URGENTE, type EstudioAlumno } from "./tipos";
import { MiniaturaEstudio } from "./MiniaturaEstudio";

const mono = "font-mono tabular-nums";
const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

const ESTADO = {
  pendiente: {
    etiqueta: "Por validar",
    icono: Clock,
    clase: "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
    cta: "Validar",
  },
  aprobado: { etiqueta: "Aprobado", icono: Check, clase: "border-[#a8e0dc] bg-accent text-accent-foreground", cta: "Ver validación" },
  devuelto: { etiqueta: "Devuelto con feedback", icono: Undo2, clase: "border-border bg-muted text-[color:var(--foreground-soft)]", cta: "Ver feedback" },
} as const;

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");

/**
 * Card de un estudio enviado por el alumno.
 * REGLA: la miniatura va LIMPIA. Nada encima de la imagen — el DICOM trae texto quemado del
 * equipo (preset, transductor, escala) que no se tapa. Estado, tipo y órgano viven en el cuerpo.
 * La imagen la renderiza `MiniaturaEstudio` (cliente) desde el `.dcm` anonimizado.
 */
export function CardEstudio({ estudio, onAbrir }: { estudio: EstudioAlumno; onAbrir: (id: string) => void }) {
  const e = estudio;
  const cfg = ESTADO[e.estado];
  const Icono = cfg.icono;
  const loop = e.frames > 1;
  const urgente = e.estado === "pendiente" && (e.horasEsperando ?? 0) > HORAS_URGENTE;
  const pendiente = e.estado === "pendiente";

  return (
    <article
      className={`relative flex w-full flex-col overflow-hidden rounded-[14px] border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_8px_24px_rgba(15,45,82,0.10)] ${
        urgente ? "border-[color:var(--warning-border)]" : "border-border"
      }`}
    >
      {/* Puntito verde PARPADEANTE (esquina sup-izq) = caso nuevo/sin analizar; se apaga al abrirlo. */}
      {pendiente && !e.vistoDocente && (
        <span
          aria-label="Caso nuevo sin analizar"
          className="pointer-events-none absolute left-2 top-2 z-10 h-2.5 w-2.5 animate-pulse rounded-full bg-green-500 ring-2 ring-green-500/40"
        />
      )}
      <MiniaturaEstudio casoId={e.id} titulo={e.titulo} onAbrir={onAbrir} />

      <div className="flex flex-1 flex-col px-[15px] pb-[15px] pt-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-bold ${cfg.clase}`}>
            <Icono aria-hidden className="h-3 w-3" strokeWidth={2.2} />
            {cfg.etiqueta}
          </span>
          <span
            className={`${mono} inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10px] font-bold ${
              loop ? "bg-primary text-[color:var(--sidebar)]" : "bg-sidebar text-white"
            }`}
          >
            {loop ? <Play aria-hidden className="h-[11px] w-[11px]" strokeWidth={2.2} /> : <Layers aria-hidden className="h-[11px] w-[11px]" strokeWidth={2.2} />}
            {loop ? `loop · ${e.frames} frames` : `${e.imagenes} ${e.imagenes === 1 ? "imagen" : "imágenes"}`}
          </span>
        </div>

        <p className={`${mono} mt-2.5 text-[10.5px] text-muted-foreground`}>
          {e.modulo} · {e.organo} · {fecha(e.fechaEnvio)}
        </p>
        <p className="mt-1.5 text-[14.5px] font-bold leading-snug text-foreground" style={{ textWrap: "pretty" }}>
          {e.titulo}
        </p>

        {pendiente && e.eco && (
          <div className="mt-2.5 flex items-center gap-2 rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 py-2">
            <Sparkles aria-hidden className="h-3.5 w-3.5 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 text-[11.5px] font-semibold text-[color:var(--info-foreground)]">
              Eco: {e.eco.veredicto === "confirmar" ? "listo para confirmar" : "requiere su criterio"} · <span className={mono}>{e.eco.confianza}%</span>
            </span>
          </div>
        )}

        {!pendiente && e.nota && <p className="mt-2.5 text-[12px] leading-relaxed text-[color:var(--foreground-soft)]">{e.nota}</p>}

        <div className="mt-auto flex items-center gap-2.5 pt-3">
          {urgente ? (
            <span className={`${mono} inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-[color:var(--warning-foreground)]`}>
              <Clock aria-hidden className="h-3 w-3" strokeWidth={2} />
              esperando {e.horasEsperando} h
            </span>
          ) : (
            <span className="whitespace-nowrap text-[11.5px] font-semibold text-muted-foreground">
              <span className={`${mono} font-bold ${e.estado === "aprobado" ? "text-secondary" : "text-foreground"}`}>{e.horas} h</span>
              {e.estado === "aprobado" ? " acreditadas" : " al aprobar"}
            </span>
          )}
          <button
            type="button"
            onClick={() => onAbrir(e.id)}
            className={`ml-auto inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-bold transition-colors ${focus} ${
              pendiente
                ? "bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white"
                : "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {cfg.cta}
            {pendiente && <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>
        </div>
      </div>
    </article>
  );
}
