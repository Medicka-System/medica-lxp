import { getSesionStaff } from '@/lib/studio/session';
import { getAnalitica } from './_components/_data';
import { Analitica } from './_components/analitica';

export const dynamic = 'force-dynamic';

/**
 * Studio · Analítica global (admin / súper admin). La capa de aprendizaje (del LRS)
 * y la de operación son REALES vía RLS; la de negocio profunda (CORA) y Eco analista
 * son placeholder marcado (§7A/§11). Es contenido académico global — lo ve el admin
 * también (no es config del sistema · §5B).
 */
export default async function AnaliticaPage() {
  const staff = await getSesionStaff();
  const data = await getAnalitica(staff.userId);
  return <Analitica data={data} />;
}
