import { ZoomService } from './zoom.service';

describe('ZoomService (sin credenciales → simulada)', () => {
  const guardadas = {
    a: process.env.ZOOM_ACCOUNT_ID,
    c: process.env.ZOOM_CLIENT_ID,
    s: process.env.ZOOM_CLIENT_SECRET,
  };

  beforeEach(() => {
    delete process.env.ZOOM_ACCOUNT_ID;
    delete process.env.ZOOM_CLIENT_ID;
    delete process.env.ZOOM_CLIENT_SECRET;
  });

  afterAll(() => {
    if (guardadas.a) process.env.ZOOM_ACCOUNT_ID = guardadas.a;
    if (guardadas.c) process.env.ZOOM_CLIENT_ID = guardadas.c;
    if (guardadas.s) process.env.ZOOM_CLIENT_SECRET = guardadas.s;
  });

  it('reporta no disponible sin credenciales', () => {
    expect(new ZoomService().disponible()).toBe(false);
  });

  it('crea una reunión simulada con enlaces con forma de Zoom', async () => {
    const r = await new ZoomService().crearReunion({
      titulo: 'POCUS abdominal',
      inicioProgramado: '2026-09-20T18:00:00.000Z',
      duracionMin: 60,
    });
    expect(r.simulada).toBe(true);
    expect(r.reunionExternaId).toMatch(/^\d+$/);
    expect(r.enlaceUnion).toContain(`https://zoom.us/j/${r.reunionExternaId}`);
    expect(r.enlaceInicio).toContain(`https://zoom.us/s/${r.reunionExternaId}`);
    expect(r.enlaceInicio).toContain('zak=simulado');
  });

  it('es determinista para el mismo título e inicio', async () => {
    const zoom = new ZoomService();
    const a = await zoom.crearReunion({ titulo: 'Clase X', inicioProgramado: '2026-09-20T18:00:00.000Z' });
    const b = await zoom.crearReunion({ titulo: 'Clase X', inicioProgramado: '2026-09-20T18:00:00.000Z' });
    const c = await zoom.crearReunion({ titulo: 'Clase Y', inicioProgramado: '2026-09-20T18:00:00.000Z' });
    expect(a.reunionExternaId).toBe(b.reunionExternaId);
    expect(a.reunionExternaId).not.toBe(c.reunionExternaId);
  });
});
