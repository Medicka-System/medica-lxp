import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getContenidoTeoria } from '@/lib/studio/teoria-datos';
import { EditorTeoria } from './_components/editor-teoria';

export const dynamic = 'force-dynamic';

/**
 * Studio · Editor a fondo del bloque de TEORÍA (§5B). Redacta el cuerpo HTML de un
 * `lxp.contenidos` de tipo `texto` con el EditorRico. CRUD directo bajo RLS.
 */
export default async function TeoriaPage({
  params,
}: {
  params: Promise<{ contenidoId: string }>;
}) {
  const { contenidoId } = await params;
  const staff = await getSesionStaff();
  const contenido = await getContenidoTeoria(staff.userId, contenidoId);
  if (!contenido) notFound();
  return <EditorTeoria contenido={contenido} />;
}
