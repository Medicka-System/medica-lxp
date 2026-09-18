import { getSesionAlumno } from '@/lib/session';
import { getShellData } from '@/lib/datos';
import { CampusShell } from '@/components/campus/shell';

/** Datos por usuario (RLS) → render dinámico, no estático. */
export const dynamic = 'force-dynamic';

/**
 * Layout del route group (campus): resuelve el alumno (sesión) y los datos del
 * shell, y envuelve cada pantalla con el shell persistente (§5B). El alumno vive
 * aquí; el Studio (staff) tendrá su propio route group.
 */
export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const alumno = await getSesionAlumno();
  const shell = await getShellData(alumno.userId);

  return (
    <CampusShell
      usuario={{ nombre: alumno.nombre, matricula: alumno.matricula }}
      casosPendientes={shell.casosPendientes}
    >
      {children}
    </CampusShell>
  );
}
