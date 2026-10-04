import { requireSuperAdmin } from './_guard';

/** Datos por usuario (RLS + rol) → render dinámico. */
export const dynamic = 'force-dynamic';

/**
 * Layout de la Configuración del sistema (§5B). El `AdminShell` (header navy) ya lo
 * pone el layout de `(studio-admin)`; aquí solo aplicamos el SEGUNDO candado de rol:
 * la Configuración es EXCLUSIVA del súper admin (`admin` se regresa a `/admin/panel`).
 * La RLS de `lxp.eco_config` es el tercer candado, en la BD (§10).
 */
export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();
  return <>{children}</>;
}
