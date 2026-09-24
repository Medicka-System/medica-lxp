import { notFound } from 'next/navigation';
import { getSesionStaff } from '@/lib/studio/session';
import { getPlantilla } from '@/lib/studio/datos';
import { ConstructorPlantilla } from './_components/constructor-plantilla';

export const dynamic = 'force-dynamic';

export default async function ConstructorPlantillaPage({
  params,
}: {
  params: Promise<{ plantillaId: string }>;
}) {
  const { plantillaId } = await params;
  const staff = await getSesionStaff();
  const plantilla = await getPlantilla(staff.userId, plantillaId);
  if (!plantilla) notFound();
  return <ConstructorPlantilla plantilla={plantilla} />;
}
