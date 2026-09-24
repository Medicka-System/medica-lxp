import { requireDocente } from '@/app/(studio-docente)/_lib/session';

/** Datos por usuario (RLS + rol) → render dinámico. */
export const dynamic = 'force-dynamic';

/**
 * Route group de editores a PANTALLA COMPLETA del docente (§5B) — igual que
 * (studio-editor) para el diseñador: NO monta el ShellDocente (header nav), porque el
 * editor de caso trae su propio header contextual (breadcrumb + Guardar/Publicar) y
 * ocupa toda la pantalla. Solo aplica el guard RBAC del docente. Reusa componentes
 * existentes (EditorCaso) — no reconstruye.
 */
export default async function DocenteEditorLayout({ children }: { children: React.ReactNode }) {
  await requireDocente();
  return <>{children}</>;
}
