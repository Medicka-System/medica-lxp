import { redirect } from 'next/navigation';

/**
 * Puente de compatibilidad. El hilo por URL vivía aquí (Sprint 8.5). El Sistema A
 * (`/consultas`) maneja el hilo en una sola página (estado en cliente, sin ruta por id),
 * así que redirigimos a la lista canónica.
 */
export default function ConsultaHiloRedirect() {
  redirect('/consultas');
}
