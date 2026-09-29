"use client";

/**
 * Bloque pedagógico del caso en el DETALLE del post (viñeta + hallazgos + diagnóstico
 * presuntivo). Reusa `ContenidoEstructuradoCasoVista` (la misma verdad estructurada de la
 * bitácora, que YA salta la sección `encabezado`/ficha del paciente) y el patrón de lectura
 * de `caso-detalle`. Los datos los trae `getPedagogiaCasoAteneo` bajo RLS (dueño del caso):
 * caso ajeno → `null` → no se muestra (misma frontera que el visor). NUNCA metadata de
 * paciente (§10) — solo lo pedagógico. El estudio/imágenes viven en el visor, no aquí.
 */

import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";
import { tieneContenidoEstructurado } from "@campus/shared";
import { card, kickerWide as kicker, softText } from "@/components/tokens";
import { ContenidoEstructuradoCasoVista } from "@/components/casos/contenido-estructurado-caso";
import { getPedagogiaCasoAteneo } from "@/lib/campus/ateneo-social-acciones";
import type { BloquePedagogicoCasoData } from "./tipos";

export function BloquePedagogicoCaso({ casoId }: { casoId: string }) {
  const [data, setData] = useState<BloquePedagogicoCasoData | null | "cargando">("cargando");

  useEffect(() => {
    let vivo = true;
    setData("cargando");
    void getPedagogiaCasoAteneo(casoId).then((d) => {
      if (vivo) setData(d);
    });
    return () => {
      vivo = false;
    };
  }, [casoId]);

  // Cargando o caso ajeno (RLS → null): no se muestra el bloque.
  if (data === "cargando" || data === null) return null;

  const estructurado = tieneContenidoEstructurado(data.contenidoEstructurado);
  const hayAlgo =
    data.vineta?.trim() || estructurado || data.hallazgos?.trim() || data.presuntivo?.trim();
  if (!hayAlgo) return null;

  return (
    <div className="mt-4 flex flex-col gap-4">
      {data.vineta?.trim() && (
        <section className={`${card} p-5`}>
          <p className={`${kicker} text-muted-foreground`}>Viñeta clínica</p>
          <p className={`mt-3 max-w-[70ch] whitespace-pre-line text-[14.5px] leading-[1.75] ${softText}`}>
            {data.vineta}
          </p>
        </section>
      )}

      {/* Hallazgos: verdad estructurada (coincidible con el reporte) o texto plano legado. */}
      {estructurado ? (
        <ContenidoEstructuradoCasoVista contenido={data.contenidoEstructurado!} modo="previa" />
      ) : data.hallazgos?.trim() ? (
        <section className={`${card} p-5`}>
          <p className={`${kicker} text-muted-foreground`}>Hallazgos</p>
          <p className={`mt-3 max-w-[70ch] whitespace-pre-line text-[14.5px] leading-[1.75] ${softText}`}>
            {data.hallazgos}
          </p>
        </section>
      ) : null}

      {data.presuntivo?.trim() && (
        <section className={`${card} p-5`}>
          <p className={`${kicker} text-muted-foreground`}>Diagnóstico presuntivo</p>
          <p className="mt-3 flex items-start gap-2.5 text-[14.5px] font-semibold leading-relaxed">
            <Stethoscope aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-secondary" strokeWidth={1.75} />
            {data.presuntivo}
          </p>
        </section>
      )}
    </div>
  );
}
