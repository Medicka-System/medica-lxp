'use client';

/**
 * Mis recursos — almacén personal del DOCENTE (§5B). Enlaces, notas y materiales que
 * el docente guarda para sí (no es la Biblioteca curada ni el Contenido del diseñador).
 * CRUD directo `web → Supabase` bajo RLS (`recursos_docente_write` · id = uid).
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Link2, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/lib/studio/estilos';
import { fechaCorta } from '@/lib/format';
import type { RecursoDocente } from '../../../_lib/contrato';
import { agregarRecurso, eliminarRecurso } from '../../../_lib/acciones';

export function RecursosPanel({ recursos }: { recursos: RecursoDocente[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('');
  const [ref, setRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, startGuardar] = useTransition();
  const [borrando, startBorrar] = useTransition();

  function guardar() {
    if (!titulo.trim()) {
      setError('Ponle un título al recurso.');
      return;
    }
    startGuardar(async () => {
      const r = await agregarRecurso({ titulo, tipo, ref });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setTitulo('');
      setTipo('');
      setRef('');
      router.refresh();
    });
  }

  function borrar(id: string) {
    startBorrar(async () => {
      await eliminarRecurso(id);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-8 pb-10 pt-7">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Mis recursos</h1>
        <p className={`mt-1 text-[13px] ${softText}`}>
          Su almacén personal: enlaces, notas y materiales para dar clase. Solo usted los ve.
        </p>
      </div>

      {/* Alta */}
      <section className={`${card} mt-6 p-[18px]`}>
        <p className={`${kicker} text-muted-foreground`}>Agregar recurso</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-[1.4fr_0.8fr]">
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título (ej. Guía de hidronefrosis)"
            className="h-11 rounded-[10px] border border-border bg-muted px-3.5 text-[13px] text-foreground outline-none transition-colors focus:border-secondary"
          />
          <input
            type="text"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Tipo (enlace, PDF, nota…)"
            className="h-11 rounded-[10px] border border-border bg-muted px-3.5 text-[13px] text-foreground outline-none transition-colors focus:border-secondary"
          />
        </div>
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Enlace o referencia (opcional)"
          className="mt-2.5 h-11 w-full rounded-[10px] border border-border bg-muted px-3.5 text-[13px] text-foreground outline-none transition-colors focus:border-secondary"
        />
        {error && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-[color:var(--warning-foreground)]">
            <TriangleAlert aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            {error}
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            Guardar recurso
          </button>
        </div>
      </section>

      {/* Lista */}
      <section className="mt-6">
        <div className="flex items-center gap-2.5">
          <h2 className={`${kicker} text-muted-foreground`}>Guardados</h2>
          <span className={`${mono} text-[11.5px] text-muted-foreground`}>{recursos.length}</span>
        </div>
        {recursos.length === 0 ? (
          <div className={`${card} mt-3 px-6 py-10 text-center`}>
            <FolderOpen aria-hidden className="mx-auto h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            <p className={`mt-3 text-[13px] ${softText}`}>Aún no ha guardado recursos.</p>
          </div>
        ) : (
          <ul className={`${card} mt-3 overflow-hidden`}>
            {recursos.map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-t border-border px-[18px] py-3.5 first:border-t-0">
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
                  <Link2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{r.titulo}</span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                    {[r.tipo, r.ref].filter(Boolean).join(' · ') || 'Sin detalle'}
                  </span>
                </span>
                <span className={`${mono} shrink-0 text-[11px] text-muted-foreground`}>{fechaCorta(r.creadoEn)}</span>
                <button
                  type="button"
                  onClick={() => borrar(r.id)}
                  disabled={borrando}
                  aria-label={`Eliminar ${r.titulo}`}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 ${focusRing}`}
                >
                  <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
