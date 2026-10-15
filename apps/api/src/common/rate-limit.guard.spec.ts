import type { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * Rate-limit POR USUARIO (fix del 429 de media): la firma (firmar-lectura/subida) sale del
 * bucket de escrituras y se cuenta por `X-Usuario-Id` (header interno de confianza · api
 * solo-interno), con fallback a IP. Un alumno firmando mucho NO bloquea a otro, y la subida
 * (`firmar-subida`) ya no compite con el bucket de writes ni con la firma del feed de los demás.
 */

const U1 = '11111111-1111-1111-1111-111111111111';
const U2 = '22222222-2222-2222-2222-222222222222';
const IP_WEB = '172.20.0.4'; // la IP interna única del contenedor web (causa del tope global)

type Req = { method?: string; path: string; uid?: string; ip?: string };
function ctx({ method = 'POST', path, uid, ip = IP_WEB }: Req): ExecutionContext {
  const req = {
    method,
    path,
    url: path,
    ip,
    socket: { remoteAddress: ip },
    headers: uid ? { 'x-usuario-id': uid } : {},
  };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}
/** true si el guard PERMITIÓ la solicitud (false si lanzó 429). */
function permite(g: RateLimitGuard, r: Req): boolean {
  try {
    return g.canActivate(ctx(r));
  } catch {
    return false;
  }
}

describe('RateLimitGuard — por usuario + bucket de firma', () => {
  const FIRMA = '/media/imagenes/firmar-lectura';
  const SUBIDA = '/media/imagenes/firmar-subida';
  const DERIVAR = '/media/imagenes/derivar'; // write (no es /firmar*)

  it('firma por usuario: U1 agota su presupuesto de firma pero U2 sigue firmando', () => {
    const g = new RateLimitGuard();
    let u1Permitidas = 0;
    for (let i = 0; i < 305; i++) if (permite(g, { path: FIRMA, uid: U1 })) u1Permitidas++;
    expect(u1Permitidas).toBe(300); // límite de firma por usuario
    expect(permite(g, { path: FIRMA, uid: U1 })).toBe(false); // U1 excedido
    // U2, otro alumno, NO se ve afectado (presupuesto independiente).
    expect(permite(g, { path: FIRMA, uid: U2 })).toBe(true);
  });

  it('reproduce el 429: la ráfaga de firma del FEED ya no bloquea la SUBIDA de otro alumno', () => {
    const g = new RateLimitGuard();
    // U1 carga el feed muchas veces (firma de lectura) — antes agotaba el bucket GLOBAL por IP.
    for (let i = 0; i < 300; i++) permite(g, { path: FIRMA, uid: U1 });
    // U2 intenta SUBIR una imagen: con per-usuario, su firma de subida pasa a la primera.
    expect(permite(g, { path: SUBIDA, uid: U2 })).toBe(true);
  });

  it('firmar-subida NO compite con el bucket de ESCRITURAS', () => {
    const g = new RateLimitGuard();
    // Agota el bucket de writes del sujeto con un endpoint de escritura real (derivar).
    let writesOk = 0;
    for (let i = 0; i < 65; i++) if (permite(g, { path: DERIVAR, uid: U1 })) writesOk++;
    expect(writesOk).toBe(60); // límite de escrituras
    expect(permite(g, { path: DERIVAR, uid: U1 })).toBe(false); // writes excedidos
    // Aun con los writes agotados, la SUBIDA (firma) del MISMO usuario sigue permitida.
    expect(permite(g, { path: SUBIDA, uid: U1 })).toBe(true);
  });

  it('fallback a IP cuando falta el header (no baja la protección)', () => {
    const g = new RateLimitGuard();
    // Sin uid, dos sujetos distintos por IP comparten el bucket de firma de esa IP.
    let ok = 0;
    for (let i = 0; i < 305; i++) if (permite(g, { path: FIRMA, ip: '10.0.0.9' })) ok++;
    expect(ok).toBe(300);
    expect(permite(g, { path: FIRMA, ip: '10.0.0.9' })).toBe(false);
  });

  it('/health sigue exento', () => {
    const g = new RateLimitGuard();
    for (let i = 0; i < 1000; i++) expect(permite(g, { method: 'GET', path: '/health' })).toBe(true);
  });
});
