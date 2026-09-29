import { redirect } from 'next/navigation';

/** /curso/[id] → la sección de Contenido (primera pestaña del curso). */
export default async function CursoIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/curso/${id}/contenido`);
}
