import { getSesionAlumno } from '@/lib/session';
import { getPerfilData } from '@/lib/campus/perfil-datos';
import { MiPerfilCliente } from './perfil-cliente';

/** Datos por usuario (RLS) → dinámico. Se entra por el avatar del header (sin ítem de sidebar). */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Mi perfil · Campus Médica' };

export default async function PerfilPage() {
  const alumno = await getSesionAlumno();
  const data = await getPerfilData({
    userId: alumno.userId,
    nombre: alumno.nombre,
    email: alumno.email,
    matricula: alumno.matricula,
    programa: alumno.programa,
  });
  return <MiPerfilCliente data={data} />;
}
