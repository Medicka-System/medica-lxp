import { requireSuperAdmin } from './_guard';
import { getEcoConfigActiva } from './_datos';
import { ConfigHub, type ResumenEco } from './_components/config-hub';

export const dynamic = 'force-dynamic';

/**
 * Studio · Configuración del sistema — HUB de gobierno (exclusivo del súper admin,
 * §5B). Nueve áreas agrupadas por lo que gobiernan. Hoy solo **IA / Eco** tiene su
 * pantalla real (editor de `lxp.eco_config`); el resto muestra su acceso/estructura
 * como "próximamente" — se detallan en sus sprints, sin inventar datos.
 *
 * El dato vivo del hub sale de la config activa de Eco (RLS · §7A); el resto de las
 * tarjetas son estructura, no métricas fabricadas.
 */
export default async function ConfiguracionPage() {
  const { userId } = await requireSuperAdmin();
  const eco = await getEcoConfigActiva(userId);

  const resumenEco: ResumenEco | null = eco
    ? {
        nombre: eco.nombre,
        modeloJuicio: eco.modelos.juicio.modelo,
        umbralConfianza: eco.umbralConfianza,
        version: eco.version,
      }
    : null;

  return <ConfigHub resumenEco={resumenEco} />;
}
