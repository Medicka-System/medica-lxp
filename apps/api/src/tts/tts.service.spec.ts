import { QUEUE_RENDER_TTS } from '@campus/shared';
import { TtsService } from './tts.service';
import type { TTSProvider } from './proveedores/tts-proveedor.interface';
import type { TtsConfig } from './config/tts-config.tipos';
import * as repo from './tts.repositorio';
import type { FilaAudio } from './tts.repositorio';

jest.mock('./tts.repositorio', () => ({
  insertarAudioProcesando: jest.fn(),
  cargarAudio: jest.fn(),
  marcarAudioListo: jest.fn(),
  marcarAudioError: jest.fn(),
}));

const insertar = repo.insertarAudioProcesando as jest.Mock;
const cargar = repo.cargarAudio as jest.Mock;
const marcarListo = repo.marcarAudioListo as jest.Mock;
const marcarError = repo.marcarAudioError as jest.Mock;

const CONFIG: TtsConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  nombre: 'tts-default',
  activo: true,
  proveedor: 'openai',
  modelo: 'tts-1',
  voz: 'nova',
  velocidad: 1,
  formato: 'mp3',
};

function filaAudio(over: Partial<FilaAudio> = {}): FilaAudio {
  return {
    id: 'a1',
    contenido_id: null,
    texto: 'Hola',
    proveedor: 'openai',
    modelo: 'tts-1',
    voz: 'nova',
    velocidad: 1,
    formato: 'mp3',
    estado: 'procesando',
    recurso_ref: null,
    duracion_seg: null,
    error: null,
    ...over,
  };
}

function crear(provider: TTSProvider) {
  const colas = { encolar: jest.fn().mockResolvedValue('job-1') };
  const storage = {
    firmarSubida: jest.fn().mockReturnValue('https://storage.local/put'),
    firmarLectura: jest.fn().mockReturnValue('https://storage.local/get'),
  };
  const config = { activa: jest.fn().mockResolvedValue(CONFIG) };
  const factory = { obtener: jest.fn().mockReturnValue(provider) };
  const db = { sql: {} };
  const svc = new TtsService(
    db as never,
    storage as never,
    colas as never,
    config as never,
    factory as never,
  );
  return { svc, colas, storage, config, factory };
}

const fakeProvider = (): TTSProvider => ({
  nombre: 'fake',
  sintetizar: jest.fn().mockResolvedValue({
    audio: Buffer.from('AUDIO'),
    mime: 'audio/mpeg',
    proveedor: 'fake',
    formato: 'mp3',
  }),
});

describe('TtsService (orquestación · §3)', () => {
  afterEach(() => jest.clearAllMocks());

  it('solicitarRender: usa la config activa, pre-registra y ENCOLA el render', async () => {
    insertar.mockResolvedValue(filaAudio());
    const { svc, colas, config } = crear(fakeProvider());

    const r = await svc.solicitarRender({ texto: 'Hola' });

    expect(config.activa).toHaveBeenCalled();
    expect(insertar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ proveedor: 'openai', voz: 'nova', modelo: 'tts-1' }),
    );
    expect(colas.encolar).toHaveBeenCalledWith(
      QUEUE_RENDER_TTS,
      { audioId: 'a1' },
      expect.anything(),
    );
    expect(r).toEqual({ audioId: 'a1', estado: 'procesando', proveedor: 'openai', voz: 'nova' });
  });

  it('solicitarRender: los overrides puntuales pisan la config activa', async () => {
    insertar.mockResolvedValue(filaAudio({ voz: 'echo', formato: 'wav' }));
    const { svc } = crear(fakeProvider());

    await svc.solicitarRender({ texto: 'Hola', voz: 'echo', formato: 'wav' });

    expect(insertar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ voz: 'echo', formato: 'wav' }),
    );
  });

  it('render: sintetiza, SUBE a object storage y marca listo', async () => {
    cargar.mockResolvedValue(filaAudio());
    marcarListo.mockResolvedValue(filaAudio({ estado: 'listo', recurso_ref: 'x' }));
    const provider = fakeProvider();
    const { svc, storage } = crear(provider);

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, text: async () => '' } as never);

    const r = await svc.render('a1');

    expect(provider.sintetizar).toHaveBeenCalledWith(
      expect.objectContaining({ texto: 'Hola', voz: 'nova', formato: 'mp3' }),
    );
    expect(storage.firmarSubida).toHaveBeenCalledWith('media/tts/a1/audio.mp3');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.local/put',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(marcarListo).toHaveBeenCalledWith(expect.anything(), 'a1', 'media/tts/a1/audio.mp3');
    expect(r.estado).toBe('listo');
    fetchMock.mockRestore();
  });

  it('render: si la subida falla, marca error y RELANZA (para reintento)', async () => {
    cargar.mockResolvedValue(filaAudio());
    const { svc } = crear(fakeProvider());
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' } as never);

    await expect(svc.render('a1')).rejects.toThrow();
    expect(marcarError).toHaveBeenCalledWith(expect.anything(), 'a1', expect.stringContaining('500'));
    fetchMock.mockRestore();
  });

  it('render: idempotente si ya está listo (no re-sintetiza)', async () => {
    cargar.mockResolvedValue(filaAudio({ estado: 'listo', recurso_ref: 'media/tts/a1/audio.mp3' }));
    const provider = fakeProvider();
    const { svc } = crear(provider);

    const r = await svc.render('a1');

    expect(provider.sintetizar).not.toHaveBeenCalled();
    expect(r.estado).toBe('listo');
  });
});
