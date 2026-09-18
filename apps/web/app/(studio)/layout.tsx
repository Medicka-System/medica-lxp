import { requireAutoria, etiquetaRol } from '@/lib/studio/session';
import { iniciales } from '@/components/avatar';
import { StudioShell } from './_components/studio-shell';

/** Datos por usuario (RLS + rol) → render dinámico, no estático. */
export const dynamic = 'force-dynamic';

/**
 * Layout del route group (studio): guard RBAC (§5B — solo autoría entra; un alumno
 * se va al Campus) + shell con header navy sin sidebar. El builder de un programa
 * y otros editores a pantalla completa viven FUERA de este layout (route group
 * propio) para ocultar la navegación general y dar todo el ancho al lienzo.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireAutoria();

  return (
    <StudioShell
      usuario={{
        nombre: staff.nombre,
        iniciales: iniciales(staff.nombre),
        rol: etiquetaRol(staff.rol),
      }}
      notificaciones={0}
    >
      {children}
    </StudioShell>
  );
}
