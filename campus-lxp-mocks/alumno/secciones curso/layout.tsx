/**
 * Curso · layout — dentro de un curso el header del campus cambia el buscador por MenuCurso,
 * y el sidebar queda colapsado (76px). El shell expone un slot `centro` en su header para esto.
 *
 * Integración con app/(campus)/layout.tsx: el Shell debe aceptar `headerCentro?: ReactNode` y,
 * si viene, renderizarlo en lugar del <label> de búsqueda (mismo hueco, margin:0 auto).
 */

import type { ReactNode } from "react";
import { MenuCurso } from "./_components/MenuCurso";
import { CursoShell } from "../../_shell/CursoShell"; // envoltorio del Shell del campus con sidebar colapsado

export default function CursoLayout({ children, params }: { children: ReactNode; params: { id: string } }) {
  return (
    <CursoShell sidebarColapsado headerCentro={<MenuCurso cursoId={params.id} />}>
      {children}
    </CursoShell>
  );
}
