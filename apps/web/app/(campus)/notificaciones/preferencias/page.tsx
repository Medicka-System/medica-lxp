import { redirect } from 'next/navigation';

/**
 * FUENTE ÚNICA de preferencias: /ajustes#notificaciones. Esta ruta se conserva como
 * REDIRECT (no borrado duro) para no romper enlaces existentes; el formulario propio
 * (`_components/form-preferencias`) queda inactivo. Las preferencias reales viven en
 * lxp.preferencias_notificaciones y se editan desde /ajustes.
 */
export default function PreferenciasNotificacionPage() {
  redirect('/ajustes#notificaciones');
}
