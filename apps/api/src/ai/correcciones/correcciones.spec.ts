import { ConflictException, NotFoundException } from '@nestjs/common';
import { CorreccionesService } from './correcciones.service';
import { DbService } from '../../db/db.service';
import * as propRepo from '../pipeline/propuestas.repositorio';
import * as corrRepo from './correcciones.repositorio';

// El cierre humano (§7A: "Eco propone, el humano decide"). Mockeamos la BD y
// verificamos que: (a) nada se asienta sin humano, (b) SIEMPRE se registra la
// corrección docente→Eco (loop de mejora), (c) no se puede confirmar dos veces.
jest.mock('../pipeline/propuestas.repositorio', () => ({
  cargarPropuesta: jest.fn(),
  marcarPropuesta: jest.fn(),
}));
jest.mock('./correcciones.repositorio', () => ({
  asentarEntrega: jest.fn(),
  registrarCorreccion: jest.fn(),
}));

const cargar = propRepo.cargarPropuesta as jest.Mock;
const marcar = propRepo.marcarPropuesta as jest.Mock;
const asentar = corrRepo.asentarEntrega as jest.Mock;
const registrar = corrRepo.registrarCorreccion as jest.Mock;

function crear(): CorreccionesService {
  const db = { sql: {} } as unknown as DbService;
  return new CorreccionesService(db);
}

const propEntrega = {
  id: 'p1',
  objeto_tipo: 'entrega' as const,
  objeto_id: 'e1',
  id_alumno: 'a1',
  nota_sugerida: 80,
  feedback_borrador: 'Borrador de Eco.',
  estado: 'propuesta',
  detalle: {},
};

describe('CorreccionesService (Eco propone, el humano decide · §7A)', () => {
  beforeEach(() => {
    registrar.mockResolvedValue({ correccionId: 'corr-1' });
    marcar.mockResolvedValue(undefined);
    asentar.mockResolvedValue(undefined);
  });
  afterEach(() => jest.clearAllMocks());

  it('confirmar SIN cambios: asienta la nota sugerida y registra la corrección', async () => {
    cargar.mockResolvedValue(propEntrega);
    const res = await crear().confirmar('p1', 'doc-1', {});

    expect(asentar).toHaveBeenCalledWith(expect.anything(), {
      entregaId: 'e1',
      nota: 80,
      feedback: 'Borrador de Eco.',
    });
    // El loop de mejora se registra SIEMPRE (aceptar tal cual también es señal).
    expect(registrar).toHaveBeenCalledTimes(1);
    expect(res.hubocorreccion).toBe(false);
    expect(res.notaAsentada).toBe(80);
    expect(marcar).toHaveBeenCalledWith(expect.anything(), 'p1', 'confirmada');
  });

  it('confirmar CON cambios: asienta la nota del docente y marca corrección', async () => {
    cargar.mockResolvedValue(propEntrega);
    const res = await crear().confirmar('p1', 'doc-1', { nota: 95, feedback: 'Mejor así.' });

    expect(asentar).toHaveBeenCalledWith(expect.anything(), {
      entregaId: 'e1',
      nota: 95,
      feedback: 'Mejor así.',
    });
    expect(res.hubocorreccion).toBe(true);
    // La corrección captura sugerencia (80) vs lo dejado (95).
    expect(registrar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sugerenciaEco: expect.objectContaining({ nota: 80 }),
        correccion: expect.objectContaining({ nota: 95 }),
      }),
    );
  });

  it('propuesta de CASO: NO asienta nota (eso es validación clínica), pero registra', async () => {
    cargar.mockResolvedValue({ ...propEntrega, objeto_tipo: 'caso', objeto_id: 'caso-1' });
    const res = await crear().confirmar('p1', 'doc-1', {});

    expect(asentar).not.toHaveBeenCalled();
    expect(registrar).toHaveBeenCalledTimes(1);
    expect(res.notaAsentada).toBeNull();
  });

  it('no confirma una propuesta ya resuelta (conflicto)', async () => {
    cargar.mockResolvedValue({ ...propEntrega, estado: 'confirmada' });
    await expect(crear().confirmar('p1', 'doc-1', {})).rejects.toBeInstanceOf(ConflictException);
    expect(asentar).not.toHaveBeenCalled();
  });

  it('propuesta inexistente → 404', async () => {
    cargar.mockResolvedValue(null);
    await expect(crear().confirmar('nope', 'doc-1', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
