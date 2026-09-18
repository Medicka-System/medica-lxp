import { requireAutoria } from '@/lib/studio/session';

/** Datos por usuario (RLS + rol) → render dinámico. */
export const dynamic = 'force-dynamic';

/**
 * Route group de editores a pantalla completa del Studio (§5B). A diferencia de
 * (studio), este layout NO monta el header de navegación general: el builder del
 * programa (y otros editores) traen su propio header contextual — breadcrumb +
 * Guardar/Publicar — para dar todo el ancho al lienzo. Solo aplica el guard RBAC.
 */
export default async function StudioEditorLayout({ children }: { children: React.ReactNode }) {
  await requireAutoria();
  return <>{children}</>;
}
