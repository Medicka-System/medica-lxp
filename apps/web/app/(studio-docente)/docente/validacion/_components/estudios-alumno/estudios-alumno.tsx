"use client";

/**
 * Studio docente · Validación · ESTUDIOS DEL ALUMNO
 *
 * Se muestra en el área principal de Validación cuando el docente elige un alumno en la bandeja
 * de la izquierda (la bandeja se reutiliza; el alumno queda resaltado). Compone:
 *
 *   CabeceraAlumno  → identidad, dos accesos y cuatro cifras
 *   FiltrosEstudios → Todos · Por validar · Aprobados · Devueltos + orden
 *   CardEstudio × N → rejilla de 3 columnas, imagen limpia como protagonista
 *   ResumenEstudios → una línea de cierre / VacioEstudios si no hay nada
 *
 * Datos: el alumno y sus estudios llegan por props (cargados con RLS por el contenedor). Abrir un
 * estudio lleva al detalle de validación existente con ese caso cargado (solo lectura si ya no está
 * pendiente).
 *
 * ECO = PLACEHOLDER. El chip "Eco: listo/criterio" de los pendientes se alimenta de un STUB del
 * cliente (`ecoPlaceholder`) — Eco NO está conectado a esta rejilla en esta fase. El día que se
 * conecte, la sugerencia vendrá del pipeline (`lxp.eco_propuestas` · §7A) por el data layer.
 */

import { useMemo, useState } from "react";
import { CabeceraAlumno } from "./CabeceraAlumno";
import { FiltrosEstudios } from "./FiltrosEstudios";
import { CardEstudio } from "./CardEstudio";
import { ResumenEstudios, VacioEstudios } from "./ResumenEstudios";
import type { EstudioAlumno, FiltroEstudios, OrdenEstudios, ResumenAlumno, SugerenciaEco } from "./tipos";

export type EstudiosAlumnoProps = {
  alumno: ResumenAlumno;
  estudios: EstudioAlumno[];
  onAbrirEstudio: (id: string) => void;
  onEnviarConsulta: (alumnoId: string) => void;
  onVerBitacora: (alumnoId: string) => void;
};

const PESO: Record<EstudioAlumno["estado"], number> = { pendiente: 0, devuelto: 1, aprobado: 2 };

/**
 * STUB de Eco (PLACEHOLDER, determinista por id — no aleatorio para no saltar entre renders).
 * Representa cómo se verá la sugerencia cuando Eco viva aquí. NO consulta nada real.
 */
function ecoPlaceholder(id: string): SugerenciaEco {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const confianza = 60 + (h % 40); // 60–99
  return { veredicto: confianza >= 82 ? "confirmar" : "criterio", confianza };
}

export function EstudiosAlumno({ alumno, estudios, onAbrirEstudio, onEnviarConsulta, onVerBitacora }: EstudiosAlumnoProps) {
  const [filtro, setFiltro] = useState<FiltroEstudios>("todos");
  const [orden, setOrden] = useState<OrdenEstudios>("pendientes-primero");

  // Adjunta el stub de Eco SOLO a los pendientes (el hueco donde vivirá la sugerencia real).
  const conEco = useMemo(
    () => estudios.map((e) => (e.estado === "pendiente" ? { ...e, eco: e.eco ?? ecoPlaceholder(e.id) } : e)),
    [estudios],
  );

  const visibles = useMemo(() => {
    const lista = filtro === "todos" ? [...conEco] : conEco.filter((e) => e.estado === filtro);
    const t = (e: EstudioAlumno) => new Date(e.fechaEnvio).getTime();
    return lista.sort((a, b) => {
      if (orden === "recientes") return t(b) - t(a);
      if (orden === "antiguos") return t(a) - t(b);
      // pendientes primero; dentro de pendientes, el que más lleva esperando va arriba
      return PESO[a.estado] - PESO[b.estado] || (b.horasEsperando ?? 0) - (a.horasEsperando ?? 0) || t(b) - t(a);
    });
  }, [conEco, filtro, orden]);

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-background">
      <CabeceraAlumno
        alumno={alumno}
        estudios={estudios}
        onConsulta={() => onEnviarConsulta(alumno.id)}
        onBitacora={() => onVerBitacora(alumno.id)}
      />

      {/* Zona de contenido: grid RESPONSIVO que llena todo el ancho del panel. `auto-fill` con
          minmax(250px, 1fr) acomoda cuantas columnas de ≥250px quepan (ancho → 5-6; medio → 3-4;
          angosto → 2/1), sin hueco a la derecha. gap 16 · alturas iguales por fila (§ card de estudio). */}
      <div className="px-7 pb-7 pt-5">
        <FiltrosEstudios estudios={estudios} filtro={filtro} orden={orden} onFiltro={setFiltro} onOrden={setOrden} />

        {visibles.length ? (
          <ul
            className="mt-4 grid list-none gap-4 p-0"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}
          >
            {visibles.map((e) => (
              <li key={e.id} className="flex">
                <div className="flex w-full">
                  <CardEstudio estudio={e} onAbrir={onAbrirEstudio} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <VacioEstudios filtrado={estudios.length > 0} onLimpiar={() => setFiltro("todos")} />
        )}

        <ResumenEstudios estudios={estudios} />
      </div>
    </div>
  );
}
