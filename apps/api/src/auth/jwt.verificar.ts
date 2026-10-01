import { jwtVerify } from 'jose';

export type ClaimsUsuario = { sub: string };

/**
 * Verifica un JWT de Supabase: firma **ES256** contra el JWKS dado y extrae el `sub`.
 * `claves` puede ser un JWKS remoto (`createRemoteJWKSet`) o local (`createLocalJWKSet`)
 * — así el guard usa el remoto (prod) y los tests uno local (sin credenciales reales).
 * Lanza si la firma es inválida, el token expiró, o falta `sub`.
 */
export async function verificarJwt(
  token: string,
  claves: Parameters<typeof jwtVerify>[1],
): Promise<ClaimsUsuario> {
  const { payload } = await jwtVerify(token, claves, { algorithms: ['ES256'] });
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) throw new Error('JWT sin claim sub');
  return { sub };
}
