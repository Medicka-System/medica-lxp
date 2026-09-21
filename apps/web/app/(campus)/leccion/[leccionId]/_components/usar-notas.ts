'use client';

/**
 * Estado + acciones de las NOTAS del alumno de una lección (§5A · mig 0027). Lifta la
 * lista para que la compartan el panel (rail) y el contenido (subrayado/selección).
 * CRUD optimista sobre las server actions (web→Supabase bajo RLS · §2).
 */

import { useCallback, useState } from 'react';
import { crearNota, editarNota, borrarNota } from '@/lib/campus/notas-acciones';
import type { AnclaNota, Nota, NotaTipo } from '@/lib/campus/notas-contrato';

export function useNotas(leccionId: string, moduloId: string | null, iniciales: Nota[]) {
  const [notas, setNotas] = useState<Nota[]>(iniciales);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (tipo: NotaTipo, contenido: string, ancla?: AnclaNota): Promise<Nota | null> => {
      setError(null);
      const r = await crearNota({ leccionId, moduloId, tipo, contenido, ancla });
      if (r.ok) {
        setNotas((prev) => [...prev, r.nota]);
        return r.nota;
      }
      setError(r.error);
      return null;
    },
    [leccionId, moduloId],
  );

  const editar = useCallback(async (id: string, contenido: string): Promise<boolean> => {
    setError(null);
    const r = await editarNota(id, contenido);
    if (r.ok) setNotas((prev) => prev.map((n) => (n.id === id ? { ...n, contenido } : n)));
    else setError(r.error);
    return r.ok;
  }, []);

  const borrar = useCallback(async (id: string): Promise<void> => {
    setError(null);
    let respaldo: Nota[] = [];
    setNotas((prev) => {
      respaldo = prev;
      return prev.filter((n) => n.id !== id);
    });
    const r = await borrarNota(id);
    if (!r.ok) {
      setNotas(respaldo);
      setError(r.error);
    }
  }, []);

  return { notas, error, crear, editar, borrar };
}
