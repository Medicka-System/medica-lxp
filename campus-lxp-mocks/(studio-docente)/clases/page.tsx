"use client";

/**
 * Studio · Clases (docente) — sus sesiones en vivo
 *
 *   ClaseHoy          → la sesión de hoy con su botón de inicio (única urgencia)
 *   ProximasClases    → agenda de las siguientes
 *   Grabaciones       → clases pasadas con grabación, asistencia y liga a la lección
 *   RailClases        → Eco ligero + su mes
 *   DialogoProgramar  → formulario para agendar
 *
 * El video corre fuera: Zoom (se inicia desde aquí) o el equipo Mindray vía MiCo+ (se lanza /
 * enlaza desde aquí). La grabación de Zoom cae sola en la plataforma, ligada al grupo y la lección.
 * Solo ve las clases de SUS grupos. Un solo color de atención: ÁMBAR para la clase de hoy.
 */

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { ClasesData, TipoSesion } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { softText, focusRing } from "./_components/ui";
import { ClaseHoy } from "./_components/ClaseHoy";
import { ProximasClases } from "./_components/ProximasClases";
import { Grabaciones } from "./_components/Grabaciones";
import { RailClases } from "./_components/RailClases";
import { DialogoProgramar } from "./_components/DialogoProgramar";

export { EcoMark } from "./_components/ui";

export default function Clases({ data = MOCK }: { data?: ClasesData }) {
  const { clases, grabaciones, gruposFiltro, resumenMes, eco, totalGrabaciones } = data;
  const [filtroGrupo, setFiltroGrupo] = useState(gruposFiltro[0]);
  const [programando, setProgramando] = useState(false);
  const [tipoNueva, setTipoNueva] = useState<TipoSesion>("zoom");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onIniciarClase = (_id: string) => {};
  const onAbrirMiCo = (_id: string) => {};
  const onProgramarClase = () => setProgramando(false);
  const onVerGrabacion = (_id: string) => {};
  const onPreguntarEco = (_q: string) => {};
  const onVerAsistencia = (_id: string) => {};
  const onLigarLeccion = (_id: string) => {};
  const onEditarClase = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const hoy = clases.find((c) => c.hoy);
  const proximas = clases.filter((c) => !c.hoy);
  const visibles = useMemo(
    () =>
      filtroGrupo === gruposFiltro[0]
        ? grabaciones
        : grabaciones.filter((g) => g.grupo.includes(filtroGrupo.replace("POCUS", "POCUS"))),
    [grabaciones, filtroGrupo, gruposFiltro],
  );

  return (
    <div className="mx-auto w-full max-w-[1360px] px-6 pb-7 pt-5">
      {/* cabecera */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Clases</h1>
          <p className={`mt-1 text-[12.5px] ${softText}`}>
            Sus sesiones en vivo. El video corre en Zoom o en el equipo Mindray; aquí las programa,
            las inicia y recupera la grabación.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setProgramando(true)}
          className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Programar clase
        </button>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {hoy && <ClaseHoy {...{ onIniciarClase, onAbrirMiCo, onEditarClase, hoy }} />}
          <ProximasClases {...{ clases, onAbrirMiCo, onEditarClase, proximas }} />
          <Grabaciones {...{ grabaciones, gruposFiltro, totalGrabaciones, filtroGrupo, setFiltroGrupo, onVerGrabacion, onVerAsistencia, onLigarLeccion, visibles }} />
        </div>
        <RailClases {...{ clases, resumenMes, eco, setProgramando, onPreguntarEco }} />
      </div>

      {programando && <DialogoProgramar {...{ setProgramando, tipoNueva, setTipoNueva, onProgramarClase }} />}
    </div>
  );
}
