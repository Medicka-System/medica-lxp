'use client';

/**
 * Consultas 1:1 del alumno (§5B · lado alumno) — bandeja + apertura de consulta nueva.
 * CRUD bajo RLS vía server actions (Regla de Oro §2). El otro lado (docente) ya existe
 * (Sprint 5.5). Vive dentro del shell del Campus.
 */
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, MessageCircle, Plus, Send } from 'lucide-react';
import { card, kicker, focusRing } from '@/components/tokens';
import { haceCuanto } from '@/lib/format';
import type { ConsultaResumen } from '@/lib/campus/consultas-datos';
import { crearConsulta } from '@/lib/campus/consultas-acciones';

function EstadoChip({ estado }: { estado: 'abierta' | 'cerrada' }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
        estado === 'abierta'
          ? 'bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {estado === 'abierta' ? 'Abierta' : 'Cerrada'}
    </span>
  );
}

export function ConsultasCliente({
  consultas,
}: {
  consultas: ConsultaResumen[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const enviar = () => {
    setError(null);
    startTransition(async () => {
      const res = await crearConsulta({ asunto, cuerpo });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAsunto('');
      setCuerpo('');
      setAbierto(false);
      if (res.consultaId) router.push(`/herramientas/consultas/${res.consultaId}`);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`${kicker} text-muted-foreground`}>Mis herramientas</p>
          <h1 className="mt-1 text-[22px] font-bold leading-tight">Consultas</h1>
          <p className="mt-1 max-w-[54ch] text-[13px] text-muted-foreground">
            Canal directo 1:1 con tu docente para dudas fuera de clase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-primary px-3.5 text-[13px] font-bold text-[color:var(--sidebar)] transition-opacity hover:opacity-90 ${focusRing}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.25} />
          Nueva consulta
        </button>
      </div>

      {abierto && (
        <div className={`${card} mt-5 p-4 sm:p-5`}>
          <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Asunto
          </label>
          <input
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            maxLength={200}
            placeholder="Ej. Duda sobre ventana subcostal"
            className={`mt-1.5 h-11 w-full rounded-[10px] border border-border bg-card px-3 text-[14px] outline-none focus:border-secondary ${focusRing}`}
          />
          <label className="mt-4 block text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Tu mensaje
          </label>
          <textarea
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            rows={4}
            placeholder="Describe tu duda con el detalle que puedas…"
            className={`mt-1.5 w-full resize-y rounded-[10px] border border-border bg-card px-3 py-2.5 text-[14px] outline-none focus:border-secondary ${focusRing}`}
          />
          {error && <p className="mt-2 text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className={`h-10 rounded-[10px] px-4 text-[13px] font-semibold text-muted-foreground hover:bg-accent ${focusRing}`}
            >
              Cancelar
            </button>
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
      )}

      {consultas.length === 0 ? (
        <div className={`${card} mt-6 grid place-items-center gap-3 px-6 py-16 text-center`}>
          <MessageCircle aria-hidden className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-[14px] font-semibold">Aún no tienes consultas</p>
          <p className="max-w-[42ch] text-[13px] text-muted-foreground">
            Abre una consulta cuando tengas una duda para tu docente.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {consultas.map((c) => (
            <li key={c.id}>
              <Link
                href={`/herramientas/consultas/${c.id}`}
                className={`${card} flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-accent ${focusRing}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[14px] font-bold">{c.asunto}</p>
                    <EstadoChip estado={c.estado} />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
                    {c.ultimo ?? 'Sin mensajes todavía.'}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {c.docente ? `Con ${c.docente} · ` : 'Sin docente asignado · '}
                    {c.mensajes} mensaje{c.mensajes === 1 ? '' : 's'} · {haceCuanto(new Date(c.actualizado))}
                  </p>
                </div>
                <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
