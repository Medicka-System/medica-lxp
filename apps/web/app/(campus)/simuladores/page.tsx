import { redirect } from 'next/navigation';

/**
 * Los Simuladores IA viven en `/herramientas/simuladores` (§7A · Sprint 7). El menú
 * del Campus enlaza a `/simuladores` por herencia del shell; este redirect mantiene ese
 * enlace vivo sin tocar la navegación global (territorio de otro agente).
 */
export default function SimuladoresRedirect() {
  redirect('/herramientas/simuladores');
}
