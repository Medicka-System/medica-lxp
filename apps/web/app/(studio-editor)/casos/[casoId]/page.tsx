import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getCasoEditor } from '@/lib/studio/datos';
import { EditorCaso } from './_components/editor-caso';

export const dynamic = 'force-dynamic';

/**
 * Studio · Editor de caso. La autoría (catalogación + verdad estructurada + publicar)
 * es CRUD real sobre lxp.casos_biblioteca; el visor DICOM es placeholder (Sprint 4.7).
 */
export default async function CasoPage({ params }: { params: Promise<{ casoId: string }> }) {
  const { casoId } = await params;
  const staff = await getSesionStaff();
  const caso = await getCasoEditor(staff.userId, casoId);
  if (!caso) notFound();
  return <EditorCaso caso={caso} />;
}
