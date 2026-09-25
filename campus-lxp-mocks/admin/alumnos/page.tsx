"use client";

/**
 * Studio · Alumnos (súper admin / admin) — consulta y seguimiento del avance en el campus
 *
 *   ListaAlumnos      → todos los alumnos de la escuela, filtrables, con los en riesgo destacados
 *   ExpedienteAlumno  → avance, actividad y administrativo de CORA (solo lectura)
 *
 * FRONTERA: alta, inscripción, pagos y matrícula viven en CORA. Aquí solo se VE y se da SEGUIMIENTO.
 * ÁMBAR para riesgo; ROJO solo para pago vencido y marcado como dato de CORA; VIOLETA es Eco.
 */

import { useMemo, useState } from "react";
import type { AlumnosData } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { ListaAlumnos } from "./_components/ListaAlumnos";
import { ExpedienteAlumno } from "./_components/ExpedienteAlumno";

export { EcoMark } from "./_components/ui";

export default function Alumnos({ data = MOCK }: { data?: AlumnosData }) {
  const { totales, detalleTotales, alumnos, expediente } = data;
  const [vista, setVista] = useState<"lista" | "expediente">("lista");
  const [soloRiesgo, setSoloRiesgo] = useState(false);
  const [busca, setBusca] = useState("");
  const [ecoAbierto, setEcoAbierto] = useState(true);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirAlumno = (_id: string) => setVista("expediente");
  const onVerBitacora = (_id: string) => {};
  const onContactar = (_id: string) => {};
  const onVerHistorial = (_id: string) => {};
  const onFiltrar = (_f: string) => {};
  const onPreguntarEco = (_q: string) => {};
  const onAbrirCORA = (_id: string) => {};
  const onExportar = () => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alumnos.filter(
      (a) =>
        (!q || a.nombre.toLowerCase().includes(q) || a.matricula.toLowerCase().includes(q)) &&
        (!soloRiesgo || a.estado === "riesgo"),
    );
  }, [alumnos, busca, soloRiesgo]);

  if (vista === "expediente") {
    return <ExpedienteAlumno {...{ expediente, setVista, ecoAbierto, setEcoAbierto, onVerBitacora, onContactar, onVerHistorial, onPreguntarEco, onAbrirCORA }} />;
  }

  return <ListaAlumnos {...{ totales, detalleTotales, alumnos, soloRiesgo, setSoloRiesgo, busca, setBusca, onAbrirAlumno, onFiltrar, onPreguntarEco, onExportar, visibles }} />;
}
