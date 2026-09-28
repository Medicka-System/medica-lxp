import { ipEsInterna, validarDestino } from './enlaces.service';

/**
 * Guard SSRF del unfurl de enlaces (§1). Estos casos NO tocan la red: las IP
 * literales y los hosts internos del stack se rechazan antes de resolver DNS.
 */
describe('SSRF · validarDestino', () => {
  it('RECHAZA loopback literal 127.0.0.1', async () => {
    expect(await validarDestino('http://127.0.0.1/')).toEqual({ ok: false, motivo: 'IP interna (127.0.0.1)' });
  });

  it('RECHAZA metadata cloud 169.254.169.254', async () => {
    const r = await validarDestino('http://169.254.169.254/latest/meta-data/');
    expect(r.ok).toBe(false);
  });

  it('RECHAZA host interno del stack minio:9000', async () => {
    const r = await validarDestino('http://minio:9000/bucket/objeto');
    expect(r.ok).toBe(false);
  });

  it('RECHAZA esquemas no http(s): file, ftp, gopher', async () => {
    expect((await validarDestino('file:///etc/passwd')).ok).toBe(false);
    expect((await validarDestino('ftp://ejemplo.com/x')).ok).toBe(false);
    expect((await validarDestino('gopher://127.0.0.1/')).ok).toBe(false);
  });

  it('RECHAZA otros hosts internos y *.internal', async () => {
    expect((await validarDestino('http://localhost:3000/')).ok).toBe(false);
    expect((await validarDestino('http://redis:6379/')).ok).toBe(false);
    expect((await validarDestino('http://api.internal/x')).ok).toBe(false);
    expect((await validarDestino('http://[::1]/')).ok).toBe(false);
  });
});

describe('SSRF · ipEsInterna (rangos)', () => {
  it('marca internas las privadas / loopback / link-local / ULA', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.9.1', '172.31.255.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(ipEsInterna(ip)).toBe(true);
    }
  });

  it('deja pasar IPs públicas', () => {
    for (const ip of ['8.8.8.8', '93.184.216.34', '1.1.1.1', '172.15.0.1', '172.32.0.1', '2606:4700::1111']) {
      expect(ipEsInterna(ip)).toBe(false);
    }
  });
});
