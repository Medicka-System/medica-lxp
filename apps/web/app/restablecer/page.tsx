import RestablecerAlumno from './_restablecer-alumno';

export const dynamic = 'force-dynamic';

/**
 * /restablecer — destino del enlace de recuperación del ALUMNO (redirectTo de
 * `resetPasswordForEmail`). Fuera del route group (campus): sin shell. La sesión de
 * recovery la trae el enlace; la UI (Spec A) y el `updateUser` viven en el cliente.
 */
export default function RestablecerPage() {
  return <RestablecerAlumno />;
}
