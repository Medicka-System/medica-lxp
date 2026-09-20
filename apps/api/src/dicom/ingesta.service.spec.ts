import { ConflictException, NotFoundException } from '@nestjs/common';
import { IngestaService } from './ingesta.service';
import { DbService } from '../db/db.service';
import { StorageService } from './storage.service';
import { ColasProducer } from '../colas/colas-producer';
import * as repo from './dicom.repositorio';

// Ingesta DICOM (§8/§9): orquesta subida directa (URL firmada) + anonimización
// bloqueante. Mockeamos la BD/repo y el storage (signer); verificamos estados,
// el payload del job y que la lectura del estudio exige `anonimizado`.
jest.mock('./dicom.repositorio', () => ({
  cargarCaso: jest.fn(),
  marcarEstado: jest.fn(),
}));

const cargar = repo.cargarCaso as jest.Mock;
const marcar = repo.marcarEstado as jest.Mock;

function crear(): { svc: IngestaService; encolar: jest.Mock } {
  const db = { sql: {} } as unknown as DbService;
  const storage = {
    claveCrudo: (id: string) => `dicom/crudo/${id}/estudio.dcm`,
    claveAnonimizado: (id: string) => `dicom/casos/${id}/estudio.dcm`,
    firmarSubida: (k: string) => `https://minio/${k}?sig=put`,
    firmarLectura: (k: string) => `https://minio/${k}?sig=get`,
    firmarBorrado: (k: string) => `https://minio/${k}?sig=del`,
  } as unknown as StorageService;
  const encolar = jest.fn().mockResolvedValue('job-1');
  const colas = { encolar } as unknown as ColasProducer;
  return { svc: new IngestaService(db, storage, colas), encolar };
}

const casoAnon: repo.CasoEstudio = {
  id: 'c1',
  estudio_estado: 'anonimizado',
  estudio_dicom_ref: 'dicom/casos/c1/estudio.dcm',
  estudio_series: [{ series_uid: '1.2.3', modalidad: 'US', frames: 12 }],
};

describe('IngestaService', () => {
  beforeEach(() => {
    marcar.mockResolvedValue(undefined);
  });
  afterEach(() => jest.clearAllMocks());

  it('solicitarSubida firma el PUT del crudo y deja el caso pendiente', async () => {
    cargar.mockResolvedValue({ id: 'c1', estudio_estado: null, estudio_dicom_ref: null, estudio_series: [] });
    const { svc } = crear();
    const r = await svc.solicitarSubida('c1');
    expect(r.refCrudo).toBe('dicom/crudo/c1/estudio.dcm');
    expect(r.urlSubida).toContain('sig=put');
    expect(marcar).toHaveBeenCalledWith(expect.anything(), 'c1', 'pendiente');
  });

  it('solicitarSubida lanza NotFound si el caso no existe', async () => {
    cargar.mockResolvedValue(null);
    await expect(crear().svc.solicitarSubida('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('confirmarSubida marca recibido y encola procesar-dicom con las 5 URLs firmadas', async () => {
    cargar.mockResolvedValue({ id: 'c1', estudio_estado: 'pendiente', estudio_dicom_ref: null, estudio_series: [] });
    const { svc, encolar } = crear();
    const r = await svc.confirmarSubida('c1');
    expect(marcar).toHaveBeenCalledWith(expect.anything(), 'c1', 'recibido');
    expect(r).toMatchObject({ encolado: true, jobId: 'job-1' });
    const [, job] = encolar.mock.calls[0];
    expect(job).toMatchObject({
      casoId: 'c1',
      refCrudo: 'dicom/crudo/c1/estudio.dcm',
      refAnonimizado: 'dicom/casos/c1/estudio.dcm',
    });
    expect(job.urlLecturaCrudo).toContain('sig=get');
    expect(job.urlSubidaAnonimizado).toContain('sig=put');
    expect(job.urlBorradoCrudo).toContain('sig=del');
  });

  it('urlLecturaEstudio firma la lectura y devuelve las series cuando está anonimizado', async () => {
    cargar.mockResolvedValue(casoAnon);
    const r = await crear().svc.urlLecturaEstudio('c1');
    expect(r.urlLectura).toContain('dicom/casos/c1/estudio.dcm');
    expect(r.urlLectura).toContain('sig=get');
    expect(r.series[0]).toMatchObject({ frames: 12, modalidad: 'US' });
  });

  it('urlLecturaEstudio lanza 409 si el estudio aún no está anonimizado', async () => {
    cargar.mockResolvedValue({ ...casoAnon, estudio_estado: 'procesando', estudio_dicom_ref: null });
    await expect(crear().svc.urlLecturaEstudio('c1')).rejects.toBeInstanceOf(ConflictException);
  });
});
