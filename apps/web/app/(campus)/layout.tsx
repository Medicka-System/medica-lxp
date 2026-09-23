import { getSesionAlumno } from '@/lib/session';
import { getShellData } from '@/lib/datos';
import { contarNoLeidas } from '@/lib/campus/notificaciones-datos';
import { contarConsultasNoLeidas } from '@/lib/campus/consultas-chat';
import { CampusShell } from '@/components/campus/shell';
import { ModoLecturaProvider } from '@/components/campus/modo-lectura';

/** Datos por usuario (RLS) → render dinámico, no estático. */
export const dynamic = 'force-dynamic';

/**
 * Layout del route group (campus): resuelve el alumno (sesión) y los datos del
 * shell, y envuelve cada pantalla con el shell persistente (§5B). El alumno vive
 * aquí; el Studio (staff) tendrá su propio route group.
 */
export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const alumno = await getSesionAlumno();
  const [shell, noLeidas, consultasNoLeidas] = await Promise.all([
    getShellData(alumno.userId),
    contarNoLeidas(alumno.userId),
    contarConsultasNoLeidas(alumno.userId),
  ]);

  return (
    <ModoLecturaProvider>
      <CampusShell
        usuario={{ nombre: alumno.nombre, matricula: alumno.matricula }}
        casosPendientes={shell.casosPendientes}
        noLeidas={noLeidas}
        consultasNoLeidas={consultasNoLeidas}
      >
        {children}
      </CampusShell>
    </ModoLecturaProvider>
  );
}
