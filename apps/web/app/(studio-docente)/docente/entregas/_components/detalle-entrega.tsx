'use client';

/**
 * Detalle de una TAREA abierta (§5B) — fiel al mock. Muestra la respuesta del alumno y
 * la RÚBRICA del diseñador (reales), el pre-análisis de Eco (PLACEHOLDER) y la
 * calificación del docente, que se ASIENTA con `calificarEntrega` (0–10, RLS). Eco
 * propone; el docente decide — nada se asienta sin él (§7A).
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Clock, Minus, Plus, TriangleAlert } from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/lib/studio/estilos';
import { Avatar } from '@/components/avatar';
import type { ActividadRef, EntregaVista } from '../../../_lib/contrato';
import { calificarEntrega } from '../../../_lib/acciones';
import { TarjetaPreAnalisisEco, preAnalisisEjemplo } from './eco-placeholder';

export function DetalleEntrega({
  entrega,
  actividad,
  grupoNombre,
  posicion,
  porConfirmar,
  onVolver,
  onCalificada,
}: {
  entrega: EntregaVista;
  actividad: ActividadRef;
  grupoNombre: string;
  posicion: number;
  porConfirmar: number;
  onVolver: () => void;
  onCalificada: (id: string, nota: number) => void;
}) {
  const router = useRouter();
  const pre = preAnalisisEjemplo(entrega.rubrica);
  const [nota, setNota] = useState<number>(entrega.nota ?? 0);
  const [feedback, setFeedback] = useState('');
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, startTransition] = useTransition();

  const editarNota = (delta: number) => setNota((n) => Math.round(Math.max(0, Math.min(10, n + delta)) * 10) / 10);
  const respuesta = entrega.respuesta ?? [];
  const palabras = respuesta.join(' ').split(/\s+/).filter(Boolean).length;

  function confirmar() {
    const n = Math.round(nota * 10) / 10;
    if (Number.isNaN(n) || n < 0 || n > 10) {
      setResultado({ ok: false, texto: 'La nota debe ir de 0 a 10.' });
      return;
    }
    startTransition(async () => {
      // Eco no está conectado → ecoSugerida:false (la nota es del docente, no informada por Eco).
      const r = await calificarEntrega({ entregaId: entrega.id, nota: n, feedback, ecoSugerida: false });
      if (!r.ok) {
        setResultado({ ok: false, texto: r.error });
        return;
      }
      setResultado({ ok: true, texto: `Nota ${n.toFixed(1)} asentada y devuelta al alumno.` });
      onCalificada(entrega.id, n);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 pb-8 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ArrowLeft aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
          Volver a las entregas
        </button>
        <Avatar ini={entrega.alumno.ini} size={40} />
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight">{entrega.alumno.nombre}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {grupoNombre} · {actividad.clave} · Tarea abierta
          </p>
        </div>
        {porConfirmar > 0 && (
          <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
            {posicion} de {porConfirmar} por confirmar
          </span>
        )}
      </div>

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_392px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* consigna + respuesta del alumno (real) */}
          <section className={`${card} p-5`}>
            {actividad.consigna && (
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Consigna</p>
                <span className={`text-[12.5px] ${softText}`}>{actividad.consigna}</span>
              </div>
            )}
            <p className={`${kicker} mt-4 text-secondary`}>Respuesta del alumno</p>
            <div className="mt-2.5 max-h-[340px] overflow-y-auto pr-1.5">
              {respuesta.length > 0 ? (
                respuesta.map((p, i) => (
                  <p
                    key={i}
                    className={`text-[14px] leading-[1.75] ${softText} ${i ? 'mt-3.5' : ''}`}
                    style={{ textWrap: 'pretty' }}
                  >
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-[13px] italic leading-relaxed text-muted-foreground">
                  Sin texto capturado en la entrega (puede haberse entregado como archivo adjunto).
                </p>
              )}
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-border pt-3.5">
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {palabras} palabra{palabras === 1 ? '' : 's'}
              </span>
            </div>
          </section>

          {/* rúbrica del diseñador (real): contra esto se juzga */}
          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-4">
              <p className={`${kicker} text-muted-foreground`}>Rúbrica del diseñador</p>
              <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
                {entrega.rubrica?.length ?? 0} criterio{(entrega.rubrica?.length ?? 0) === 1 ? '' : 's'}
                {entrega.rubrica ? ' · 100%' : ''}
              </span>
            </div>
            {entrega.rubrica && entrega.rubrica.length > 0 ? (
              entrega.rubrica.map((c) => (
                <div key={c.id} className="flex items-start gap-3 border-t border-border px-3.5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold leading-snug">{c.texto}</span>
                    {c.descripcion && (
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                        {c.descripcion}
                      </span>
                    )}
                  </span>
                  <span className={`${mono} shrink-0 text-[11px] text-muted-foreground`}>{c.peso}%</span>
                </div>
              ))
            ) : (
              <p className="border-t border-border px-[18px] py-4 text-[12.5px] italic text-muted-foreground">
                La actividad no tiene rúbrica del catálogo asignada.
              </p>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-3.5">
          {/* pre-análisis de Eco (PLACEHOLDER) */}
          <TarjetaPreAnalisisEco pre={pre} />

          {/* la nota la pone el docente (real) */}
          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>Su calificación</p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => editarNota(-0.5)}
                aria-label="Bajar la nota"
                className={`grid h-11 w-10 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
              >
                <Minus aria-hidden className="h-4 w-4" strokeWidth={2.4} />
              </button>
              <input
                type="text"
                inputMode="decimal"
                value={nota.toFixed(1)}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(',', '.'));
                  if (!Number.isNaN(v)) setNota(Math.max(0, Math.min(10, v)));
                }}
                aria-label="Nota"
                className={`${mono} h-[52px] min-w-0 flex-1 rounded-[10px] border border-primary bg-card text-center text-[24px] font-extrabold text-foreground outline-none`}
              />
              <button
                type="button"
                onClick={() => editarNota(0.5)}
                aria-label="Subir la nota"
                className={`grid h-11 w-10 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
              >
                <Plus aria-hidden className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>

            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Comentario para el alumno (opcional)…"
              className="mt-3 w-full resize-none rounded-[11px] border border-border bg-muted px-3.5 py-3 text-[13px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary"
            />

            {resultado && (
              <div
                role="status"
                className={`mt-3 flex items-start gap-2.5 rounded-[11px] border px-3.5 py-3 text-[12.5px] font-medium ${
                  resultado.ok
                    ? 'border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
                    : 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                }`}
              >
                {resultado.ok ? (
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
                ) : (
                  <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                )}
                <span>{resultado.texto}</span>
              </div>
            )}

            <button
              type="button"
              onClick={confirmar}
              disabled={enviando}
              className={`mt-3.5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
            >
              {enviando ? (
                <Clock aria-hidden className="h-[17px] w-[17px] animate-spin" strokeWidth={2} />
              ) : (
                <Check aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.4} />
              )}
              {entrega.estado === 'calificada' ? 'Actualizar nota' : 'Confirmar y enviar al alumno'}
            </button>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
              Cambie la nota si su criterio difiere; el alumno recibe la nota y su comentario.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
