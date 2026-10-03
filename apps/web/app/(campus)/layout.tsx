import { getSesionAlumno } from '@/lib/session';
import { getShellData } from '@/lib/datos';
import { contarNoLeidas } from '@/lib/campus/notificaciones-datos';
import { contarConsultasNoLeidas } from '@/lib/campus/consultas-chat';
import { getLecturaPref } from '@/lib/campus/perfil-datos';
import { CampusShell } from '@/components/campus/shell';
import { ModoLecturaProvider } from '@/components/campus/modo-lectura';
import { SinAcceso } from '@/components/campus/sin-acceso';

/** Datos por usuario (RLS) → render dinámico, no estático. */
export const dynamic = 'force-dynamic';

/**
 * Layout del route group (campus): resuelve el alumno (sesión) y los datos del
 * shell, y envuelve cada pantalla con el shell persistente (§5B). El alumno vive
 * aquí; el Studio (staff) tendrá su propio route group.
 */
export default async function CampusLayout({ children }: { children: React.ReactNode }) {
  const alumno = await getSesionAlumno();
  // Gating de acceso (§1/§10): sin inscripción/pago vigente en CORA → pantalla amable,
  // no una app rota. RLS ya bloquea los datos; esto es la UX del bloqueo.
  if (!alumno.accesoActivo) return <SinAcceso nombre={alumno.nombre} />;

  const [shell, noLeidas, consultasNoLeidas, lectura] = await Promise.all([
    getShellData(alumno.userId),
    contarNoLeidas(alumno.userId),
    contarConsultasNoLeidas(alumno.userId),
    getLecturaPref(alumno.userId),
  ]);

  return (
    <ModoLecturaProvider
      temaInicial={lectura.tema}
      fsInicial={lectura.tamano}
      reducirInicial={lectura.reducirAnimaciones}
    >
      <CampusShell
        usuario={{ nombre: alumno.nombre, matricula: alumno.matricula, avatarUrl: shell.avatarUrl }}
        userId={alumno.userId}
        casosPendientes={shell.casosPendientes}
        noLeidas={noLeidas}
        consultasNoLeidas={consultasNoLeidas}
      >
        {children}
      </CampusShell>
    </ModoLecturaProvider>
  );
}
