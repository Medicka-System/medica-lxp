"use client";

/**
 * Studio · Entregas — segunda herramienta diaria del DOCENTE
 *
 *   VistaActividad          → grupo/actividad, resumen, lista por alumno, confirmar en lote
 *   DetalleEntrega          → tarea abierta: respuesta + rúbrica + pre-análisis de Eco
 *   AuditoriaAutoevaluacion → autoevaluación auto-calificada: acierto por pregunta
 *   PanelEco                → riel / panel de Eco
 *
 * Autoevaluaciones: las califica el sistema (sin Eco). Tareas abiertas: Eco sugiere, el docente
 * confirma. Un solo color de atención (ámbar); el violeta es Eco.
 */

import { useMemo, useState } from "react";
import type { EntregasData } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { DetalleEntrega } from "./_components/DetalleEntrega";
import { VistaActividad } from "./_components/VistaActividad";
import { PanelEco } from "./_components/PanelEco";

export { AuditoriaAutoevaluacion } from "./_components/AuditoriaAutoevaluacion";

export default function Entregas({ data = MOCK }: { data?: EntregasData }) {
  const { grupo, actividad, resumen, entregas, sinEntregar, altaConfianza, asistente } = data;
  const [abierta, setAbierta] = useState<string | null>(null);
  const [iaAbierta, setIaAbierta] = useState(false);
  const [peticion, setPeticion] = useState("");
  const [busca, setBusca] = useState("");
  const [soloAbiertas, setSoloAbiertas] = useState(false);
  const [notaLocal, setNotaLocal] = useState<number | null>(null);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirEntrega = (id: string) => {
    const e = entregas.find((x) => x.id === id);
    setAbierta(id);
    setNotaLocal(e?.ia?.notaSugerida ?? e?.nota ?? null);
  };
  const onConfirmar = (_id: string, _nota: number | null) => {};
  const onConfirmarLote = () => {};
  const onEditarNota = (delta: number) => setNotaLocal((n) => Math.max(0, Math.min(10, (n ?? 0) + delta)));
  const onPreguntarIA = (_p: string) => {};
  const onElegirActividad = (_id: string) => {};
  const onRecordar = () => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return entregas.filter(
      (e) =>
        (!soloAbiertas || e.tipo === "abierta") &&
        (!q || e.alumno.nombre.toLowerCase().includes(q)),
    );
  }, [entregas, soloAbiertas, busca]);

  const entrega = abierta ? entregas.find((e) => e.id === abierta) : null;

  
  if (entrega && entrega.respuesta && entrega.rubrica && entrega.ia) {
    return (
      <DetalleEntrega {...{ grupo, actividad, resumen, entregas, abierta, setAbierta, notaLocal, setNotaLocal, onConfirmar, onEditarNota, entrega }} />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-4 px-6 pb-8 pt-5">
      <VistaActividad {...{ grupo, actividad, resumen, entregas, sinEntregar, altaConfianza, busca, setBusca, soloAbiertas, setSoloAbiertas, onAbrirEntrega, onConfirmarLote, onElegirActividad, onRecordar, visibles }} />
      <PanelEco {...{ asistente, iaAbierta, setIaAbierta, peticion, setPeticion, onPreguntarIA }} />
    </div>
  );
}
