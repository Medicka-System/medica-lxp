import { requireDocente } from '../../_lib/session';
import { getGruposSeguimiento } from './_lib/datos';
import { ListaGrupos } from './_components/lista-grupos';

export const dynamic = 'force-dynamic';

/**
 * Grupos del docente — SEGUIMIENTO (§5B). "¿Cómo va mi grupo? ¿Quién necesita ayuda?"
 * en el tiempo (distinto del home, que son los pendientes de hoy). Datos REALES del
 * roster de CORA (puente SECDEF) + avance/casos/señales bajo RLS. Eco = placeholder.
 */
export default async function GruposDocentePage() {
  const { userId } = await requireDocente();
  const grupos = await getGruposSeguimiento(userId);

  // Resumen global de Eco (PLACEHOLDER): se compone de las cifras REALES, pero el
  // análisis conversacional real llega con el orquestador (apps/api · §7A).
  const resumenEco = componerResumenEco(grupos);

  return <ListaGrupos grupos={grupos} resumenEco={resumenEco} />;
}

/** Frase-resumen a partir de los datos reales (no es juicio de Eco: es una síntesis). */
function componerResumenEco(
  grupos: Awaited<ReturnType<typeof getGruposSeguimiento>>,
): string {
  const enRiesgo = grupos.filter((g) => g.enRiesgo > 0);
  if (grupos.length === 0) return 'aún no tiene grupos asignados.';
  if (enRiesgo.length === 0) {
    return 'sus grupos van al día; nadie requiere intervención por ahora.';
  }
  const foco = enRiesgo.reduce((a, b) => (b.enRiesgo > a.enRiesgo ? b : a));
  const total = grupos.reduce((s, g) => s + g.enRiesgo, 0);
  return `el ${foco.nombre.split(' (')[0]} es el que más necesita su atención (${foco.enRiesgo} ${
    foco.enRiesgo === 1 ? 'alumno' : 'alumnos'
  }); en total ${total} ${total === 1 ? 'alumno requiere' : 'alumnos requieren'} que usted intervenga.`;
}
