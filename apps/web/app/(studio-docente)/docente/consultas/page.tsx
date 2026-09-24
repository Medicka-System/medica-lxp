import { requireDocente } from '../../_lib/session';
import { getConsultasDocente, getConsultaDocenteDetalle } from '../../_lib/datos';
import { ConsultasConsola } from './_components/consultas-consola';

export const dynamic = 'force-dynamic';

/**
 * Consultas 1:1 del docente (§5B) — canal directo con alumnos y staff. Lee la bandeja
 * con RLS (`es_docente_o_mas`) y el hilo abierto (elegido por `?c=`) con sus mensajes +
 * el contexto de Eco (derivado). Responder/cerrar se asientan con server actions. SIN
 * realtime (refetch por navegación). Eco es placeholder en la parte de LLM (§7A/§13).
 */
export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { userId } = await requireDocente();
  const { c } = await searchParams;
  const data = await getConsultasDocente(userId);
  const activaId = c ?? data.conversaciones[0]?.id ?? null;
  const activa = activaId ? await getConsultaDocenteDetalle(userId, activaId) : null;
  return <ConsultasConsola data={data} activa={activa} />;
}
