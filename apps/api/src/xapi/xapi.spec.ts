import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  actividad,
  actorDeUsuario,
  emitirStatement,
  statementSchema,
  verbo,
  OPCIONES_REINTENTO_XAPI,
} from '@campus/shared';
import { XapiController } from './xapi.controller';
import { XAPI_QUEUE, XapiService } from './xapi.service';

describe('Perfil xAPI (packages/shared)', () => {
  it('emitirStatement construye un statement válido, con id y timestamp', () => {
    const st = emitirStatement(
      actorDeUsuario('user-123', 'Alumno Uno'),
      verbo('subio'),
      actividad('caso', 'caso-abc', 'FAST positivo'),
    );

    expect(() => statementSchema.parse(st)).not.toThrow();
    expect(st.id).toMatch(/[0-9a-f-]{36}/i); // idempotencia
    expect(st.timestamp).toBeDefined();
    expect(st.verb.id).toContain('/verbs/subio');
    expect(st.object.definition?.type).toContain('activitytypes/caso');
    expect(st.actor.account?.name).toBe('user-123');
  });

  it('admite result opcional (nota/aprobación)', () => {
    const st = emitirStatement(
      actorDeUsuario('user-9'),
      verbo('aprobo'),
      actividad('leccion', 'lec-1'),
      { success: true, completion: true, score: { scaled: 0.9 } },
    );
    expect(st.result?.success).toBe(true);
    expect(st.result?.score?.scaled).toBe(0.9);
  });
});

describe('XapiService', () => {
  const queue = { add: jest.fn(), close: jest.fn() };

  async function crear(): Promise<XapiService> {
    queue.add.mockResolvedValue({ id: 'job-1' });
    const moduleRef = await Test.createTestingModule({
      providers: [XapiService, { provide: XAPI_QUEUE, useValue: queue }],
    }).compile();
    return moduleRef.get(XapiService);
  }

  afterEach(() => jest.restoreAllMocks());

  it('encola el statement con reintentos/backoff (nunca síncrono al LRS)', async () => {
    const service = await crear();
    const st = emitirStatement(actorDeUsuario('u1'), verbo('completo'), actividad('leccion', 'l1'));

    const jobId = await service.encolar(st);

    expect(jobId).toBe('job-1');
    expect(queue.add).toHaveBeenCalledWith('statement', { statement: st }, OPCIONES_REINTENTO_XAPI);
    // La política de reintento debe estar realmente configurada.
    expect(OPCIONES_REINTENTO_XAPI.attempts).toBeGreaterThanOrEqual(3);
    expect(OPCIONES_REINTENTO_XAPI.backoff.type).toBe('exponential');
  });

  it('consulta el LRS con Basic auth y header de versión xAPI', async () => {
    process.env.LRS_KEY = 'k';
    process.env.LRS_SECRET = 's';
    process.env.LRS_ENDPOINT = 'http://lrs.test/xapi';
    const cuerpo = { statements: [] };
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => cuerpo });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = await crear();
    const out = await service.consultarStatements({ agent: 'u1', limit: 5 });

    expect(out).toEqual(cuerpo);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toContain('http://lrs.test/xapi/statements');
    expect(url.searchParams.get('agent')).toContain('u1');
    expect(url.searchParams.get('limit')).toBe('5');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Experience-API-Version']).toBe('1.0.3');
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('k:s').toString('base64')}`);
  });

  it('si el LRS está caído, la lectura reporta 503 (no se traga el error)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    const service = await crear();
    await expect(service.consultarStatements({})).rejects.toThrow(/LRS/);
  });
});

describe('XapiController', () => {
  const xapi = {
    encolar: jest.fn().mockResolvedValue('job-9'),
    consultarStatements: jest.fn().mockResolvedValue({ ok: 1 }),
  };

  async function crear(): Promise<XapiController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [XapiController],
      providers: [{ provide: XapiService, useValue: xapi }],
    }).compile();
    return moduleRef.get(XapiController);
  }

  it('POST /xapi/statements valida y encola', async () => {
    const controller = await crear();
    const st = emitirStatement(actorDeUsuario('u1'), verbo('valido'), actividad('caso', 'c1'));

    const res = await controller.emitir(st);

    expect(res.encolado).toBe(true);
    expect(res.jobId).toBe('job-9');
    expect(xapi.encolar).toHaveBeenCalledWith(st);
  });

  it('rechaza un statement inválido con 400', async () => {
    const controller = await crear();
    await expect(controller.emitir({ foo: 'bar' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
