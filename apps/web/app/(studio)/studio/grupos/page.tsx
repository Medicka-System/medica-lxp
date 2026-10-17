import { getSesionStaff } from '@/lib/studio/session';
import { getGrupos, getGruposCora, getProgramas } from '@/lib/studio/datos';
import { GruposTabla } from './_components/grupos-tabla';

export const dynamic = 'force-dynamic';

/**
 * Studio · Grupos (lista). Conviven dos orígenes: el ESPEJO de CORA (todos los grupos de
 * CORA visibles al staff, con conteo + roster · mig 0084) y los NATIVOS del LXP (creados a
 * mano sobre un programa nativo). El roster de cada grupo CORA se carga lazy en la tabla.
 */
export default async function GruposPage() {
  const staff = await getSesionStaff();
  const [grupos, gruposCora, programas] = await Promise.all([
    getGrupos(staff.userId), // nativos (getGrupos filtra cora_grupo_id is null)
    getGruposCora(staff.userId), // espejo de CORA (read-only · mig 0084)
    getProgramas(staff.userId), // programas nativos para crear grupo nativo
  ]);
  const programasNativos = programas.map((p) => ({ id: p.id, nombre: p.nombre }));
  return <GruposTabla grupos={grupos} gruposCora={gruposCora} programasNativos={programasNativos} />;
}
