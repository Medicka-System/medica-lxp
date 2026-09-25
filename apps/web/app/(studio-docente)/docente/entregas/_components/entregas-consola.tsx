'use client';

/**
 * Consola de ENTREGAS del docente (§5B) — orquestador fiel al mock aprobado. Mantiene
 * la selección (grupo × actividad va por URL, ?grupo=&actividad=; la entrega abierta es
 * estado local) y decide qué vista mostrar:
 *   · Tarea abierta + entrega abierta → DetalleEntrega (calificar · real).
 *   · Actividad de autoevaluación      → AuditoriaAutoevaluacion (se califica sola).
 *   · Resto                            → VistaActividad (bandeja de tareas).
 *
 * Todo lo real (bandeja, rúbrica, roster, asentar nota) es web→Supabase con RLS
 * (Regla de Oro §2). Eco es PLACEHOLDER, sin conectar (§7A · se enchufa al final).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import { softText } from '@/lib/studio/estilos';
import type { EntregasVista, EntregaVista } from '../../../_lib/contrato';
import { Selector } from './ui';
import { VistaActividad } from './vista-actividad';
import { DetalleEntrega } from './detalle-entrega';
import { AuditoriaAutoevaluacion } from './auditoria-autoevaluacion';

export function EntregasConsola({ data }: { data: EntregasVista }) {
  const router = useRouter();
  const { grupo, grupos, actividad, actividades } = data;
  const [abierta, setAbierta] = useState<string | null>(null);
  const [lista, setLista] = useState<EntregaVista[]>(data.entregas);

  // Al recargar datos del servidor (cambió grupo/actividad, o refresh tras calificar),
  // re-sincroniza la lista local y cierra el detalle si la entrega ya no existe.
  useEffect(() => {
    setLista(data.entregas);
    setAbierta((prev) => (prev && data.entregas.some((e) => e.id === prev) ? prev : null));
  }, [data.entregas]);

  const irAGrupo = (id: string) => {
    setAbierta(null);
    router.push(`/docente/entregas?grupo=${id}`);
  };
  const irAActividad = (id: string) => {
    setAbierta(null);
    router.push(`/docente/entregas?grupo=${grupo?.id ?? ''}&actividad=${id}`);
  };

  // Barra de selectores compartida (siempre disponible para navegar grupo/actividad).
  const barra = actividad ? (
    <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-2.5 px-6 pt-5">
      <Selector
        rotulo="Grupo"
        valor={grupo?.nombre ?? '—'}
        opciones={grupos.map((g) => ({ id: g.id, etiqueta: g.nombre }))}
        onSelect={irAGrupo}
      />
      <Selector
        rotulo="Actividad"
        valor={`${actividad.clave} · ${actividad.titulo}`}
        opciones={actividades.map((a) => ({ id: a.id, etiqueta: `${a.clave} · ${a.titulo}` }))}
        onSelect={irAActividad}
      />
    </div>
  ) : null;

  // Sin grupos o sin actividades → estado vacío honesto.
  if (!grupo || !actividad) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-8 text-center">
        <div>
          <span
            aria-hidden
            className="inline-grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-accent-foreground"
          >
            <ClipboardCheck className="h-[26px] w-[26px]" strokeWidth={2} />
          </span>
          <h2 className="mt-3.5 text-[18px] font-extrabold tracking-[-0.015em]">
            {grupos.length === 0 ? 'No tienes grupos asignados' : 'Este grupo no tiene actividades'}
          </h2>
          <p className={`mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed ${softText}`}>
            {grupos.length === 0
              ? 'Cuando se te asigne un grupo, sus tareas y autoevaluaciones aparecerán aquí para calificar.'
              : 'Cuando el diseñador publique tareas o autoevaluaciones en el programa, aparecerán aquí.'}
          </p>
        </div>
      </div>
    );
  }

  // Detalle de una tarea abierta (calificar).
  const entrega = abierta ? lista.find((e) => e.id === abierta) : null;
  if (entrega && actividad.tipo === 'abierta') {
    const porCalificar = lista.filter((e) => e.estado === 'requiere-lectura');
    const idx = porCalificar.findIndex((e) => e.id === entrega.id);
    return (
      <DetalleEntrega
        entrega={entrega}
        actividad={actividad}
        grupoNombre={grupo.nombre}
        posicion={idx >= 0 ? idx + 1 : 1}
        porConfirmar={porCalificar.length}
        onVolver={() => setAbierta(null)}
        onCalificada={(id, nota) =>
          setLista((prev) => prev.map((e) => (e.id === id ? { ...e, estado: 'calificada', nota } : e)))
        }
      />
    );
  }

  // Autoevaluación → auditoría (se califica sola; el docente solo observa).
  if (actividad.tipo === 'autoevaluacion' && data.auditoria) {
    return (
      <>
        {barra}
        <AuditoriaAutoevaluacion actividad={actividad} auditoria={data.auditoria} grupoNombre={grupo.nombre} />
      </>
    );
  }

  // Bandeja de tareas.
  return (
    <VistaActividad
      data={{ ...data, entregas: lista }}
      actividad={actividad}
      onElegirGrupo={irAGrupo}
      onElegirActividad={irAActividad}
      onAbrir={(id) => setAbierta(id)}
    />
  );
}
