"use client";

/**
 * Studio · Staff (súper admin / admin) — vista global del personal
 *
 *   ListaStaff      → docentes, diseñadores y admins: rol, carga y estado
 *   DetalleMiembro  → permisos, grupos a cargo, desempeño y actividad
 *
 * Cambiar rol o desactivar a alguien queda en el log de auditoría. ÁMBAR para carga o cola
 * pendiente; VIOLETA es Eco.
 */

import { useMemo, useState } from "react";
import type { StaffData } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { ListaStaff } from "./_components/ListaStaff";
import { DetalleMiembro } from "./_components/DetalleMiembro";

export { EcoMark } from "./_components/ui";

export default function Staff({ data = MOCK }: { data?: StaffData }) {
  const { totales, detalleTotales, conteos, staff, detalle } = data;
  const [vista, setVista] = useState<"lista" | "detalle">("lista");
  const [filtroRol, setFiltroRol] = useState<"todos" | Rol>("todos");
  const [busca, setBusca] = useState("");
  const [ecoAbierto, setEcoAbierto] = useState(true);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirMiembro = (_id: string) => setVista("detalle");
  const onInvitar = () => {};
  const onCambiarRol = (_id: string) => {};
  const onActivar = (_id: string, _activo: boolean) => {};
  const onFiltrar = (_f: string) => {};
  const onPreguntarEco = (_q: string) => {};
  const onVerActividad = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return staff.filter((s) => {
      const porRol =
        filtroRol === "todos" ||
        (filtroRol === "admin" ? s.rol === "admin" || s.rol === "super" : s.rol === filtroRol);
      return porRol && (!q || s.nombre.toLowerCase().includes(q) || s.area.toLowerCase().includes(q));
    });
  }, [staff, filtroRol, busca]);

  if (vista === "detalle") {
    return <DetalleMiembro {...{ detalle, setVista, ecoAbierto, setEcoAbierto, onCambiarRol, onActivar, onPreguntarEco, onVerActividad }} />;
  }

  return <ListaStaff {...{ totales, detalleTotales, conteos, staff, vista, filtroRol, setFiltroRol, busca, setBusca, onAbrirMiembro, onInvitar, onFiltrar, onPreguntarEco, visibles }} />;
}
