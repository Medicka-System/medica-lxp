import { getSesionAlumno } from '@/lib/session';
import { getBiblioteca } from '@/lib/campus/biblioteca-datos';
import { BibliotecaCasos } from './_components/biblioteca-casos';

export const dynamic = 'force-dynamic';

/**
 * Biblioteca de casos (§ Sprint 8, §6) — acervo curado con verdad estructurada
 * (§7A). Lee lxp.casos_biblioteca (solo publicados) con RLS (comoAlumno). El visor
 * DICOM es placeholder (4.7 · ver biblioteca-contrato).
 */
export default async function BibliotecaPage() {
  const alumno = await getSesionAlumno();
  const data = await getBiblioteca(alumno.userId);
  return <BibliotecaCasos data={data} />;
}
