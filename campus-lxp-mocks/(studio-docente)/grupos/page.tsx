"use client";

/**
 * Studio · Grupos (docente) — seguimiento de sus alumnos
 *
 *   ListaGrupos  → sus grupos con avance y quién requiere atención
 *   DetalleGrupo → alumnos del grupo con señales de riesgo y acciones
 *   PanelEco     → riel / panel de Eco
 *
 * No configura el grupo (eso es del diseñador). Lo administrativo vive en CORA (solo deep-link).
 * Un solo color de atención: ÁMBAR para riesgo. El VIOLETA es Eco.
 */

import { useMemo, useState } from "react";
import type { GruposData } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { ListaGrupos } from "./_components/ListaGrupos";
import { DetalleGrupo } from "./_components/DetalleGrupo";
import { PanelEco } from "./_components/PanelEco";

export default function Grupos({ data = MOCK }: { data?: GruposData }) {
  const { grupos, detalle, eco } = data;
  const [vista, setVista] = useState<"lista" | "detalle">("lista");
  const [filtroGrupos, setFiltroGrupos] = useState<"todos" | "riesgo" | "al-dia">("todos");
  const [filtroAlumnos, setFiltroAlumnos] = useState<"atencion" | "todos" | "sin-actividad" | "al-dia">(
    "atencion",
  );
  const [busca, setBusca] = useState("");
  const [ecoAbierto, setEcoAbierto] = useState(false);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirGrupo = (_id: string) => setVista("detalle");
  const onAbrirAlumno = (_id: string) => {};
  const onEnviarConsulta = (_ids: string[]) => {};
  const onVerBitacora = (_id: string) => {};
  const onVerCasos = (_id: string) => {};
  const onPreguntarEco = (_q: string) => setEcoAbierto(true);
  const onFiltrar = (_f: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const grupoAbierto = grupos.find((g) => g.id === detalle.grupoId) ?? grupos[0];
  const totalAlumnos = grupos.reduce((s, g) => s + g.alumnos, 0);
  const totalRiesgo = grupos.reduce((s, g) => s + g.enRiesgo, 0);

  const gruposVisibles = useMemo(
    () =>
      grupos.filter((g) =>
        filtroGrupos === "riesgo" ? g.enRiesgo > 0 : filtroGrupos === "al-dia" ? g.enRiesgo === 0 : true,
      ),
    [grupos, filtroGrupos],
  );

  const alumnosVisibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return detalle.alumnos
      .filter((a) => {
        if (filtroAlumnos === "atencion") return !!a.senal;
        if (filtroAlumnos === "sin-actividad") return !!a.sinActividad;
        if (filtroAlumnos === "al-dia") return !a.senal;
        return true;
      })
      .filter((a) => !q || a.nombre.toLowerCase().includes(q));
  }, [detalle.alumnos, filtroAlumnos, busca]);

  /* ─────────── Eco: panel o riel ─────────── */

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-6 pt-5">
      {vista === "lista" ? (
        <ListaGrupos {...{ grupos, eco, filtroGrupos, setFiltroGrupos, onAbrirGrupo, onFiltrar, grupoAbierto, totalAlumnos, totalRiesgo, gruposVisibles }} />
      ) : (
        <DetalleGrupo {...{ detalle, setVista, filtroAlumnos, setFiltroAlumnos, busca, setBusca, onAbrirAlumno, onEnviarConsulta, onVerBitacora, onVerCasos, onFiltrar, grupoAbierto, alumnosVisibles }} />
      )}
      <PanelEco {...{ eco, ecoAbierto, setEcoAbierto, onEnviarConsulta, onPreguntarEco }} />
    </div>
  );
}
