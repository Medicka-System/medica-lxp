"use client";

/**
 * Studio docente · Validación · ESTUDIOS DEL ALUMNO
 *
 * Se muestra en el área principal de Validación cuando el docente elige un alumno en la bandeja
 * de la izquierda (la bandeja NO se toca: se reutiliza tal cual, con el alumno resaltado).
 *
 *   CabeceraAlumno  → identidad, dos accesos y cuatro cifras
 *   FiltrosEstudios → Todos · Por validar · Aprobados · Devueltos + orden
 *   CardEstudio × N → rejilla de 3 columnas, imagen limpia como protagonista
 *   ResumenEstudios → una línea de cierre / VacioEstudios si no hay nada
 *
 * Datos: el alumno y sus estudios llegan por props desde la BD. Abrir un estudio lleva al detalle
 * de validación existente (24a) con ese caso cargado.
 */

import { useMemo, useState } from "react";
import { CabeceraAlumno } from "./_components/CabeceraAlumno";
import { FiltrosEstudios } from "./_components/FiltrosEstudios";
import { CardEstudio } from "./_components/CardEstudio";
import { ResumenEstudios, VacioEstudios } from "./_components/ResumenEstudios";
import type { EstudioAlumno, FiltroEstudios, OrdenEstudios, ResumenAlumno } from "./_components/tipos";

export type EstudiosAlumnoProps = {
  alumno: ResumenAlumno;
  estudios: EstudioAlumno[];
  onAbrirEstudio: (id: string) => void;
  onEnviarConsulta: (alumnoId: string) => void;
  onVerBitacora: (alumnoId: string) => void;
};

const PESO: Record<EstudioAlumno["estado"], number> = { pendiente: 0, devuelto: 1, aprobado: 2 };

export default function EstudiosAlumno({ alumno, estudios, onAbrirEstudio, onEnviarConsulta, onVerBitacora }: EstudiosAlumnoProps) {
  const [filtro, setFiltro] = useState<FiltroEstudios>("todos");
  const [orden, setOrden] = useState<OrdenEstudios>("pendientes-primero");

  const visibles = useMemo(() => {
    const lista = filtro === "todos" ? [...estudios] : estudios.filter((e) => e.estado === filtro);
    const t = (e: EstudioAlumno) => new Date(e.fechaEnvio).getTime();
    return lista.sort((a, b) => {
      if (orden === "recientes") return t(b) - t(a);
      if (orden === "antiguos") return t(a) - t(b);
      // pendientes primero; dentro de pendientes, el que más lleva esperando va arriba
      return PESO[a.estado] - PESO[b.estado] || (b.horasEsperando ?? 0) - (a.horasEsperando ?? 0) || t(b) - t(a);
    });
  }, [estudios, filtro, orden]);

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-background">
      <CabeceraAlumno
        alumno={alumno}
        estudios={estudios}
        onConsulta={() => onEnviarConsulta(alumno.id)}
        onBitacora={() => onVerBitacora(alumno.id)}
      />

      <div className="px-7 pb-7 pt-5">
        <FiltrosEstudios estudios={estudios} filtro={filtro} orden={orden} onFiltro={setFiltro} onOrden={setOrden} />

        {visibles.length ? (
          <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
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
