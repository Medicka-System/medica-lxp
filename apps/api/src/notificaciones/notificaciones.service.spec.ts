import type { NotificacionJob } from '@campus/shared';
import { NotificacionesService } from './notificaciones.service';
import * as repo from './notificaciones.repositorio';

// Mockea el acceso a datos: el test no toca Postgres (igual que validacion.spec).
jest.mock('./notificaciones.repositorio');
const leerPreferencias = repo.leerPreferencias as jest.Mock;
const datosDestinatario = repo.datosDestinatario as jest.Mock;
const insertarInApp = repo.insertarInApp as jest.Mock;

describe('NotificacionesService — motor de despacho (§8 job #12)', () => {
  const db = { sql: {} } as never;
  const colas = { encolar: jest.fn() };
  const correoAdaptador = { nombre: 'mock', enviar: jest.fn() };
  const correoFactory = { obtener: jest.fn(() => correoAdaptador) };
  const whatsapp = { nombre: 'stub', enviar: jest.fn() };

  const crear = () =>
    new NotificacionesService(
      db,
      colas as never,
      correoFactory as never,
      whatsapp as never,
    );

  beforeEach(() => {
    leerPreferencias.mockResolvedValue(null); // sin prefs → defaults
    datosDestinatario.mockResolvedValue({ email: 'a@lumno.mx', nombre: 'Ana' });
    insertarInApp.mockResolvedValue('notif-1');
    correoAdaptador.enviar.mockResolvedValue({ id: 'email-1' });
    whatsapp.enviar.mockResolvedValue({ id: 'wa-1' });
    colas.encolar.mockResolvedValue('job-1');
  });

  afterEach(() => jest.clearAllMocks());

  const job = (over: Partial<NotificacionJob> = {}): NotificacionJob => ({
    userId: 'u-1',
    tipo: 'certificado_emitido',
    ...over,
  });

  it('certificado_emitido (defaults): in-app + correo + whatsapp, y persiste los 3 canales', async () => {
    const res = await crear().despachar(job({ datos: { folio: 'MC-1' } }));

    expect(correoAdaptador.enviar).toHaveBeenCalledTimes(1);
    expect(whatsapp.enviar).toHaveBeenCalledTimes(1);
    expect(res.canales).toEqual(['in_app', 'correo', 'whatsapp']);
    expect(res.notificacionId).toBe('notif-1');
    // canales_enviados registra los canales realmente usados.
    const canalesPersistidos = insertarInApp.mock.calls[0][4];
    expect(canalesPersistidos).toEqual(['in_app', 'correo', 'whatsapp']);
  });

  it('deriva título/cuerpo de la plantilla cuando el job no los trae', async () => {
    await crear().despachar(job({ datos: { folio: 'MC-1' } }));
    const [, , titulo, cuerpo] = insertarInApp.mock.calls[0];
    expect(titulo).toBe('Tu certificado está listo');
    expect(cuerpo).toContain('MC-1');
  });

  it('badge_otorgado (default solo in_app): no manda correo ni whatsapp', async () => {
    const res = await crear().despachar(job({ tipo: 'badge_otorgado' }));
    expect(correoAdaptador.enviar).not.toHaveBeenCalled();
    expect(whatsapp.enviar).not.toHaveBeenCalled();
    expect(res.canales).toEqual(['in_app']);
  });

  it('respeta la preferencia del usuario (apaga correo) sobre el default', async () => {
    leerPreferencias.mockResolvedValue({ caso_validado: { correo: false } });
    const res = await crear().despachar(job({ tipo: 'caso_validado' }));
    expect(correoAdaptador.enviar).not.toHaveBeenCalled();
    expect(res.canales).toEqual(['in_app']);
  });

  it('canal correo activo pero sin email en el perfil → se omite el correo', async () => {
    datosDestinatario.mockResolvedValue({ email: null, nombre: 'Ana' });
    const res = await crear().despachar(job({ tipo: 'caso_validado' }));
    expect(correoAdaptador.enviar).not.toHaveBeenCalled();
    expect(res.canales).toEqual(['in_app']);
    expect(insertarInApp.mock.calls[0][4]).toEqual(['in_app']);
  });

  it('in_app apagado pero correo activo: no persiste fila, sí envía correo', async () => {
    leerPreferencias.mockResolvedValue({ caso_validado: { in_app: false } });
    const res = await crear().despachar(job({ tipo: 'caso_validado' }));
    expect(insertarInApp).not.toHaveBeenCalled();
    expect(correoAdaptador.enviar).toHaveBeenCalledTimes(1);
    expect(res.notificacionId).toBeUndefined();
    expect(res.canales).toEqual(['correo']);
  });

  it('encolar() delega en la cola de notificaciones (buffer/retry por el worker)', async () => {
    await crear().encolar(job({ tipo: 'anuncio', titulo: 'Aviso', cuerpo: 'x' }));
    expect(colas.encolar).toHaveBeenCalledWith(
      'notificaciones',
      expect.objectContaining({ tipo: 'anuncio', titulo: 'Aviso' }),
    );
  });
});
