import AdmZip from 'adm-zip';
import { PaquetesService } from './paquetes.service';
import * as repo from './paquetes.repositorio';

jest.mock('./paquetes.repositorio', () => ({
  insertarContenidoPaquete: jest.fn(),
}));
const insertar = repo.insertarContenidoPaquete as jest.Mock;

const SCORM = `<manifest identifier="C1">
  <metadata><schemaversion>1.2</schemaversion></metadata>
  <organizations default="O"><organization identifier="O"><title>Curso demo</title></organization></organizations>
  <resources><resource identifier="R" href="index.html"/></resources>
</manifest>`;

function zipScorm(pathManifest = 'imsmanifest.xml'): Buffer {
  const zip = new AdmZip();
  zip.addFile(pathManifest, Buffer.from(SCORM, 'utf8'));
  zip.addFile('index.html', Buffer.from('<html></html>', 'utf8'));
  return zip.toBuffer();
}

function crear() {
  const storage = { firmarSubida: jest.fn().mockReturnValue('https://storage.local/put') };
  const db = { sql: {} };
  const svc = new PaquetesService(db as never, storage as never);
  return { svc, storage };
}

describe('PaquetesService (ingesta SCORM/xAPI · §7)', () => {
  afterEach(() => jest.clearAllMocks());

  it('descomprime, valida, SUBE el zip y registra el contenido tipo scorm', async () => {
    insertar.mockResolvedValue({
      id: 'cid',
      leccion_id: 'lec',
      tipo: 'scorm',
      titulo: 'Curso demo',
      recurso_ref: 'media/paquetes/cid/paquete.zip',
      orden: 0,
    });
    const { svc, storage } = crear();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, text: async () => '' } as never);

    const r = await svc.ingestar(zipScorm(), { leccionId: 'lec' });

    expect(storage.firmarSubida).toHaveBeenCalledWith(expect.stringMatching(/^media\/paquetes\/.+\/paquete\.zip$/));
    expect(fetchMock).toHaveBeenCalledWith('https://storage.local/put', expect.objectContaining({ method: 'PUT' }));
    expect(insertar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tipo: 'scorm', leccionId: 'lec', titulo: 'Curso demo' }),
    );
    expect(r).toEqual({
      contenidoId: 'cid',
      tipo: 'scorm',
      titulo: 'Curso demo',
      entryPoint: 'index.html',
      recursoRef: expect.stringMatching(/^media\/paquetes\/.+\/paquete\.zip$/),
    });
    fetchMock.mockRestore();
  });

  it('modo Biblioteca (sin leccionId): valida + sube pero NO registra en lección', async () => {
    const { svc, storage } = crear();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, text: async () => '' } as never);

    const r = await svc.ingestar(zipScorm(), {});

    expect(storage.firmarSubida).toHaveBeenCalled();
    expect(insertar).not.toHaveBeenCalled(); // sin lección → no toca lxp.contenidos
    expect(r.tipo).toBe('scorm');
    expect(r.titulo).toBe('Curso demo');
    expect(r.recursoRef).toMatch(/^media\/paquetes\/.+\/paquete\.zip$/);
    fetchMock.mockRestore();
  });

  it('encuentra el manifiesto aunque esté en un subdirectorio', async () => {
    insertar.mockResolvedValue({ id: 'c', leccion_id: 'l', tipo: 'scorm', titulo: 'Curso demo', recurso_ref: 'x', orden: 0 });
    const { svc } = crear();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, text: async () => '' } as never);

    const r = await svc.ingestar(zipScorm('contenido/imsmanifest.xml'), { leccionId: 'l' });
    expect(r.tipo).toBe('scorm');
    fetchMock.mockRestore();
  });

  it('rechaza un .zip sin manifiesto (BadRequest)', async () => {
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from('x'));
    const { svc } = crear();
    await expect(svc.ingestar(zip.toBuffer(), { leccionId: 'l' })).rejects.toThrow(/manifiesto|imsmanifest/i);
    expect(insertar).not.toHaveBeenCalled();
  });

  it('rechaza un buffer que no es zip', async () => {
    const { svc } = crear();
    await expect(svc.ingestar(Buffer.from('no soy un zip'), { leccionId: 'l' })).rejects.toThrow();
  });
});
