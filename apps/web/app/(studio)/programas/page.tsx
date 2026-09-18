import { getSesionStaff } from '@/lib/studio/session';
import { getProgramas } from '@/lib/studio/datos';
import { ProgramasTabla } from './_components/programas-tabla';

export const dynamic = 'force-dynamic';

/** Studio · Programas (lista). Lee los programas con RLS y los pasa a la tabla. */
export default async function ProgramasPage() {
  const staff = await getSesionStaff();
  const programas = await getProgramas(staff.userId);
  return <ProgramasTabla programas={programas} />;
}
