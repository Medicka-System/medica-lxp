import { getSesionStaff } from '@/lib/studio/session';
import { getGrupos, getProgramas } from '@/lib/studio/datos';
import { GruposTabla } from './_components/grupos-tabla';

export const dynamic = 'force-dynamic';

/** Studio · Grupos (lista). Lee grupos + programas (para instanciar) con RLS. */
export default async function GruposPage() {
  const staff = await getSesionStaff();
  const [grupos, programas] = await Promise.all([
    getGrupos(staff.userId),
    getProgramas(staff.userId),
  ]);
  return (
    <GruposTabla
      grupos={grupos}
      programas={programas.map((p) => ({ id: p.id, nombre: p.nombre }))}
    />
  );
}
