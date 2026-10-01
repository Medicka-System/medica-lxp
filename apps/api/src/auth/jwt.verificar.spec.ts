import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT, type JWK } from 'jose';
import { verificarJwt } from './jwt.verificar';

/**
 * Prueba la verificación ES256/JWKS SIN credenciales reales: genera un par de claves
 * ES256 local, publica su clave pública como JWKS local y firma tokens de prueba.
 */
async function jwksDe(publicKey: Parameters<typeof exportJWK>[0], kid = 'k1') {
  const jwk: JWK = { ...(await exportJWK(publicKey)), alg: 'ES256', kid };
  return createLocalJWKSet({ keys: [jwk] });
}

describe('verificarJwt (ES256 / JWKS)', () => {
  it('acepta un token ES256 válido y extrae el sub', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const jwks = await jwksDe(publicKey);
    const token = await new SignJWT({ sub: 'user-123', role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    await expect(verificarJwt(token, jwks)).resolves.toEqual({ sub: 'user-123' });
  });

  it('rechaza una firma que no corresponde al JWKS', async () => {
    const firmante = await generateKeyPair('ES256');
    const otro = await generateKeyPair('ES256');
    const jwks = await jwksDe(otro.publicKey); // JWKS de OTRA clave
    const token = await new SignJWT({ sub: 'x' })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(firmante.privateKey);

    await expect(verificarJwt(token, jwks)).rejects.toBeDefined();
  });

  it('rechaza un token expirado', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const jwks = await jwksDe(publicKey);
    const token = await new SignJWT({ sub: 'x' })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuedAt(0)
      .setExpirationTime(1) // 1970 → expirado
      .sign(privateKey);

    await expect(verificarJwt(token, jwks)).rejects.toBeDefined();
  });

  it('rechaza un token sin claim sub', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const jwks = await jwksDe(publicKey);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    await expect(verificarJwt(token, jwks)).rejects.toBeDefined();
  });
});
