import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getCasoEditor, getModulosCatalogo } from '@/lib/studio/datos';
import { EditorCaso } from './_components/editor-caso';

export const dynamic = 'force-dynamic';

/**
 * Studio · Editor de caso. La autoría (catalogación + verdad estructurada + publicar)
 * es CRUD real sobre lxp.casos_biblioteca; el visor DICOM es real (§4.7). El docente
 * asigna el MÓDULO aquí (dropdown de módulos publicados).
 */
export default async function CasoPage({ params }: { params: Promise<{ casoId: string }> }) {
  const { casoId } = await params;
  const staff = await getSesionStaff();
  const [caso, modulos] = await Promise.all([
    getCasoEditor(staff.userId, casoId),
    getModulosCatalogo(staff.userId),
  ]);
  if (!caso) notFound();
  return <EditorCaso caso={caso} modulos={modulos} />;
}
