'use client';

/**
 * Panel de RESULTADOS de una encuesta para el staff (§5C · B4). Carga los mapas de
 * respuesta (acción `resultadosEncuesta`, bajo RLS de staff) y los TABULA contra las
 * preguntas: conteo por opción, distribución + promedio de escala, y la lista de textos.
 * Solo recoge y muestra — sin calificación.
 */

import { useState, useTransition } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { softText, focusRing, mono } from '@/lib/studio/estilos';
import { resultadosEncuesta } from '@/lib/studio/encuesta-resultados-acciones';
import type { PreguntaEncuesta } from '@/lib/studio/encuesta-contrato';

function comoLista(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (v === null || v === undefined || v === '') return [];
  return [String(v)];
}

export function PanelResultadosEncuesta({
  leccionId,
  bloqueId = null,
  preguntas,
}: {
  leccionId: string;
  bloqueId?: string | null;
  preguntas: PreguntaEncuesta[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [total, setTotal] = useState(0);
  const [mapas, setMapas] = useState<Record<string, unknown>[]>([]);
  const [cargado, setCargado] = useState(false);
  const [pending, iniciar] = useTransition();

  function cargar() {
    setAbierto(true);
    iniciar(async () => {
      const r = await resultadosEncuesta(leccionId, bloqueId);
      setTotal(r.total);
      setMapas(r.mapas);
      setCargado(true);
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <BarChart3 aria-hidden className="h-4 w-4 text-secondary" strokeWidth={1.75} />
        <h3 className="text-[13.5px] font-bold">Respuestas recibidas</h3>
        {cargado && <span className={`${mono} text-[11.5px] text-muted-foreground`}>{total} respuesta(s)</span>}
        <button
          type="button"
          onClick={cargar}
          disabled={pending}
          className={`ml-auto inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
        >
          {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <BarChart3 aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
          {abierto ? 'Actualizar' : 'Ver respuestas'}
        </button>
      </div>

      {cargado && (
        total === 0 ? (
          <p className={`mt-3 text-[12.5px] ${softText}`}>Aún no hay respuestas.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {preguntas.map((p, i) => (
              <ResultadoPregunta key={p.id} pregunta={p} indice={i} total={total} mapas={mapas} />
            ))}
          </div>
        )
      )}
    </section>
  );
}

function ResultadoPregunta({
  pregunta: p,
  indice,
  total,
  mapas,
}: {
  pregunta: PreguntaEncuesta;
  indice: number;
  total: number;
  mapas: Record<string, unknown>[];
}) {
  const valores = mapas.map((m) => m[p.id]);

  return (
    <div className="border-t border-border pt-3">
      <p className="text-[13px] font-semibold">
        <span className="text-muted-foreground">{indice + 1}. </span>
        {p.enunciado || <span className="italic text-muted-foreground">(sin enunciado)</span>}
      </p>

      {(p.tipo === 'opcion_unica' || p.tipo === 'multiple') && (
        <div className="mt-2 flex flex-col gap-1.5">
          {p.opciones.map((o) => {
            const n = valores.reduce<number>((s, v) => s + (comoLista(v).includes(o.clave) ? 1 : 0), 0);
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <div key={o.clave}>
                <div className="flex items-baseline gap-2 text-[12px]">
                  <span className="min-w-0 flex-1 truncate">{o.texto || o.clave.toUpperCase()}</span>
                  <span className={`${mono} shrink-0 font-bold`}>{n}</span>
                  <span className={`${mono} w-10 shrink-0 text-right text-muted-foreground`}>{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {p.tipo === 'escala' && (() => {
        const nums = valores.map((v) => Number(v)).filter((n) => Number.isFinite(n));
        const prom = nums.length ? (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1) : '—';
        const max = p.escalaMax ?? 5;
        return (
          <div className="mt-2">
            <p className={`text-[12px] ${softText}`}>Promedio <span className={`${mono} font-bold text-foreground`}>{prom}</span> / {max} · {nums.length} respuesta(s)</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Array.from({ length: max }, (_, k) => k + 1).map((n) => {
                const c = nums.filter((x) => Math.round(x) === n).length;
                return (
                  <span key={n} className={`inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] ${mono}`}>
                    {n}: <span className="font-bold">{c}</span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}

      {p.tipo === 'texto' && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {valores.map((v) => String(v ?? '').trim()).filter(Boolean).map((t, k) => (
            <li key={k} className={`rounded-[8px] border border-border bg-muted px-2.5 py-1.5 text-[12px] ${softText}`}>{t}</li>
          ))}
          {valores.every((v) => !String(v ?? '').trim()) && <li className={`text-[12px] ${softText}`}>Sin respuestas de texto.</li>}
        </ul>
      )}
    </div>
  );
}
