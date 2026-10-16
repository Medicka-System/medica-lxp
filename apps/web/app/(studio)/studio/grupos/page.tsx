import { getSesionStaff } from '@/lib/studio/session';
import { getGrupos, getProgramas } from '@/lib/studio/datos';
import { GruposTabla } from './_components/grupos-tabla';

export const dynamic = 'force-dynamic';

/**
 * Studio · Grupos (lista). Lee los grupos con RLS. Conviven dos orígenes: los de CORA
 * (nacen allá y se reflejan solos · PUENTE 1 · mig 0082) y los NATIVOS del LXP (creados
 * a mano sobre un programa nativo). Para crear un grupo nativo se pasan los programas nativos.
 */
export default async function GruposPage() {
  const staff = await getSesionStaff();
  const [grupos, programas] = await Promise.all([
    getGrupos(staff.userId),
    getProgramas(staff.userId), // nativos (getProgramas filtra cora_programa_id is null)
  ]);
  const programasNativos = programas.map((p) => ({ id: p.id, nombre: p.nombre }));
  return <GruposTabla grupos={grupos} programasNativos={programasNativos} />;
}
