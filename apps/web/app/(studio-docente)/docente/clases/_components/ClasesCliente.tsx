'use client';

/**
 * Orquestador cliente de Clases del docente. Mantiene el estado (filtro, diálogo, tipo)
 * y cablea los handlers a las server actions (§9 · reusa el backend Sprint 6):
 *  · Iniciar clase / Abrir sesión → lanza Zoom (start_url) o el deep-link de MiCo+.
 *  · Programar → crea la clase (api · Zoom stub / MiCo+ enlace).
 *  · Ver grabación → firma la URL de reproducción (media).
 *  · Ligar → mete la grabación en la videoteca de la lección (la del alumno).
 *
 * Eco (rail) es PLACEHOLDER (§7A): sus botones solo dejan un aviso; sin conexión.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Plus, X } from 'lucide-react';
import type { ClasesData, TipoSesion } from './tipos';
import { focusRing } from './ui';
import { ClaseHoy } from './ClaseHoy';
import { ProximasClases } from './ProximasClases';
import { Grabaciones } from './Grabaciones';
import { RailClases } from './RailClases';
import { DialogoProgramar } from './DialogoProgramar';
import { iniciarClase, ligarGrabacion, programarClase, verGrabacion } from '../_lib/acciones';

export function ClasesCliente({ data }: { data: ClasesData }) {
  const router = useRouter();
  const { clases, grabaciones, gruposFiltro, resumenMes, eco, totalGrabaciones, mesActual } = data;

  const [filtroGrupo, setFiltroGrupo] = useState(gruposFiltro[0] ?? 'Todas');
  const [programando, setProgramando] = useState(false);
  const [tipoNueva, setTipoNueva] = useState<TipoSesion>('zoom');
  const [aviso, setAviso] = useState<string | null>(null);

  const hoy = clases.find((c) => c.hoy);
  const proximas = clases.filter((c) => !c.hoy);
  const visibles = useMemo(
    () => (filtroGrupo === gruposFiltro[0] ? grabaciones : grabaciones.filter((g) => g.grupo === filtroGrupo)),
    [grabaciones, filtroGrupo, gruposFiltro],
  );

  const abrir = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const onIniciarClase = async (id: string) => {
    setAviso(null);
    const res = await iniciarClase(id);
    if (res.ok) abrir(res.enlaceInicio);
    else setAviso(res.error);
  };
  const onAbrirMiCo = (id: string) => {
    const clase = clases.find((c) => c.id === id);
    if (clase?.enlace) abrir(clase.enlace);
    else setAviso('Esta sesión de MiCo+ aún no tiene enlace registrado.');
  };
  const onVerGrabacion = async (id: string) => {
    setAviso(null);
    const res = await verGrabacion(id);
    if (res.ok) abrir(res.url);
    else setAviso(res.error);
  };
  const onLigar = async (grabacionId: string, leccionId: string) => {
    setAviso(null);
    const res = await ligarGrabacion({ grabacionId, leccionId });
    if (res.ok) {
      setAviso('Grabación ligada: ya está en la videoteca de la lección del grupo.');
      router.refresh();
    } else {
      setAviso(res.error);
    }
  };
  const onProgramar = async (input: Parameters<typeof programarClase>[0]) => {
    const res = await programarClase(input);
    if (res.ok) {
      setAviso('Clase programada. Se avisará a los alumnos del grupo.');
      router.refresh();
    }
    return res;
  };
  // Placeholders (sin backend): dejan un aviso claro, no fingen éxito.
  const onEditarClase = () =>
    setAviso('Editar una clase agendada se conecta con el backend (pendiente · Sprint 6).');
  const onVerAsistencia = () =>
    setAviso('La lista de asistencia llega del reporte de participantes de Zoom (pendiente · §9).');
  const onPreguntarEco = () => setAviso('Eco se conecta al final; aquí es solo el espacio donde vivirá.');

  return (
    <div className="mx-auto w-full max-w-[1360px] px-6 pb-7 pt-5">
      {/* cabecera */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Clases</h1>
          <p className="mt-1 text-[12.5px] text-[color:var(--foreground-soft)]">
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

      {/* aviso transitorio (acciones placeholder / resultados) */}
      {aviso && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">{aviso}</p>
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Cerrar aviso"
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] text-[color:var(--info-foreground)] transition-colors hover:bg-white/50 ${focusRing}`}
          >
            <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {hoy && <ClaseHoy {...{ onIniciarClase, onAbrirMiCo, onEditarClase, hoy }} />}
          <ProximasClases {...{ onAbrirMiCo, onEditarClase, proximas }} />
          <Grabaciones
            {...{
              gruposFiltro,
              totalGrabaciones,
              filtroGrupo,
              setFiltroGrupo,
              onVerGrabacion,
              onVerAsistencia,
              onLigar,
              leccionesPorGrupo: data.leccionesPorGrupo,
              visibles,
            }}
          />
        </div>
        <RailClases {...{ resumenMes, eco, mesActual, setProgramando, onPreguntarEco }} />
      </div>

      {programando && (
        <DialogoProgramar
          {...{
            setProgramando,
            tipoNueva,
            setTipoNueva,
            gruposDocente: data.gruposDocente,
            leccionesPorGrupo: data.leccionesPorGrupo,
            onProgramar,
          }}
        />
      )}
    </div>
  );
}
