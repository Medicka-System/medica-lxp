import { CorreoFactory } from './correo.factory';
import { MockCorreoAdaptador } from './mock.adaptador';
import { ResendAdaptador } from './resend.adaptador';

describe('Adaptador de correo Resend (intercambiable · §3)', () => {
  const envOrig = { ...process.env };
  afterEach(() => {
    process.env = { ...envOrig };
    jest.restoreAllMocks();
  });

  describe('ResendAdaptador (fetch, sin SDK)', () => {
    it('POST a la API de Resend con Authorization Bearer y devuelve el id', async () => {
      process.env.RESEND_API_KEY = 'sk-test';
      process.env.NOTIFICACIONES_FROM_EMAIL = 'campus@test.mx';
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          new Response(JSON.stringify({ id: 'email-123' }), { status: 200 }),
        );

      const adaptador = new ResendAdaptador();
      const res = await adaptador.enviar({
        to: 'alumno@test.mx',
        asunto: 'Tu caso fue aprobado',
        texto: 'Felicidades',
        html: '<p>Felicidades</p>',
      });

      expect(res).toEqual({ id: 'email-123' });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.resend.com/emails');
      expect((init?.headers as Record<string, string>).authorization).toBe(
        'Bearer sk-test',
      );
      const body = JSON.parse(init?.body as string);
      expect(body).toMatchObject({
        from: 'campus@test.mx',
        to: 'alumno@test.mx',
        subject: 'Tu caso fue aprobado',
        html: '<p>Felicidades</p>',
      });
    });

    it('sin RESEND_API_KEY lanza (defensa en profundidad)', async () => {
      delete process.env.RESEND_API_KEY;
      const adaptador = new ResendAdaptador();
      await expect(
        adaptador.enviar({ to: 'x@y.z', asunto: 'a', texto: 'b' }),
      ).rejects.toThrow(/RESEND_API_KEY/);
    });

    it('respuesta no-OK lanza con el status (para que BullMQ reintente)', async () => {
      process.env.RESEND_API_KEY = 'sk-test';
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('rate limited', { status: 429 }));
      const adaptador = new ResendAdaptador();
      await expect(
        adaptador.enviar({ to: 'x@y.z', asunto: 'a', texto: 'b' }),
      ).rejects.toThrow(/429/);
    });
  });

  describe('CorreoFactory (elige por config, MOCK sin key)', () => {
    const mock = new MockCorreoAdaptador();
    const resend = new ResendAdaptador();
    const factory = new CorreoFactory(mock, resend);

    it('NOTIFICACIONES_PROVIDER=mock fuerza el MOCK aunque haya key', () => {
      process.env.NOTIFICACIONES_PROVIDER = 'mock';
      process.env.RESEND_API_KEY = 'sk-existe';
      expect(factory.obtener()).toBe(mock);
    });

    it('resend real solo con key; sin ella cae al MOCK', () => {
      process.env.NOTIFICACIONES_PROVIDER = 'resend';
      delete process.env.RESEND_API_KEY;
      expect(factory.obtener()).toBe(mock);
      process.env.RESEND_API_KEY = 'sk-existe';
      expect(factory.obtener()).toBe(resend);
    });

    it('default sin PROVIDER: MOCK si no hay key, resend si la hay', () => {
      delete process.env.NOTIFICACIONES_PROVIDER;
      delete process.env.RESEND_API_KEY;
      expect(factory.obtener()).toBe(mock);
      process.env.RESEND_API_KEY = 'sk-existe';
      expect(factory.obtener()).toBe(resend);
    });
  });
});
