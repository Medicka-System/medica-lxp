'use client';

/**
 * Studio · Selector "Programa CORA vinculado" (PUENTE 1 · §1).
 *
 * El diseñador liga UNA VEZ este programa de contenido a su programa de CORA
 * (`public.bc_programas`). De ahí, todo grupo que CORA abra sobre ese programa se
 * refleja solo en el LXP y "Mis Cursos" del alumno lo muestra con su contenido.
 *
 * Carga el catálogo de CORA de forma perezosa (como ModalHistorial), igual que el
 * resto del builder. Guarda al elegir (server action bajo RLS · es_autoria). Control
 * mínimo: no rediseña el aside, solo añade la tarjeta de vínculo.
 */

import { useEffect, useState, useTransition } from 'react';
import { Link2, Check, AlertTriangle } from 'lucide-react';
import { kicker, softText } from '@/lib/studio/estilos';
import { Select } from '@/components/ui/select';
import {
  catalogoProgramasCora,
  vincularProgramaCora,
  type ProgramaCoraCatalogo,
} from '@/lib/studio/acciones';

export function VinculoCora({
  programaId,
  coraProgramaId,
  coraProgramaSlug,
}: {
  programaId: string;
  coraProgramaId: string | null;
  coraProgramaSlug: string | null;
}) {
  const [catalogo, setCatalogo] = useState<ProgramaCoraCatalogo[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [valor, setValor] = useState(coraProgramaId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => setValor(coraProgramaId ?? ''), [coraProgramaId]);

  useEffect(() => {
    let vivo = true;
    catalogoProgramasCora()
      .then((c) => vivo && setCatalogo(c))
      .catch(() => vivo && setErrorCarga(true));
    return () => {
      vivo = false;
    };
  }, []);

  function elegir(nuevo: string) {
    const previo = valor;
    setValor(nuevo);
    setError(null);
    setGuardado(false);
    iniciar(async () => {
      const r = await vincularProgramaCora(programaId, nuevo || null);
      if (r.ok) setGuardado(true);
      else {
        setError(r.error);
        setValor(previo); // revierte el control si el guardado falló
      }
    });
  }

  const opciones = [
    { value: '', label: 'Sin vincular' },
    ...(catalogo ?? []).map((c) => ({ value: c.id, label: c.nombre })),
  ];
  const vinculado = Boolean(coraProgramaId);

  return (
    <div className="mt-6">
      <p className={`${kicker} text-muted-foreground`}>Programa CORA vinculado</p>
      <p className={`mt-1.5 text-[12px] leading-relaxed ${softText}`}>
        Liga este programa a su programa de CORA una vez. Los grupos que CORA abra sobre él
        se reflejan solos aquí.
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-border bg-card px-3">
        <Link2 aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <div className="min-w-0 flex-1 py-1.5">
          {errorCarga ? (
            <p className="py-1.5 text-[12.5px] text-destructive">No se pudo cargar el catálogo de CORA.</p>
          ) : (
            <Select
              aria-label="Programa CORA vinculado"
              value={valor}
              onChange={elegir}
              disabled={catalogo === null || pendiente}
              placeholder={catalogo === null ? 'Cargando…' : 'Sin vincular'}
              options={opciones}
              className="flex w-full items-center gap-2 bg-transparent text-[13px] font-medium text-foreground outline-none"
            />
          )}
        </div>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11.5px]">
        {error ? (
          <span className="flex items-center gap-1.5 text-destructive">
            <AlertTriangle aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {error}
          </span>
        ) : pendiente ? (
          <span className={softText}>Guardando…</span>
        ) : vinculado ? (
          <span className="flex items-center gap-1.5 text-secondary">
            <Check aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
            Vinculado{coraProgramaSlug ? ` · ${coraProgramaSlug}` : ''}
          </span>
        ) : guardado ? (
          <span className={softText}>Desvinculado.</span>
        ) : (
          <span className={softText}>Sin vincular: sus grupos quedan como “contenido pendiente”.</span>
        )}
      </p>
    </div>
  );
}
