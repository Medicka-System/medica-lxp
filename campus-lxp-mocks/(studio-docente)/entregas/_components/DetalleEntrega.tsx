"use client";

/**
 * Detalle de una TAREA ABIERTA: respuesta del alumno, rúbrica del diseñador y pre-análisis de
 * Eco (nota sugerida + comentario + en qué se basó). El docente ajusta la nota y confirma.
 * Eco nunca asienta la nota sola.
 */

import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, Avatar } from "./ui";
import type { Entrega, Actividad, EntregasData } from "./tipos";

export type DetalleEntregaProps = {
  grupo: string;
  actividad: Actividad;
  resumen: EntregasData["resumen"];
  entregas: Entrega[];
  abierta: string | null;
  setAbierta: (id: string | null) => void;
  notaLocal: number | null;
  setNotaLocal: (v: number | null) => void;
  onConfirmar: (id: string, nota: number | null) => void;
  onEditarNota: (delta: number) => void;
  entrega: Entrega;
};
export function DetalleEntrega({ grupo, actividad, resumen, entregas, abierta, setAbierta, notaLocal, setNotaLocal, onConfirmar, onEditarNota, entrega }: DetalleEntregaProps) {
  const ia = entrega.ia!;
  return (
      <div className="mx-auto w-full max-w-[1240px] px-6 pb-8 pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAbierta(null)}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ArrowLeft aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
            Volver a las entregas
          </button>
          <Avatar ini={entrega.alumno.ini} size={40} />
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-tight">{entrega.alumno.nombre}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {grupo} · {actividad.clave} · Tarea abierta · entregó {entrega.entregadaHace}
            </p>
          </div>
          <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
            3 de {resumen.porConfirmar} por confirmar
          </span>
        </div>

        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_392px]">
          <div className="flex min-w-0 flex-col gap-4">
            <section className={`${card} p-5`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Consigna</p>
                <span className={`text-[12.5px] ${softText}`}>{actividad.consigna}</span>
              </div>
              <p className={`${kicker} mt-4 text-secondary`}>Respuesta del alumno</p>
              <div className="mt-2.5 max-h-[300px] overflow-y-auto pr-1.5">
                {entrega.respuesta.map((p, i) => (
                  <p
                    key={i}
                    className={`text-[14px] leading-[1.75] ${softText} ${i ? "mt-3.5" : ""}`}
                    style={{ textWrap: "pretty" }}
                  >
                    {p}
                  </p>
                ))}
              </div>
              <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-border pt-3.5">
                <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                  238 palabras · sin adjuntos
                </span>
                <button
                  type="button"
                  className={`ml-auto h-9 rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                >
                  Ver su caso en la bitácora
                </button>
              </div>
            </section>

            {/* rúbrica del diseñador: contra esto se juzga */}
            <section className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-4">
                <p className={`${kicker} text-muted-foreground`}>Rúbrica del diseñador</p>
                <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
                  {entrega.rubrica.length} criterios · 100%
                </span>
              </div>
              {entrega.rubrica.map((c) => (
                <div key={c.id} className="flex items-start gap-3 border-t border-border px-3.5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold leading-snug">{c.texto}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                      {c.nivelAlcanzado}
                    </span>
                  </span>
                  <span className={`${mono} shrink-0 text-[11px] text-muted-foreground`}>{c.peso}%</span>
                  <span
                    className={`${mono} w-[52px] shrink-0 text-right text-[14px] font-extrabold ${
                      c.puntaje >= 0.8
                        ? "text-secondary"
                        : c.puntaje >= 0.6
                          ? "text-foreground"
                          : "text-[color:var(--warning-foreground)]"
                    }`}
                  >
                    {(c.puntaje * 10).toFixed(1)}
                  </span>
                </div>
              ))}
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-3.5">
            {/* pre-análisis de Eco: nota, sustento y comentario redactado */}
            <section className="rounded-xl border border-[color:var(--info-border)] bg-card p-5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className={`${kicker} text-[color:var(--info-foreground)]`}>Pre-análisis de Eco</p>
              </div>

              <div className="mt-3.5 flex items-end gap-3">
                <span className={`${mono} text-[40px] font-extrabold leading-none tracking-[-0.03em]`}>
                  {ia.notaSugerida.toFixed(1)}
                </span>
                <span className="pb-1">
                  <span className="block text-[11.5px] font-bold text-[color:var(--info-foreground)]">
                    nota sugerida
                  </span>
                  <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                    confianza {ia.confianza}
                  </span>
                </span>
              </div>

              <p className="mt-3.5 text-[11px] font-bold">En qué se basó</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {ia.sustento.map((s) => (
                  <li key={s.texto} className="flex items-start gap-2">
                    {s.clase === "ok" ? (
                      <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2.6} />
                    ) : (
                      <TriangleAlert
                        aria-hidden
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--warning-foreground)]"
                        strokeWidth={2}
                      />
                    )}
                    <span
                      className={`min-w-0 flex-1 text-[12px] font-medium leading-relaxed ${
                        s.clase === "ok" ? softText : "text-[color:var(--warning-foreground)]"
                      }`}
                    >
                      {s.texto}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[11px] font-bold">Comentario redactado</p>
              <div className="mt-2 rounded-[10px] border border-border bg-muted p-3">
                <p className={`text-[12.5px] leading-relaxed ${softText}`}>{ia.comentario}</p>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {["Más breve", "Más exigente", "Editar"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`h-8 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            {/* la nota la pone el docente */}
            <section className={`${card} p-5`}>
              <p className={`${kicker} text-muted-foreground`}>Su calificación</p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEditarNota(-0.5)}
                  aria-label="Bajar la nota"
                  className={`grid h-11 w-10 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
                >
                  <Minus aria-hidden className="h-4 w-4" strokeWidth={2.4} />
                </button>
                <input
                  type="text"
                  value={(notaLocal ?? ia.notaSugerida).toFixed(1)}
                  onChange={(e) => setNotaLocal(Number(e.target.value.replace(",", ".")) || 0)}
                  aria-label="Nota"
                  className={`${mono} h-[52px] min-w-0 flex-1 rounded-[10px] border border-primary bg-card text-center text-[24px] font-extrabold text-foreground outline-none`}
                />
                <button
                  type="button"
                  onClick={() => onEditarNota(0.5)}
                  aria-label="Subir la nota"
                  className={`grid h-11 w-10 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
                >
                  <Plus aria-hidden className="h-4 w-4" strokeWidth={2.4} />
                </button>
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                Cambie la nota si su criterio difiere; el comentario se guarda tal como quede arriba.
              </p>
              <button
                type="button"
                onClick={() => onConfirmar(entrega.id, notaLocal)}
                className={`mt-3.5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                <Check aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.4} />
                Confirmar y enviar al alumno
              </button>
              <button
                type="button"
                className={`mt-2 h-11 w-full rounded-[10px] border border-border bg-card text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Pedir que la reenvíe
              </button>
            </section>
          </aside>
        </div>
      </div>
  );
}
