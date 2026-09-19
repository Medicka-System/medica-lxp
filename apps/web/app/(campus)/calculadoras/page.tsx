import { redirect } from 'next/navigation';

/**
 * Puente: las calculadoras del alumno viven en /herramientas/calculadoras (§ Sprint 8,
 * junto a reportes y simuladores). El enlace del menú apunta aquí por compatibilidad;
 * redirigimos a la ruta canónica sin tocar la navegación global.
 */
export default function CalculadorasRedirect() {
  redirect('/herramientas/calculadoras');
}
