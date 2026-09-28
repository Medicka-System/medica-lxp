import { redirect } from 'next/navigation';

/**
 * Puente de compatibilidad. Las consultas 1:1 del alumno se unificaron en `/consultas`
 * (Sistema A · chat con docentes/staff/colegas sobre la MISMA tabla `lxp.consultas`). Esta
 * ruta (Sprint 8.5) quedó superseded; redirige a la canónica sin romper enlaces viejos.
 */
export default function ConsultasHerramientasRedirect() {
  redirect('/consultas');
}
