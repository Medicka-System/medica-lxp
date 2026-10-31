import { requireSuperAdmin } from '../_guard';
import { getBadgesCatalogo } from './_acciones';
import { GestorBadges } from './_components/gestor-badges';

export const dynamic = 'force-dynamic';

/**
 * Studio · Configuración › Badges y reconocimientos (§6/§8). Solo súper admin (como el
 * resto de Configuración). Administra el CATÁLOGO `lxp.badges`; el motor automático
 * (worker `otorgar-badges`) y la vista del alumno (Reconocimiento) ya existen aparte.
 */
export default async function BadgesConfigPage() {
  await requireSuperAdmin();
  const badges = await getBadgesCatalogo();
  return <GestorBadges badges={badges} />;
}
