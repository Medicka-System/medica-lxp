/**
 * Curso · layout — dentro de un curso el header del campus cambia el buscador por
 * MenuCurso y el lateral queda colapsado (76px). No monta un segundo shell: CursoShell
 * registra ese cambio en el CampusShell que ya envuelve el route group (§5A).
 */

import type { ReactNode } from 'react';
import { CursoShell } from '../../_shell/CursoShell';

export default async function CursoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CursoShell cursoId={id}>{children}</CursoShell>;
}
