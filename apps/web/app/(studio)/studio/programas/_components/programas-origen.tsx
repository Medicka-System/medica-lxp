'use client';

/**
 * Studio · Programas — conmutador de ORIGEN (§5B · PUENTE 1).
 *
 * Dos orígenes separados, sin mezclar:
 *   • CORA  → espejo read-only de TODOS los programas de CORA (con sus grupos a la vista).
 *             El diseñador construye contenido sobre ellos (shell provisionado al abrir).
 *   • LXP   → programas NATIVOS creados a mano en el LXP (sin vínculo con CORA).
 * Default: CORA (lo habitual: construir sobre lo que ya existe en CORA).
 */

import { useState } from 'react';
import { mono, focusRing } from '@/lib/studio/estilos';
import type { ProgramaResumen, ProgramaCoraResumen } from '@/lib/studio/datos';
import { ProgramasTabla } from './programas-tabla';
import { ProgramasCora } from './programas-cora';

export function ProgramasOrigen({
  nativos,
  cora,
}: {
  nativos: ProgramaResumen[];
  cora: ProgramaCoraResumen[];
}) {
  const [origen, setOrigen] = useState<'cora' | 'lxp'>('cora');
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-10 pt-7">
      <div>
        <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Programas</h1>
        <div className="mt-3 flex gap-1 self-start rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ['cora', 'CORA', cora.length],
              ['lxp', 'LXP (nativos)', nativos.length],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setOrigen(id)}
              aria-pressed={origen === id}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                origen === id
                  ? 'bg-sidebar text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {label}
              <span className={`${mono} font-bold ${origen === id ? 'text-white/70' : 'text-muted-foreground'}`}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {origen === 'cora' ? <ProgramasCora programas={cora} /> : <ProgramasTabla programas={nativos} />}
    </div>
  );
}
