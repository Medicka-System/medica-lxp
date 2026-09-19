'use client';

/**
 * Hilo de una consulta 1:1 (§5B · lado alumno). Muestra los mensajes (alumno a la
 * derecha, docente a la izquierda) y el compositor de respuesta. Responder avisa al
 * docente asignado (motor §8). CRUD bajo RLS vía server action (Regla de Oro §2).
 */
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronLeft, Send } from 'lucide-react';
import { Avatar, iniciales } from '@/components/avatar';
import { card, focusRing } from '@/components/tokens';
import { haceCuanto } from '@/lib/format';
import type { ConsultaDetalleAlumno } from '@/lib/campus/consultas-datos';
import { responderConsulta } from '@/lib/campus/consultas-acciones';

export function HiloConsulta({
  consulta,
}: {
  consulta: ConsultaDetalleAlumno;
}) {
  const [cuerpo, setCuerpo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const enviar = () => {
    setError(null);
    startTransition(async () => {
      const res = await responderConsulta({ consultaId: consulta.id, cuerpo });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCuerpo('');
    });
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-6">
      <Link
        href="/herramientas/consultas"
        className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-secondary hover:text-sidebar ${focusRing}`}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
        Volver a consultas
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <h1 className="min-w-0 flex-1 text-[20px] font-bold leading-tight">{consulta.asunto}</h1>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
            consulta.estado === 'abierta'
              ? 'bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {consulta.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        {consulta.docente ? `Con ${consulta.docente}` : 'Aún sin docente asignado'}
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {consulta.mensajes.map((m) => {
          const propio = m.autor === 'alumno';
          return (
            <li key={m.id} className={`flex gap-3 ${propio ? 'flex-row-reverse' : ''}`}>
              <Avatar ini={iniciales(m.autorNombre)} />
              <div className={`min-w-0 max-w-[80%] ${propio ? 'text-right' : ''}`}>
                <div
                  className={`inline-block rounded-2xl px-3.5 py-2.5 text-left text-[13.5px] leading-relaxed ${
                    propio
                      ? 'bg-secondary text-white'
                      : `${card} text-foreground`
                  }`}
                >
                  {m.cuerpo}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {m.autorNombre} · {haceCuanto(new Date(m.creadoEn))}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {consulta.estado === 'abierta' ? (
        <div className={`${card} mt-6 p-3.5`}>
          <textarea
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            rows={3}
            placeholder="Escribe tu respuesta…"
            className={`w-full resize-y rounded-[10px] border border-border bg-card px-3 py-2.5 text-[14px] outline-none focus:border-secondary ${focusRing}`}
          />
          {error && <p className="mt-2 text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">{error}</p>}
          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              disabled={pendiente}
              onClick={enviar}
              className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-opacity hover:opacity-90 disabled:opacity-50 ${focusRing}`}
            >
              <Send aria-hidden className="h-[16px] w-[16px]" strokeWidth={2} />
              {pendiente ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-[10px] border border-border bg-muted px-4 py-3 text-center text-[13px] text-muted-foreground">
          Esta consulta está cerrada.
        </p>
      )}
    </div>
  );
}
