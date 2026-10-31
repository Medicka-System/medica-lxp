import { requireSuperAdmin } from '../_guard';
import { ConfigTts } from './_components/config-tts';
import { getTtsConfig } from './_acciones';

export const dynamic = 'force-dynamic';

/**
 * Studio · Configuración › Narración TTS (§3/§5C). Solo súper admin. Lee la fila activa
 * de `lxp.tts_config` (mig 0018) y la edita bajo RLS; el motor de síntesis (apps/api)
 * la consume. El proveedor real se enchufa por env (TTS_PROVIDER + key · §3) — aparte.
 */
export default async function TtsConfigPage() {
  await requireSuperAdmin();
  const config = await getTtsConfig();
  return <ConfigTts config={config} />;
}
