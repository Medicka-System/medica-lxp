import { notFound } from 'next/navigation';
import { requireDocente } from '../../../_lib/session';
import { getGrupoDetalleSeguimiento } from '../_lib/datos';
import { DetalleGrupo } from '../_components/detalle-grupo';

export const dynamic = 'force-dynamic';

/**
 * Seguimiento de un grupo (§5B): KPIs + tabla de alumnos con su señal de intervención.
 * Datos REALES del roster de CORA (puente SECDEF) + avance/casos/competencia bajo RLS.
 * El avance por alumno YA NO es un disclaimer: se calcula del progreso real. Eco =
 * placeholder. Solo los grupos del docente (filtro `docente_id` + RLS · doble candado).
 */
export default async function GrupoDetallePage({
  params,
}: {
  params: Promise<{ grupoId: string }>;
}) {
  const { userId } = await requireDocente();
  const { grupoId } = await params;
  const grupo = await getGrupoDetalleSeguimiento(userId, grupoId);
  if (!grupo) notFound();

  const resumenEco = describirIntervencion(grupo);
  return <DetalleGrupo grupo={grupo} resumenEco={resumenEco} />;
}

/** Descripción en palabras del porqué de la intervención (para la franja + el panel). */
function describirIntervencion(grupo: NonNullable<Awaited<ReturnType<typeof getGrupoDetalleSeguimiento>>>): string {
  const sin = grupo.alumnos.filter((a) => a.senal?.tipo === 'sin-actividad').length;
  const rep = grupo.alumnos.filter((a) => a.senal?.tipo === 'reprobando').length;
  const rec = grupo.alumnos.filter((a) => a.senal?.tipo === 'casos-rechazados').length;
  if (sin + rep + rec === 0) {
    return 'Ningún alumno requiere intervención por ahora: el grupo va al día.';
  }
  const partes: string[] = [];
  if (sin) partes.push(`${sin} ${sin === 1 ? 'no entra' : 'no entran'} desde hace más de una semana`);
  if (rep) partes.push(`${rep} ${rep === 1 ? 'está reprobando' : 'están reprobando'}`);
  if (rec) partes.push(`${rec} ${rec === 1 ? 'lleva casos rechazados' : 'llevan casos rechazados'}`);
  const frase = partes.join(', ').replace(/, ([^,]*)$/, ' y $1');
  return `${frase.charAt(0).toUpperCase()}${frase.slice(1)}.`;
}
