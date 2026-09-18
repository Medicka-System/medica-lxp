import { H5pService } from './h5p.service';
import * as repo from './h5p.repositorio';

jest.mock('./h5p.repositorio', () => ({
  registrarContenidoH5p: jest.fn(),
}));
const registrar = repo.registrarContenidoH5p as jest.Mock;

function crear(saveResult = 'cid-1') {
  const editor = { saveOrUpdateContent: jest.fn().mockResolvedValue(saveResult) };
  const svc = new H5pService({ sql: {} } as never);
  // Evita construir el H5P server real (fs/librerías) en el test.
  jest.spyOn(svc as unknown as { motor: () => unknown }, 'motor').mockReturnValue({
    editor,
    player: {},
    ajax: {},
  });
  return { svc, editor };
}

describe('H5pService (montaje H5P server · §7)', () => {
  afterEach(() => jest.clearAllMocks());

  it('usuario() arma un IUser H5P válido', () => {
    const u = H5pService.usuario('u1', 'Ana');
    expect(u).toEqual({ id: 'u1', name: 'Ana', email: 'u1@campus.local', type: 'local' });
  });

  it('guardarContenido: guarda en el H5P server y ENLAZA a la lección', async () => {
    registrar.mockResolvedValue({ id: 'x' });
    const { svc, editor } = crear('cid-1');
    const usuario = H5pService.usuario('studio');

    const r = await svc.guardarContenido({
      library: 'H5P.Blanks 1.14',
      params: { text: 'hola' },
      metadata: { title: 'Rellenar huecos' },
      usuario,
      leccionId: '00000000-0000-0000-0000-000000000009',
    });

    expect(editor.saveOrUpdateContent).toHaveBeenCalledWith(
      undefined,
      { text: 'hola' },
      { title: 'Rellenar huecos' },
      'H5P.Blanks 1.14',
      usuario,
    );
    expect(registrar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ contentId: 'cid-1', titulo: 'Rellenar huecos' }),
    );
    expect(r).toEqual({ contentId: 'cid-1', registrado: true });
  });

  it('guardarContenido sin leccionId: guarda pero NO enlaza', async () => {
    const { svc } = crear('cid-2');
    const r = await svc.guardarContenido({
      library: 'H5P.Blanks 1.14',
      params: {},
      metadata: {},
      usuario: H5pService.usuario('studio'),
    });
    expect(registrar).not.toHaveBeenCalled();
    expect(r).toEqual({ contentId: 'cid-2', registrado: false });
  });

  it('actualiza contenido existente (pasa el contentId al H5P server)', async () => {
    const { svc, editor } = crear('cid-3');
    await svc.guardarContenido({
      contentId: 'cid-3',
      library: 'H5P.Blanks 1.14',
      params: {},
      metadata: {},
      usuario: H5pService.usuario('studio'),
    });
    expect(editor.saveOrUpdateContent).toHaveBeenCalledWith(
      'cid-3',
      expect.anything(),
      expect.anything(),
      'H5P.Blanks 1.14',
      expect.anything(),
    );
  });
});
