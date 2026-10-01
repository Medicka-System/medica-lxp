import { cerrarSesion } from '@/app/login/acciones';
import { Button } from '@/components/ui/button';

/**
 * Pantalla "acceso en pausa" (§1/§10): cuando `cora_acceso_activo()` es false (pago/
 * inscripción no vigente en CORA), el alumno ve esto —no un error roto— con un camino
 * claro al checkout de CORA. CORA es dueño del acceso; el LXP solo lo OBEDECE.
 */
export function SinAcceso({ nombre }: { nombre: string }) {
  const coraUrl = process.env.NEXT_PUBLIC_CORA_URL;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted px-4">
      <div className="w-full max-w-[460px] rounded-card border border-border bg-card p-7 text-center shadow-sm">
        <h1 className="text-[20px] font-bold text-foreground">Tu acceso está en pausa</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          Hola {nombre}: por ahora no tienes una inscripción activa en Médica Capacitación.
          En cuanto se regularice tu pago, tu Campus se reactiva automáticamente.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {coraUrl && (
            <a href={`${coraUrl}/pagos`} className="w-full">
              <Button size="cta" className="w-full">
                Ir a pagos y facturación
              </Button>
            </a>
          )}
          <form action={cerrarSesion}>
            <Button type="submit" variant="ghost" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
