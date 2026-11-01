'use client';

/**
 * Editor de lección tipo `encuesta` (§5C). Constructor de preguntas que RECOGE respuestas
 * del alumno SIN calificar (distinto de autoevaluación). Toda la encuesta vive en
 * `lecciones.config` (CRUD directo web→Supabase bajo RLS · §2) vía `guardarConfigLeccion`,
 * con AUTOSAVE debounced (mismo patrón que autoevaluación). Reusa `ConstructorEncuesta`
 * (compartido con el bloque de teoría) y muestra los resultados agregados al staff.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { kicker, softText } from '@/lib/studio/estilos';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import { guardarConfigLeccion } from '@/lib/studio/acciones';
import { comoEncuestaConfig, type EncuestaConfig } from '@/lib/studio/encuesta-contrato';
import { ConstructorEncuesta } from './constructor-encuesta';
import { PanelResultadosEncuesta } from './panel-resultados-encuesta';

export function EditorEncuesta({ programaId, leccionId, config, correr }: EditorLeccionProps) {
  const [estado, setEstado] = useState<EncuestaConfig>(() => comoEncuestaConfig(config));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estadoRef = useRef(estado);
  const leccionRef = useRef(leccionId);

  // Reseed SOLO al cambiar de lección (mientras se edita, el estado local manda).
  useEffect(() => {
    if (leccionRef.current !== leccionId) {
      leccionRef.current = leccionId;
      const fresco = comoEncuestaConfig(config);
      estadoRef.current = fresco;
      setEstado(fresco);
    }
  }, [leccionId, config]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const persistir = useCallback(
    (siguiente: EncuestaConfig) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        correr(() => guardarConfigLeccion(programaId, leccionId, siguiente as unknown as Record<string, unknown>));
      }, 800);
    },
    [correr, programaId, leccionId],
  );

  function onCambio(siguiente: EncuestaConfig) {
    estadoRef.current = siguiente;
    setEstado(siguiente);
    persistir(siguiente);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-3.5">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-accent text-accent-foreground">
          <ClipboardList className="h-[21px] w-[21px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${kicker} text-muted-foreground`}>Lección tipo Encuesta</p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.01em]">Preguntas de la encuesta</h2>
          <p className={`mt-1 max-w-[56ch] text-[13px] leading-relaxed ${softText}`}>
            Recoge la opinión o el avance del alumno. La encuesta NO se califica: solo guarda las respuestas.
            Responder cuenta como completar el paso.
          </p>
        </div>
      </div>

      <ConstructorEncuesta config={estado} onCambio={onCambio} />

      <PanelResultadosEncuesta leccionId={leccionId} preguntas={estado.preguntas} />
    </div>
  );
}
