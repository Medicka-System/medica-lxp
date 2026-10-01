import { LoginForm } from './_form';

export const dynamic = 'force-dynamic';

const AVISOS: Record<string, string> = {
  'sin-perfil': 'Tu cuenta no tiene acceso al Campus. Contacta a Médica Capacitación.',
};

/**
 * Página de login del Campus (fuera del route group (campus): sin shell). Email +
 * contraseña contra el auth.users compartido con CORA. El "sin acceso" por pago
 * (acceso_activo) se maneja ya dentro del campus (pantalla amable con link a CORA).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const aviso = e ? (AVISOS[e] ?? null) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 text-center">
          <h1 className="text-[22px] font-bold text-foreground">Campus Virtual</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Médica Capacitación · Ultrasonografía
          </p>
        </div>
        <div className="rounded-card border border-border bg-card p-6 shadow-sm">
          <LoginForm aviso={aviso} />
        </div>
        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          ¿Problemas para entrar? Escríbenos por WhatsApp.
        </p>
      </div>
    </main>
  );
}
