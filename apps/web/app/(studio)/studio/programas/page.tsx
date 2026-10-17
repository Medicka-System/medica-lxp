import { getSesionStaff } from '@/lib/studio/session';
import { getProgramasLista } from '@/lib/studio/datos';
import { ProgramasTabla } from './_components/programas-tabla';

export const dynamic = 'force-dynamic';

/**
 * Studio · Programas (lista ÚNICA · §5B · PUENTE 1). Una sola lista con los nativos del LXP
 * y el espejo de CORA; cada fila con chip de origen. Sin grupos anidados (viven en Grupos).
 */
export default async function ProgramasPage() {
  const staff = await getSesionStaff();
  const programas = await getProgramasLista(staff.userId);
  return <ProgramasTabla programas={programas} />;
}
