import LoginAlumno from './_login-alumno';

export const dynamic = 'force-dynamic';

const AVISOS: Record<string, string> = {
  'sin-perfil': 'Su cuenta no tiene acceso al Campus. Contacte a Médica Capacitación.',
};

/**
 * Página de login del Campus (fuera del route group (campus): sin shell). Email +
 * contraseña contra el auth.users compartido con CORA. El "sin acceso" por pago
 * (acceso_activo) se maneja ya dentro del campus (pantalla amable con link a CORA).
 * La UI es el mock aprobado (Spec A), cableada a Supabase Auth en el cliente.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const aviso = e ? (AVISOS[e] ?? null) : null;

  return <LoginAlumno aviso={aviso} />;
}
