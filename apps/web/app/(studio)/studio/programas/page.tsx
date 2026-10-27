import { getSesionStaff } from '@/lib/studio/session';
import { getProgramasLista } from '@/lib/studio/datos';
import { comoStaff } from '@/lib/db.server';
import { ProgramasTabla } from './_components/programas-tabla';

export const dynamic = 'force-dynamic';

/**
 * Studio · Programas (lista ÚNICA · §5B · PUENTE 1). Una sola lista con los nativos del LXP
 * y el espejo de CORA; cada fila con chip de origen. Sin grupos anidados (viven en Grupos).
 *
 * Antes de leer, refleja al Studio TODOS los programas CORA (mig 0089, idempotente): el
 * programa es el mismo en CRM/CORA/LXP y debe existir en el LXP para construirle contenido,
 * tenga grupo o no, esté activo o no. Mismo patrón que el reflejo de grupos al tope de Grupos.
 */
export default async function ProgramasPage() {
  const staff = await getSesionStaff();
  // Reflejo del lado staff ANTES de leer (§10: solo lee public; idempotente · mig 0089).
  // Fail-soft: si 0089 aún no está aplicada, la lista cae a lo ya materializado en
  // lxp.programas (nativos + shells existentes) en vez de romper la page.
  try {
    await comoStaff(staff.userId, (sql) => sql`select lxp.reflejar_programas_cora_staff()`);
  } catch (e) {
    console.error('[studio/programas] reflejo staff (no fatal · ¿falta mig 0089?):', e);
  }
  const programas = await getProgramasLista(staff.userId);
  return <ProgramasTabla programas={programas} />;
}
