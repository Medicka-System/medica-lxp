"use client";

/**
 * Studio · Analítica (súper admin) — datos para DECIDIR
 *
 *   CabeceraAnalitica → filtros (periodo, programa, grupo), exportar, Eco
 *   CapaNegocio       → crecimiento, retención, llenado, cartera
 *   CapaAprendizaje   → avance real, dónde se atoran, I-AIM, repaso espaciado (vía LRS)
 *   CapaOperacion     → staff, Ateneo, uso y calidad de Eco
 *
 * Toda métrica termina en una señal accionable. ÁMBAR para lo que requiere acción; ROJO solo para
 * caídas críticas; VIOLETA es Eco.
 */

import { useState } from "react";
import type { AnaliticaData } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { CabeceraAnalitica } from "./_components/CabeceraAnalitica";
import { CapaNegocio } from "./_components/CapaNegocio";
import { CapaAprendizaje } from "./_components/CapaAprendizaje";
import { CapaOperacion } from "./_components/CapaOperacion";

export { EcoMark } from "./_components/ui";

export default function Analitica({ data = MOCK }: { data?: AnaliticaData }) {
  const { negocio, aprendizaje, operacion } = data;
  const [periodo, setPeriodo] = useState(data.periodo);
  const [pregunta, setPregunta] = useState("");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onFiltrar = (_clave: string, _valor: string) => {};
  const onPreguntarEco = (_q: string) => setPregunta("");
  const onVerDetalle = (_id: string) => {};
  const onExportar = () => {};
  /* ──────────────────────────────────────────────────────── */

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <CabeceraAnalitica {...{ periodo, setPeriodo, onFiltrar, onExportar }} />
      <CapaNegocio {...{ negocio }} />
      <CapaAprendizaje {...{ aprendizaje, pregunta, setPregunta, onPreguntarEco, onVerDetalle }} />
      <CapaOperacion {...{ operacion }} />
    </div>
  );
}
