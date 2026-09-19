import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getProgramaBuilder } from '@/lib/studio/datos';
import { Builder } from './_components/builder';

export const dynamic = 'force-dynamic';

/**
 * Studio · Builder de un programa. Lee el árbol completo (módulos → lecciones →
 * bloques) con RLS y lo pasa al lienzo. Las mutaciones son server actions
 * (CRUD directo web→Supabase · Regla de Oro §2).
 */
export default async function BuilderPage({
  params,
}: {
  params: Promise<{ programaId: string }>;
}) {
  const { programaId } = await params;
  const staff = await getSesionStaff();
  const programa = await getProgramaBuilder(staff.userId, programaId);
  if (!programa) notFound();
  return <Builder programa={programa} />;
}
