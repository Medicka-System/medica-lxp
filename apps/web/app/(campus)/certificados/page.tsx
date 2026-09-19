import { getSesionAlumno } from '@/lib/session';
import { getReconocimiento } from '@/lib/campus/certificados-datos';
import { Reconocimiento } from './_components/reconocimiento';

export const dynamic = 'force-dynamic';

/**
 * Certificados y badges (§ Sprint 8, §6/§8) — logros, en-progreso y verificación de
 * folio. Lee certificados/hitos/badges del alumno con RLS (comoAlumno); todo es solo
 * lectura (los emite el worker · ver certificados-contrato).
 */
export default async function CertificadosPage() {
  const alumno = await getSesionAlumno();
  const data = await getReconocimiento(alumno.userId);
  return <Reconocimiento data={data} />;
}
