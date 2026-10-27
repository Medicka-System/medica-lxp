import { getSesionStaff } from '@/lib/studio/session';
import { getGrupos, getProgramas, getDocentes } from '@/lib/studio/datos';
import { comoStaff } from '@/lib/db.server';
import { GruposTabla } from './_components/grupos-tabla';

export const dynamic = 'force-dynamic';

/**
 * Studio · Grupos (lista UNIVERSAL). Todos los grupos se ven idénticos: son filas de
 * `lxp.grupos`, sin distinción de origen. Antes de leer, refleja al Studio todo grupo
 * CORA de un programa ligado (mig 0086, idempotente) — así la lista queda completa,
 * incluidos los grupos vacíos/próximos que el reflejo del alumno nunca materializaría.
 */
export default async function GruposPage() {
  const staff = await getSesionStaff();
  // Reflejo del lado staff ANTES de leer (§10: solo lee public; idempotente · mig 0086).
  // Fail-soft: si 0086 aún no está aplicada, la lista cae a los grupos ya existentes
  // (nativos + CORA reflejados por el flujo del alumno) en vez de romper la page.
  try {
    await comoStaff(staff.userId, (sql) => sql`select lxp.reflejar_grupos_cora_staff()`);
  } catch (e) {
    console.error('[studio/grupos] reflejo staff (no fatal · ¿falta mig 0086?):', e);
  }
  const [grupos, programas, docentes] = await Promise.all([
    getGrupos(staff.userId), // nativos + CORA reflejados: una sola población
    getProgramas(staff.userId), // programas nativos para instanciar un grupo nuevo
    getDocentes(staff.userId), // para asignar docente al crear
  ]);
  return <GruposTabla grupos={grupos} programas={programas} docentes={docentes} />;
}
