'use client';

/**
 * CursoShell — envoltorio del interior del curso. NO monta un segundo shell (el
 * `CampusShell` de (campus)/layout ya envuelve todo); en su lugar REGISTRA, vía el
 * contexto `CursoShellContext`, el contenido central del header (MenuCurso, en lugar
 * del buscador) y pide colapsar el lateral. Al desmontar (salir del curso), restaura
 * el buscador y el lateral. Mismo patrón que "modo lectura" (§5A): una ruta hija
 * cambia el shell padre por contexto, sin anidarlo.
 */

import { useContext, useEffect, type ReactNode } from 'react';
import { CursoShellContext } from '@/components/campus/shell';
import { MenuCurso } from '../curso/[id]/_components/MenuCurso';

export function CursoShell({ cursoId, children }: { cursoId: string; children: ReactNode }) {
  const ctx = useContext(CursoShellContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setHeaderCentro(<MenuCurso cursoId={cursoId} />);
    ctx.setColapsadoCurso(true);
    return () => {
      ctx.setHeaderCentro(null);
      ctx.setColapsadoCurso(false);
    };
  }, [ctx, cursoId]);

  return <>{children}</>;
}
