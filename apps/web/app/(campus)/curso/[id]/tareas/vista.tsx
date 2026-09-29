'use client';

/**
 * Curso · TAREAS — lista de las tareas del programa con la entrega del alumno.
 * Columnas: Tarea · Estado de entrega · Puntuación · Evaluación. Datos reales (RLS):
 * lección tipo `tarea` + `entregas` del alumno (estado, nota, feedback). Las fechas de
 * entrega y el read-receipt de comentarios NO existen en el modelo → estado honesto.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, History } from 'lucide-react';
import type { Tarea } from '../_components/curso';
import { BotonSec, CabeceraPagina, Chip, Segmentado, card, focusRing, mono, softText, th } from '../_components/curso';

const COLS = 'grid grid-cols-[minmax(0,1.6fr)_210px_150px_200px]';

export function TareasVista({ cursoId, contexto, tareas }: { cursoId: string; contexto: string; tareas: Tarea[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'entregadas'>('todas');
  const base = `/curso/${cursoId}/tareas`;

  const visibles = useMemo(
    () => tareas.filter((t) => (filtro === 'todas' ? true : filtro === 'pendientes' ? t.estado === 'pendiente' : t.estado === 'enviada')),
    [tareas, filtro],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina
        titulo="Tareas"
        contexto={contexto}
        sub="Todas las entregas del programa, con lo que ya le calificaron."
        acciones={
          <BotonSec icono={<History aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />} onClick={() => router.push(`${base}/historial`)}>
            Historial de envíos
          </BotonSec>
        }
      />

      <Segmentado
        valor={filtro}
        onCambio={setFiltro}
        opciones={[
          { id: 'todas', etiqueta: 'Todas', n: tareas.length },
          { id: 'pendientes', etiqueta: 'Pendientes', n: tareas.filter((t) => t.estado === 'pendiente').length },
          { id: 'entregadas', etiqueta: 'Entregadas', n: tareas.filter((t) => t.estado === 'enviada').length },
        ]}
      />

      {tareas.length === 0 ? (
        <div className={`${card} px-6 py-14 text-center text-[13px] text-muted-foreground`}>Este programa aún no tiene tareas.</div>
      ) : (
        <section className={`${card} overflow-hidden`}>
          <div className={`${COLS} border-b border-border bg-muted`}>
            {['Tarea', 'Estado de entrega', 'Puntuación', 'Evaluación'].map((t, i) => (
              <span key={t} className={`px-[18px] py-[11px] ${th} ${i ? 'border-l border-border' : ''}`}>
                {t}
              </span>
            ))}
          </div>

          {visibles.map((t, i) => {
            const pendiente = t.estado === 'pendiente';
            const pct = t.puntos !== undefined ? Math.round((t.puntos / t.puntosMax) * 100) : null;
            return (
              <div key={t.id} className={`${COLS} ${i ? 'border-t border-border' : ''}`}>
                <div className="min-w-0 px-[18px] py-4">
                  <p className="text-[13.5px] font-bold">{t.clave}</p>
                  <p className={`mt-0.5 text-[12.5px] ${softText}`}>{t.descripcion}</p>
                  <p className="mt-2 text-[11.5px] text-muted-foreground">Sin fecha de entrega definida</p>
                </div>

                <div className="border-l border-border px-[18px] py-4">
                  {t.estado === 'enviada' && (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push(`${base}/historial?tarea=${t.id}`)}
                        className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-secondary ${focusRing}`}
                      >
                        <FileText aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                        {t.envios} envío · {t.archivos} {t.archivos === 1 ? 'archivo' : 'archivos'}
                      </button>
                      <p className={`${mono} mt-1 text-[11px] text-muted-foreground`}>ver historial</p>
                    </>
                  )}
                  {pendiente && (
                    <>
                      <Chip tono="neutro">Pendiente</Chip>
                      <p className="mt-1.5 text-[11.5px] text-muted-foreground">no enviada</p>
                    </>
                  )}
                  {t.estado === 'no-disponible' && <span className="text-[12.5px] text-muted-foreground">Aún no disponible</span>}
                </div>

                <div className="border-l border-border px-[18px] py-4">
                  <p className={`${mono} text-[13.5px] font-bold ${pct === null ? 'text-muted-foreground' : ''}`}>
                    {t.puntos ?? '—'} / {t.puntosMax}
                  </p>
                  {pct !== null && <p className={`${mono} mt-1 text-[11.5px] text-secondary`}>{pct}%</p>}
                </div>

                <div className="border-l border-border px-[18px] py-4">
                  {t.comentarios === 'leidos' ? (
                    <>
                      <button type="button" onClick={() => router.push(`${base}/${t.id}/comentarios`)} className={`text-[12.5px] font-semibold ${softText} ${focusRing}`}>
                        Ver comentarios
                      </button>
                      <p className="mt-1 text-[11px] text-muted-foreground">del docente</p>
                    </>
                  ) : (
                    <span className="text-[12.5px] text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
