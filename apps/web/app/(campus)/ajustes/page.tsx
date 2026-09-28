import { getSesionAlumno } from '@/lib/session';
import { getAjustesData } from '@/lib/campus/perfil-datos';
import { AjustesCliente } from './ajustes-cliente';

/** Datos por usuario (RLS) → dinámico. Se entra por el avatar del header. */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Ajustes · Campus Médica' };

export default async function AjustesPage() {
  const alumno = await getSesionAlumno();
  const data = await getAjustesData(alumno.userId);
  return <AjustesCliente data={data} />;
}
