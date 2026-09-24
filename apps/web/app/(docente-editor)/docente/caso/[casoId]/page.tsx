import { notFound } from 'next/navigation';
import { requireDocente } from '@/app/(studio-docente)/_lib/session';
import { getCasoEditor, getModulosCatalogo } from '@/lib/studio/datos';
import { EditorCaso } from '@/app/(studio-editor)/studio/casos/[casoId]/_components/editor-caso';

export const dynamic = 'force-dynamic';

/**
 * Docente · Curación de un caso de la Biblioteca (§5B). REUSA el mismo `EditorCaso` del
 * diseñador (catalogación + verdad estructurada + módulo + visor DICOM real). El docente
 * cura la verdad clínica (RLS `es_staff`, guard `requireCurador` en las acciones). Vive en
 * el grupo bare `(docente-editor)` para ser pantalla completa (sin el header del docente),
 * y "Volver" regresa a la Biblioteca del docente (`rutaBase`).
 */
export default async function DocenteCasoPage({ params }: { params: Promise<{ casoId: string }> }) {
  const { casoId } = await params;
  const { userId } = await requireDocente();
  const [caso, modulos] = await Promise.all([
    getCasoEditor(userId, casoId),
    getModulosCatalogo(userId),
  ]);
  if (!caso) notFound();
  return <EditorCaso caso={caso} modulos={modulos} rutaBase="/docente/biblioteca" />;
}
