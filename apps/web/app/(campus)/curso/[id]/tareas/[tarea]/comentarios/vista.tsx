'use client';

/**
 * Tareas › COMENTARIOS — feedback del docente + rúbrica de la tarea.
 * Datos reales: nota + feedback de `lxp.entregas`; rúbrica del catálogo (`lxp.rubricas`,
 * criterios `{criterio, descripcion, peso}`). El modelo NO guarda el "nivel obtenido" por
 * criterio (no hay grid de 4 niveles con selección), así que se muestran los criterios de
 * evaluación tal como existen. Sin read-receipt → no se marca "leído".
 */

import { Check, Download, Printer, Table2 } from 'lucide-react';
import { Avatar, BotonSec, CabeceraPagina, Chip, card, kicker, mono, softText, th } from '../../../_components/curso';

export type CriterioVista = { criterio: string; descripcion: string | null; peso: number | null };

export function ComentariosVista({
  cursoId,
  titulo,
  contexto,
  nota,
  valor,
  feedback,
  rubricaNombre,
  criterios,
}: {
  cursoId: string;
  titulo: string;
  contexto: string;
  nota: number | null;
  valor: number;
  feedback: string | null;
  rubricaNombre: string | null;
  criterios: CriterioVista[];
}) {
  const pct = nota !== null && valor > 0 ? Math.round((nota / valor) * 100) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-10 pt-7">
      <CabeceraPagina
        titulo={`Comentarios · ${titulo}`}
        contexto={contexto}
        sub="Retroalimentación del docente y la rúbrica con la que se evaluó la tarea."
        migas={[{ etiqueta: 'Tareas', href: `/curso/${cursoId}/tareas` }, { etiqueta: 'Comentarios' }]}
        acciones={
          <>
            <BotonSec icono={<Printer aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />} onClick={() => window.print()}>
              Imprimir
            </BotonSec>
            <BotonSec icono={<Download aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />}>Descargar</BotonSec>
          </>
        }
      />

      <section className={`${card} grid items-center gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)]`}>
        <div className="border-border md:border-r md:pr-6">
          <p className={kicker}>Puntuación</p>
          {nota !== null ? (
            <>
              <p className="mt-2 flex items-baseline gap-2">
                <span className={`${mono} text-[38px] font-extrabold leading-none tracking-[-0.03em] text-secondary`}>{nota}</span>
                <span className={`${mono} text-[16px] font-semibold text-muted-foreground`}>/ {valor}</span>
              </p>
              {pct !== null && (
                <p className="mt-2">
                  <Chip tono="ok" icono={<Check className="h-[11px] w-[11px]" strokeWidth={2.2} />}>
                    {pct}% · acreditada
                  </Chip>
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">Aún sin calificar.</p>
          )}
        </div>
        <div className="flex gap-3.5">
          <Avatar ini="DC" size={40} staff />
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="text-[13.5px] font-bold">Docente del curso</span>
              <Chip tono="navy">Docente</Chip>
            </p>
            <p className={`mt-2 max-w-[72ch] text-[13.5px] leading-relaxed ${softText}`}>
              {feedback ?? 'El docente aún no dejó comentarios para esta entrega.'}
            </p>
          </div>
        </div>
      </section>

      {criterios.length > 0 && (
        <section className={`${card} overflow-hidden`}>
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
            <Table2 aria-hidden className="h-4 w-4 text-secondary" strokeWidth={1.75} />
            <p className="text-[13.5px] font-bold">Rúbrica{rubricaNombre ? ` · ${rubricaNombre}` : ''}</p>
            <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
              {criterios.length} {criterios.length === 1 ? 'criterio' : 'criterios'}
            </span>
          </div>
          <div role="table" aria-label="Rúbrica de la tarea">
            <div role="row" className="grid grid-cols-[minmax(0,1fr)_96px] border-b border-border bg-muted">
              <span role="columnheader" className={`px-4 py-[11px] ${th}`}>Criterio</span>
              <span role="columnheader" className={`border-l border-border px-4 py-[11px] text-right ${th}`}>Peso</span>
            </div>
            {criterios.map((c, i) => (
              <div key={`${c.criterio}-${i}`} role="row" className={`grid grid-cols-[minmax(0,1fr)_96px] ${i ? 'border-t border-border' : ''}`}>
                <span role="cell" className="px-4 py-3.5">
                  <span className="block text-[12.5px] font-semibold leading-snug">{c.criterio}</span>
                  {c.descripcion && <span className={`mt-1 block text-[12px] leading-snug ${softText}`}>{c.descripcion}</span>}
                </span>
                <span role="cell" className={`${mono} border-l border-border px-4 py-3.5 text-right text-[13px] font-bold`}>
                  {c.peso !== null ? `${c.peso}%` : '—'}
                </span>
              </div>
            ))}
          </div>
          <p className="border-t border-border bg-muted px-4 py-2.5 text-[11.5px] text-muted-foreground">
            El desglose por nivel obtenido en cada criterio no se registra en el modelo actual.
          </p>
        </section>
      )}
    </div>
  );
}
