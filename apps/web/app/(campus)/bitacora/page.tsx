import { getSesionAlumno } from '@/lib/session';
import { getBitacora } from '@/lib/campus/bitacora-datos';
import { MiBitacora } from './_components/mi-bitacora';

export const dynamic = 'force-dynamic';

/** Mi Bitácora (§6 · corazón del producto). Lee lxp.bitacora_casos con RLS. */
export default async function BitacoraPage() {
  const alumno = await getSesionAlumno();
  const data = await getBitacora(alumno.userId);
  return <MiBitacora data={data} />;
}
