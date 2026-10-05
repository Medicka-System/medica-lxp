import RestablecerStudio from './_restablecer-studio';

export const dynamic = 'force-dynamic';

/**
 * /admin/restablecer — destino del enlace de recuperación del STAFF (redirectTo de
 * `resetPasswordForEmail` del login del Studio). En el route group (acceso): sin
 * guard. La sesión de recovery la trae el enlace; UI (Spec B) y `updateUser` en cliente.
 */
export default function AdminRestablecerPage() {
  return <RestablecerStudio />;
}
