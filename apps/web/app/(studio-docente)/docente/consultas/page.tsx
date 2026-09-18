import { requireDocente } from '../../_lib/session';
import { getConsultas, getConsultaDetalle } from '../../_lib/datos';
import { ConsultasConsola } from './_components/consultas-consola';

export const dynamic = 'force-dynamic';

/**
 * Consultas 1:1 (§5B). Lee los hilos con RLS (`es_docente_o_mas`); el hilo abierto se
 * elige por query param `?c=`. Responder/cerrar se asientan con server actions. Eco
 * (redactar borrador) es placeholder (§7A).
 */
export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { userId } = await requireDocente();
  const { c } = await searchParams;
  const hilos = await getConsultas(userId);
  const seleccionId = c ?? hilos[0]?.id ?? null;
  const detalle = seleccionId ? await getConsultaDetalle(userId, seleccionId) : null;
  return <ConsultasConsola hilos={hilos} detalle={detalle} />;
}
