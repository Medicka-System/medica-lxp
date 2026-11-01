'use client';

/**
 * Encuesta del ALUMNO (§5C · B3). Renderiza las preguntas, recoge las respuestas y las
 * GUARDA (acción `responderEncuesta`, bajo RLS). SIN nota: muestra una confirmación, no
 * un resultado. Sirve igual para la lección tipo `encuesta` y para el bloque de teoría
 * (según `bloqueId`). Al montar, prellena con la respuesta previa del alumno si existe.
 */

import { useEffect, useState, useTransition } from 'react';
import { CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';
import { card, focusRing, softText } from '@/components/tokens';
import type { PreguntaEncuesta } from '@/lib/studio/encuesta-contrato';
import { getMiRespuestaEncuesta, responderEncuesta } from '@/lib/campus/encuesta-acciones';

type Valor = string | string[] | number | undefined;

export function EncuestaLector({
  leccionId,
  bloqueId = null,
  tituloLeccion = '',
  descripcion,
  preguntas,
}: {
  leccionId: string;
  bloqueId?: string | null;
  tituloLeccion?: string;
  descripcion?: string;
  preguntas: PreguntaEncuesta[];
}) {
  const [resp, setResp] = useState<Record<string, Valor>>({});
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, iniciar] = useTransition();

  // Prellena con la respuesta previa (si el alumno ya respondió).
  useEffect(() => {
    let vivo = true;
    getMiRespuestaEncuesta(leccionId, bloqueId).then((prev) => {
      if (vivo && prev && typeof prev === 'object') {
        setResp(prev as Record<string, Valor>);
        setEnviada(true);
      }
    });
    return () => {
      vivo = false;
    };
  }, [leccionId, bloqueId]);

  function set(id: string, v: Valor) {
    setResp((prev) => ({ ...prev, [id]: v }));
    setEnviada(false);
    setError(null);
  }
  function toggleMulti(id: string, clave: string) {
    setResp((prev) => {
      const actual = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const next = actual.includes(clave) ? actual.filter((c) => c !== clave) : [...actual, clave];
      return { ...prev, [id]: next };
    });
    setEnviada(false);
    setError(null);
  }

  function respondida(p: PreguntaEncuesta): boolean {
    const v = resp[p.id];
    if (p.tipo === 'multiple') return Array.isArray(v) && v.length > 0;
    if (p.tipo === 'texto') return typeof v === 'string' && v.trim().length > 0;
    return v !== undefined && v !== '' && v !== null;
  }

  function enviar() {
    setError(null);
    const falta = preguntas.find((p) => p.obligatoria && !respondida(p));
    if (falta) {
      setError('Responde las preguntas obligatorias antes de enviar.');
      return;
    }
    iniciar(async () => {
      const r = await responderEncuesta({
        leccionId,
        bloqueId,
        respuestas: resp as Record<string, unknown>,
        tituloLeccion,
      });
      if (!r.ok) setError(r.error);
      else setEnviada(true);
    });
  }

  if (preguntas.length === 0) {
    return (
      <p className={`rounded-xl border border-dashed border-border px-5 py-8 text-center text-[13.5px] ${softText}`}>
        Esta encuesta aún no tiene preguntas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {descripcion && <p className={`text-[14px] leading-relaxed ${softText}`}>{descripcion}</p>}

      {preguntas.map((p, i) => (
        <section key={p.id} className={`${card} p-4`}>
          <p className="text-[14px] font-semibold leading-snug">
            <span className="text-muted-foreground">{i + 1}. </span>
            {p.enunciado || <span className="italic text-muted-foreground">(sin enunciado)</span>}
            {p.obligatoria && <span className="ml-1 text-destructive" aria-label="obligatoria">*</span>}
          </p>

          {p.tipo === 'opcion_unica' && (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {p.opciones.map((o) => (
                <label key={o.clave} className={`flex cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-2 text-[13.5px] transition-colors ${resp[p.id] === o.clave ? 'border-primary bg-accent' : 'border-border hover:bg-muted'}`}>
                  <input type="radio" name={`q_${p.id}`} checked={resp[p.id] === o.clave} onChange={() => set(p.id, o.clave)} className="h-4 w-4 accent-[color:var(--primary)]" />
                  {o.texto || o.clave.toUpperCase()}
                </label>
              ))}
            </div>
          )}

          {p.tipo === 'multiple' && (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {p.opciones.map((o) => {
                const marcada = Array.isArray(resp[p.id]) && (resp[p.id] as string[]).includes(o.clave);
                return (
                  <label key={o.clave} className={`flex cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-2 text-[13.5px] transition-colors ${marcada ? 'border-primary bg-accent' : 'border-border hover:bg-muted'}`}>
                    <input type="checkbox" checked={marcada} onChange={() => toggleMulti(p.id, o.clave)} className="h-4 w-4 accent-[color:var(--primary)]" />
                    {o.texto || o.clave.toUpperCase()}
                  </label>
                );
              })}
            </div>
          )}

          {p.tipo === 'escala' && (
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: p.escalaMax ?? 5 }, (_, k) => k + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set(p.id, n)}
                    aria-pressed={resp[p.id] === n}
                    className={`grid h-10 w-10 place-items-center rounded-full border text-[14px] font-bold transition-colors ${resp[p.id] === n ? 'border-primary bg-primary text-[color:var(--primary-foreground)]' : 'border-border bg-card text-foreground hover:border-primary'} ${focusRing}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {(p.escalaMinEtiqueta || p.escalaMaxEtiqueta) && (
                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                  <span>{p.escalaMinEtiqueta ?? ''}</span>
                  <span>{p.escalaMaxEtiqueta ?? ''}</span>
                </div>
              )}
            </div>
          )}

          {p.tipo === 'texto' && (
            <textarea
              value={typeof resp[p.id] === 'string' ? (resp[p.id] as string) : ''}
              onChange={(e) => set(p.id, e.target.value)}
              rows={3}
              placeholder="Tu respuesta…"
              className={`mt-2.5 w-full resize-y rounded-[9px] border border-border bg-muted px-3 py-2 text-[13.5px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          )}
        </section>
      ))}

      {error && (
        <p className="rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2 text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={enviar}
          disabled={pending}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <ClipboardList aria-hidden className="h-4 w-4" strokeWidth={2} />}
          {enviada ? 'Actualizar mi respuesta' : 'Enviar'}
        </button>
        {enviada && !pending && (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-secondary">
            <CheckCircle2 aria-hidden className="h-4 w-4" strokeWidth={2} />
            ¡Gracias! Tu respuesta quedó guardada.
          </span>
        )}
      </div>
    </div>
  );
}
