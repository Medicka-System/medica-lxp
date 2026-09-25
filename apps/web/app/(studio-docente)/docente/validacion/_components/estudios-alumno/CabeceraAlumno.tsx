"use client";

import { MessageCircle, BookOpen } from "lucide-react";
import type { ResumenAlumno, EstudioAlumno } from "./tipos";

const mono = "font-mono tabular-nums";
const focusDark =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar";

/**
 * Banda navy con la identidad del alumno y cuatro cifras.
 * Solo "por validar" lleva color de atención (ámbar claro sobre navy).
 */
export function CabeceraAlumno({
  alumno,
  estudios,
  onConsulta,
  onBitacora,
}: {
  alumno: ResumenAlumno;
  estudios: EstudioAlumno[];
  onConsulta: () => void;
  onBitacora: () => void;
}) {
  const pendientes = estudios.filter((e) => e.estado === "pendiente").length;
  const cifras = [
    { valor: String(estudios.length), etiqueta: "estudios enviados", tono: "text-white" },
    { valor: String(pendientes), etiqueta: "por validar", tono: "text-[color:var(--warning-border)]" },
    { valor: `${alumno.horasAcumuladas} h`, etiqueta: "acumuladas", tono: "text-white" },
    { valor: String(alumno.competenciaInterpretacion), etiqueta: "interpretación", tono: "text-[#a8e0dc]" },
  ];

  return (
    <section className="relative overflow-hidden bg-sidebar px-7 pt-[22px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 160% at 92% 0%, rgba(26,136,128,.55) 0%, rgba(15,45,82,0) 60%)" }}
      />
      <div className="relative flex flex-wrap items-center gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-[18px] font-extrabold text-[color:var(--sidebar)] shadow-[0_0_0_4px_rgba(255,255,255,.12)]"
        >
          {alumno.ini}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-white">{alumno.nombre}</h2>
          <p className="mt-1 text-[12.5px] text-[color:var(--hero-ink-muted)]">
            {alumno.especialidad} · {alumno.grupo} · cursando <span className={`${mono} text-white`}>{alumno.leccionActual}</span>
          </p>
        </div>
        <span className="flex shrink-0 gap-2">
          <button type="button" onClick={onConsulta} className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-white/[0.28] px-3 text-[12.5px] font-semibold text-white hover:bg-white/[0.12] ${focusDark}`}>
            <MessageCircle aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Enviar consulta
          </button>
          <button type="button" onClick={onBitacora} className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-white/[0.28] px-3 text-[12.5px] font-semibold text-white hover:bg-white/[0.12] ${focusDark}`}>
            <BookOpen aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Ver su bitácora
          </button>
        </span>
      </div>

      {/* KPIs AGRUPADOS a la izquierda (w-fit): no se estiran a todo el ancho en pantallas
          anchas; cada cifra tiene ancho fijo y el espacio sobrante queda a la derecha. */}
      <dl className="relative mt-5 grid w-fit grid-cols-2 gap-px overflow-hidden rounded-t-xl bg-white/10 sm:grid-cols-4">
        {cifras.map((c) => (
          <div key={c.etiqueta} className="min-w-[140px] bg-[rgba(10,33,64,.55)] px-4 py-3">
            <dd className={`${mono} m-0 text-[20px] font-extrabold leading-none ${c.tono}`}>{c.valor}</dd>
            <dt className="mt-1.5 text-[11px] text-[color:var(--hero-ink-muted)]">{c.etiqueta}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
