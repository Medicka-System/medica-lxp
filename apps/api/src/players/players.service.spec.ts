import { PlayersService } from './players.service';
import type { DbService } from '../db/db.service';
import type { XapiService } from '../xapi/xapi.service';
import type { Statement } from '@campus/shared';

const ALUMNO = '11111111-1111-4111-8111-111111111111';
const CONTENIDO = '22222222-2222-4222-8222-222222222222';

function dbFalso(): DbService {
  // `sql` falso: invocable (tagged template) y con `.json` (identidad) como postgres.js.
  const sql = Object.assign(
    () =>
      Promise.resolve([
        { alumno_id: ALUMNO, contenido_id: CONTENIDO, porcentaje: '100', completado: true },
      ]),
    { json: (v: unknown) => v },
  );
  return { sql } as unknown as DbService;
}

describe('PlayersService', () => {
  let xapi: { encolar: jest.Mock<Promise<string>, [Statement]> };
  let capturado: Statement | undefined;

  beforeEach(() => {
    capturado = undefined;
    xapi = {
      encolar: jest.fn((s: Statement) => {
        capturado = s;
        return Promise.resolve('job-1');
      }),
    };
  });

  it('registrarProgreso completado emite `completó` al LRS', async () => {
    const svc = new PlayersService(dbFalso(), xapi as unknown as XapiService);
    const r = await svc.registrarProgreso({
      alumnoId: ALUMNO,
      contenidoId: CONTENIDO,
      posicionSeg: 300,
      completado: true,
    });
    expect(r.completado).toBe(true);
    expect(r.porcentaje).toBe(100);
    expect(xapi.encolar).toHaveBeenCalledTimes(1);
    expect(capturado?.verb.display?.['es-MX']).toBe('completó');
    expect(r.statementId).toBe(capturado?.id);
  });

  it('registrarProgreso NO completado no emite statement', async () => {
    const svc = new PlayersService(dbFalso(), xapi as unknown as XapiService);
    await svc.registrarProgreso({
      alumnoId: ALUMNO,
      contenidoId: CONTENIDO,
      posicionSeg: 30,
      duracionSeg: 300,
      completado: false,
    });
    expect(xapi.encolar).not.toHaveBeenCalled();
  });

  it('commitScorm passed emite `aprobó` con score', async () => {
    const svc = new PlayersService(dbFalso(), xapi as unknown as XapiService);
    const r = await svc.commitScorm({
      alumnoId: ALUMNO,
      contenidoId: CONTENIDO,
      cmi: { 'cmi.core.lesson_status': 'passed', 'cmi.core.score.raw': '90' },
    });
    expect(r.completado).toBe(true);
    expect(capturado?.verb.display?.['es-MX']).toBe('aprobó');
    expect(capturado?.result?.success).toBe(true);
    expect(capturado?.result?.score?.scaled).toBeCloseTo(0.9);
  });

  it('commitScorm failed emite `falló`', async () => {
    const svc = new PlayersService(dbFalso(), xapi as unknown as XapiService);
    await svc.commitScorm({
      alumnoId: ALUMNO,
      contenidoId: CONTENIDO,
      cmi: { 'cmi.core.lesson_status': 'failed' },
    });
    expect(capturado?.verb.display?.['es-MX']).toBe('falló');
  });

  it('commitScorm incompleto no emite statement', async () => {
    const svc = new PlayersService(dbFalso(), xapi as unknown as XapiService);
    await svc.commitScorm({
      alumnoId: ALUMNO,
      contenidoId: CONTENIDO,
      cmi: { 'cmi.core.lesson_status': 'incomplete' },
    });
    expect(xapi.encolar).not.toHaveBeenCalled();
  });
});
