"use client";

/**
 * Studio · Inicio del SÚPER ADMIN — centro de control
 *
 *   CabeceraAdmin → título, fecha y accesos de gobierno
 *   CapaNegocio   → ¿cómo va la escuela?
 *   CapaSistema   → ¿todo está funcionando? (solo súper admin)
 *   CapaAtencion  → qué exige su firma, qué solo se observa, y Eco
 *
 * ROJO solo por integración caída y dinero vencido; ÁMBAR para lo demás pendiente; VIOLETA es Eco.
 * La cartera llega de CORA en solo lectura.
 */

import { useState } from "react";
import type { AdminHomeData } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { CabeceraAdmin } from "./_components/CabeceraAdmin";
import { CapaNegocio } from "./_components/CapaNegocio";
import { CapaSistema } from "./_components/CapaSistema";
import { CapaAtencion } from "./_components/CapaAtencion";

export { EcoMark } from "./_components/ui";

export default function AdminInicio({ data = MOCK }: { data?: AdminHomeData }) {
  const {
    fecha,
    kpis,
    tendencia,
    avance,
    riesgo,
    cartera,
    integraciones,
    gastoIA,
    sistema,
    alertas,
    decisiones,
    actividad,
    ateneo,
    eco,
  } = data;
  const [rango, setRango] = useState<"6m" | "12m">("6m");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onVerGrupo = (_id: string) => {};
  const onVerAlerta = (_id: string) => {};
  const onEmitirCertificado = () => {};
  const onPreguntarEco = (_q: string) => {};
  const onIrAConfig = (_area: string) => {};
  const onAbrirCORA = () => {};
  const onResolverSolicitud = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const caidas = integraciones.filter((i) => i.estado === "caida").length;

  return (
    <div className="mx-auto w-full max-w-[1360px] px-6 pb-7 pt-5">
      <CabeceraAdmin {...{ fecha, onIrAConfig }} />
      <CapaNegocio {...{ kpis, tendencia, avance, riesgo, cartera, actividad, rango, setRango, onVerGrupo, onAbrirCORA }} />
      <CapaSistema {...{ integraciones, gastoIA, sistema, alertas, onVerAlerta, onIrAConfig, caidas }} />
      <CapaAtencion {...{ decisiones, actividad, ateneo, eco, onEmitirCertificado, onPreguntarEco, onResolverSolicitud }} />
    </div>
  );
}
