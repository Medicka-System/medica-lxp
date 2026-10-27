"use client";

/**
 * Tareas › COMENTARIOS — feedback del docente + rúbrica calificada.
 * Resumen: puntuación grande (mono 38) | docente con chip navy y comentario general.
 * Rúbrica: criterio × 4 niveles × puntos; el nivel obtenido lleva borde 2px teal, fondo accent y
 * palomita (nunca solo color). Total al pie. Al abrir, los comentarios pasan a "leídos".
 */

import { useEffect } from "react";
import { Check, Download, Printer, Table2 } from "lucide-react";
import type { Rubrica } from "../../../_components/curso";
import { Avatar, BotonSec, CabeceraPagina, Chip, RUBRICA, card, kicker, mono, softText, th } from "../../../_components/curso";

const COLS = "grid grid-cols-[170px_repeat(4,minmax(0,1fr))_96px]";
const pts = (n: number) => `${n} ${n === 1 ? "punto" : "puntos"}`;

export default function Comentarios({
  params,
  rubrica = RUBRICA,
  docente = { ini: "AS", nombre: "Dr. Alejandro Sandoval" },
  comentario = "Muy buen informe, Sofía. La medición de la cortical está en el plano correcto y la impresión cierra con lo que describió. Para el próximo, agregue el índice de resistencia cuando use Doppler.",
  onMarcarLeido = (_id: string) => {},
}: {
  params: { id: string; tarea: string };
  rubrica?: Rubrica;
  docente?: { ini: string; nombre: string };
  comentario?: string;
  onMarcarLeido?: (tareaId: string) => void;
}) {
  useEffect(() => onMarcarLeido(params.tarea), [params.tarea, onMarcarLeido]);

  const total = rubrica.criterios.reduce((s, c) => s + c.niveles[c.elegido].puntos, 0);
  const max = rubrica.criterios.reduce((s, c) => s + Math.max(...c.niveles.map((n) => n.puntos)), 0);
  const pct = Math.round((total / max) * 100);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina
        titulo="Comentarios de la Tarea 1 · M1"
        sub={`Informe estructurado de un riñón normal · calificada por el ${docente.nombre} el 25 ago`}
        migas={[{ etiqueta: "Tareas", href: `/curso/${params.id}/tareas` }, { etiqueta: "Comentarios" }]}
        acciones={
          <>
            <BotonSec icono={<Printer aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />} onClick={() => window.print()}>
              Imprimir
            </BotonSec>
            <BotonSec icono={<Download aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />}>Descargar</BotonSec>
          </>
        }
      />

      <section className={`${card} grid items-center gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)]`}>
        <div className="border-border md:border-r md:pr-6">
          <p className={kicker}>Puntuación</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className={`${mono} text-[38px] font-extrabold leading-none tracking-[-0.03em] text-secondary`}>{total}</span>
            <span className={`${mono} text-[16px] font-semibold text-muted-foreground`}>/ {max}</span>
          </p>
          <p className="mt-2">
            <Chip tono="ok" icono={<Check className="h-[11px] w-[11px]" strokeWidth={2.2} />}>
              {pct}% · acreditada
            </Chip>
          </p>
        </div>
        <div className="flex gap-3.5">
          <Avatar ini={docente.ini} size={40} staff />
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="text-[13.5px] font-bold">{docente.nombre}</span>
              <Chip tono="navy">Docente</Chip>
            </p>
            <p className={`mt-2 max-w-[72ch] text-[13.5px] leading-relaxed ${softText}`}>{comentario}</p>
          </div>
        </div>
      </section>

      <section className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
          <Table2 aria-hidden className="h-4 w-4 text-secondary" strokeWidth={1.75} />
          <p className="text-[13.5px] font-bold">Rúbrica · {rubrica.titulo}</p>
          <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
            {rubrica.criterios.length} criterios · {max} puntos
          </span>
        </div>

        <div role="table" aria-label="Rúbrica calificada">
          <div role="row" className={`${COLS} border-b border-border bg-muted`}>
            <span role="columnheader" className={`px-4 py-[11px] ${th}`}>Criterio</span>
            {rubrica.niveles.map((n) => (
              <span key={n} role="columnheader" className={`border-l border-border px-3.5 py-[11px] ${th}`}>
                {n}
              </span>
            ))}
            <span role="columnheader" className={`border-l border-border px-4 py-[11px] text-right ${th}`}>Puntos</span>
          </div>

          {rubrica.criterios.map((c, i) => (
            <div key={c.id} role="row" className={`${COLS} ${i ? "border-t border-border" : ""}`}>
              <span role="rowheader" className="px-4 py-3.5 text-[12.5px] font-semibold leading-snug">{c.nombre}</span>
              {c.niveles.map((n, k) =>
                k === c.elegido ? (
                  <span key={k} role="cell" aria-label={`Nivel obtenido: ${rubrica.niveles[k]}`} className="relative m-1.5 rounded-[10px] border-2 border-primary bg-accent px-3 pb-[26px] pt-2.5">
                    <span className={`${mono} block text-[11px] font-bold text-secondary`}>{pts(n.puntos)}</span>
                    <span className="mt-1.5 block text-[12px] font-medium leading-snug">{n.texto}</span>
                    <span aria-hidden className="absolute bottom-[7px] right-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]">
                      <Check className="h-3 w-3" strokeWidth={2.8} />
                    </span>
                  </span>
                ) : (
                  <span key={k} role="cell" className="border-l border-border px-3.5 py-4">
                    <span className={`${mono} block text-[11px] text-muted-foreground`}>{pts(n.puntos)}</span>
                    <span className="mt-1.5 block text-[12px] leading-snug text-muted-foreground">{n.texto}</span>
                  </span>
                ),
              )}
              <span role="cell" className={`${mono} border-l border-border p-4 text-right text-[13px] font-bold`}>
                {c.niveles[c.elegido].puntos}/{Math.max(...c.niveles.map((n) => n.puntos))}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center border-t border-border bg-muted px-4 py-3.5">
          <span className="text-[13px] font-bold">Total</span>
          <span className={`${mono} ml-auto text-[15px] font-extrabold text-secondary`}>
            {total} / {max}
          </span>
        </div>
      </section>
    </div>
  );
}
