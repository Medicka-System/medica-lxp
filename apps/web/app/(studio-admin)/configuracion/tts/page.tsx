import { requireSuperAdmin } from '../_guard';
import { ConfigTts } from './_components/config-tts';

export const dynamic = 'force-dynamic';

/**
 * Studio · Configuración › Narración TTS (§3/§5C). Solo súper admin. La UI de config
 * del proveedor/voz del TTS; el backend (tabla + persistencia bajo RLS) lo construye
 * cb-api — hasta entonces la pantalla es explorable pero no persiste (ver `_contrato.ts`).
 */
export default async function TtsConfigPage() {
  await requireSuperAdmin();
  // Sin lectura de BD: la tabla `lxp.tts_config` aún no existe (pendiente de cb-api).
  // Se pinta con el valor de arranque del contrato; el backend lo reemplazará.
  return <ConfigTts />;
}
