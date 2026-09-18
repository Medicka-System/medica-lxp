import { requireDocente } from './_lib/session';
import { getCabecera } from './_lib/datos';
import { ShellDocente } from './_components/shell-docente';

/** Datos por usuario (RLS + rol) → render dinámico, no estático. */
export const dynamic = 'force-dynamic';

/**
 * Layout de la consola del DOCENTE (§5B): guard RBAC (`requireDocente` — solo el rol
 * `docente` entra; el resto se va a su lugar) + shell con header navy sin sidebar. El
 * badge de Validación (casos en cola) llega calculado por RLS, no es mock. Las
 * notificaciones son 0 hasta el motor de notificaciones (Sprint 8.5).
 */
export default async function DocenteLayout({ children }: { children: React.ReactNode }) {
  const docente = await requireDocente();
  const cabecera = await getCabecera(docente.userId);

  const nombre = cabecera.nombre;
  const ini =
    nombre
      .trim()
      .split(/\s+/)
      .filter((p) => !/^(dr|dra|dr\.|dra\.)$/i.test(p))
      .slice(0, 2)
      .map((p) => p[0] ?? '')
      .join('')
      .toUpperCase() || nombre.slice(0, 2).toUpperCase();

  return (
    <ShellDocente
      usuario={{ nombre, iniciales: ini }}
      casosEnCola={cabecera.casosEnCola}
      notificaciones={0}
    >
      {children}
    </ShellDocente>
  );
}
