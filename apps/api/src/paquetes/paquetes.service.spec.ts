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
  const storage = {
    firmarSubida: jest.fn().mockReturnValue('https://storage.local/put'),
    firmarLectura: jest.fn().mockReturnValue('https://storage.local/get-zip'),
    clavePaqueteExtraido: jest.fn((id: string, name: string) => `media/paquetes-extraidos/${id}/${name}`),
    urlPublicaEntryPoint: jest.fn((id: string, entry: string) => `https://cdn.local/bucket/media/paquetes-extraidos/${id}/${entry}`),
    listarPrefijo: jest.fn(async () => [] as string[]),
    basePaqueteExtraido: jest.fn((id: string) => `media/paquetes-extraidos/${id}/`),
    borrarPrefijo: jest.fn(async () => 0),
  };
  const db = { sql: {} };
  const colas = { encolar: jest.fn().mockResolvedValue('job-1') };
  const svc = new PaquetesService(db as never, storage as never, colas as never);
  return { svc, storage, colas };
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
    const { svc, storage, colas } = crear();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, text: async () => '' } as never);

    const r = await svc.ingestar(zipScorm(), { leccionId: 'lec' });

    expect(storage.firmarSubida).toHaveBeenCalledWith(expect.stringMatching(/^media\/paquetes\/.+\/paquete\.zip$/));
    // Encola la extracción asíncrona al prefijo público (worker · Pieza 1).
    expect(colas.encolar).toHaveBeenCalledWith(
      'extraer-paquete',
      expect.objectContaining({ contenidoId: expect.any(String) }),
    );
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

  it('firmarExtraccion sin entryNames: solo firma el GET del .zip', () => {
    const { svc, storage } = crear();
    const r = svc.firmarExtraccion('cid', []);
    expect(storage.firmarLectura).toHaveBeenCalledWith('media/paquetes/cid/paquete.zip');
    expect(r.urlLecturaZip).toBe('https://storage.local/get-zip');
    expect(r.subidas).toEqual([]);
  });

  it('firmarExtraccion con entryNames: firma un PUT por archivo bajo el prefijo público', () => {
    const { svc, storage } = crear();
    const r = svc.firmarExtraccion('cid', ['index.html', 'assets/app.js']);
    expect(storage.clavePaqueteExtraido).toHaveBeenCalledWith('cid', 'index.html');
    expect(storage.clavePaqueteExtraido).toHaveBeenCalledWith('cid', 'assets/app.js');
    expect(r.subidas).toEqual([
      { entryName: 'index.html', url: 'https://storage.local/put' },
      { entryName: 'assets/app.js', url: 'https://storage.local/put' },
    ]);
  });

  it('resolverLanzador: listo=true cuando el entryPoint YA existe en storage', async () => {
    const { svc, storage } = crear();
    storage.listarPrefijo.mockResolvedValue(['media/paquetes-extraidos/cid/index.html']);
    const r = await svc.resolverLanzador('cid', 'index.html');
    expect(storage.urlPublicaEntryPoint).toHaveBeenCalledWith('cid', 'index.html');
    expect(r.lanzadorUrl).toBe('https://cdn.local/bucket/media/paquetes-extraidos/cid/index.html');
    expect(r.listo).toBe(true);
  });

  it('resolverLanzador: listo=false mientras el worker aún no deposita el entryPoint', async () => {
    const { svc, storage } = crear();
    storage.listarPrefijo.mockResolvedValue([]); // extracción aún no termina
    const r = await svc.resolverLanzador('cid', 'index.html');
    expect(r.listo).toBe(false);
    expect(r.lanzadorUrl).toContain('/media/paquetes-extraidos/cid/index.html');
  });

  it('solicitarBorrado: encola el job borrar-paquete (no borra en el request)', async () => {
    const { svc, colas, storage } = crear();
    const r = await svc.solicitarBorrado('cid');
    expect(colas.encolar).toHaveBeenCalledWith('borrar-paquete', { contenidoId: 'cid' });
    expect(storage.borrarPrefijo).not.toHaveBeenCalled();
    expect(r).toEqual({ encolado: true });
  });

  it('purgarPaquete: borra AMBOS prefijos (zip privado + árbol extraído)', async () => {
    const { svc, storage } = crear();
    storage.borrarPrefijo.mockResolvedValueOnce(1).mockResolvedValueOnce(4);
    const r = await svc.purgarPaquete('cid');
    expect(storage.borrarPrefijo).toHaveBeenCalledWith('media/paquetes/cid/');
    expect(storage.borrarPrefijo).toHaveBeenCalledWith('media/paquetes-extraidos/cid/');
    expect(r).toEqual({ zip: 1, extraido: 4 });
  });
});
