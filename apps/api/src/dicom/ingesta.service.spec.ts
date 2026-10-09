import { ConflictException, NotFoundException } from '@nestjs/common';
import { IngestaService } from './ingesta.service';
import { DbService } from '../db/db.service';
import { StorageService } from './storage.service';
import { ColasProducer } from '../colas/colas-producer';
import * as repo from './dicom.repositorio';

// Ingesta DICOM (§8/§9 · multi-serie): orquesta subida directa (URLs firmadas, una
// por fuente) + anonimización bloqueante. Mockeamos la BD/repo y el storage (signer);
// verificamos estados, el payload del job (fuentes) y que la lectura exige `anonimizado`.
jest.mock('./dicom.repositorio', () => ({
  cargarCaso: jest.fn(),
  marcarEstado: jest.fn(),
}));

const cargar = repo.cargarCaso as jest.Mock;
const marcar = repo.marcarEstado as jest.Mock;

function crear(): { svc: IngestaService; encolar: jest.Mock } {
  const db = { sql: {} } as unknown as DbService;
  const storage = {
    claveCrudo: (id: string, i: number) => `dicom/crudo/${id}/${i}`,
    claveAnonimizado: (id: string, i: number) => `dicom/casos/${id}/${i}.dcm`,
    claveThumbCaso: (id: string) => `media/imagenes/casos/${id}/thumb.jpg`,
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
  estudio_dicom_ref: 'dicom/casos/c1/0.dcm',
  estudio_series: [
    { series_uid: '1.2.3', modalidad: 'US', frames: 12, ref: 'dicom/casos/c1/0.dcm' },
    { series_uid: '1.2.4', modalidad: 'US', frames: 1, ref: 'dicom/casos/c1/1.dcm' },
  ],
};

describe('IngestaService', () => {
  beforeEach(() => {
    marcar.mockResolvedValue(undefined);
  });
  afterEach(() => jest.clearAllMocks());

  it('solicitarSubida firma un PUT por fuente y deja el caso pendiente', async () => {
    cargar.mockResolvedValue({ id: 'c1', estudio_estado: null, estudio_dicom_ref: null, estudio_series: [] });
    const { svc } = crear();
    const r = await svc.solicitarSubida('c1', 'bitacora_casos', [
      { indice: 0, esZip: false },
      { indice: 1, esZip: true },
    ]);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]!.refCrudo).toBe('dicom/crudo/c1/0');
    expect(r.items[0]!.urlSubida).toContain('sig=put');
    expect(r.items[1]!.esZip).toBe(true);
    expect(marcar).toHaveBeenCalledWith(expect.anything(), 'c1', 'pendiente', 'bitacora_casos');
  });

  it('solicitarSubida lanza NotFound si el caso no existe', async () => {
    cargar.mockResolvedValue(null);
    await expect(crear().svc.solicitarSubida('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('confirmarSubida marca recibido y encola procesar-dicom con las fuentes firmadas', async () => {
    cargar.mockResolvedValue({ id: 'c1', estudio_estado: 'pendiente', estudio_dicom_ref: null, estudio_series: [] });
    const { svc, encolar } = crear();
    const r = await svc.confirmarSubida('c1', 'bitacora_casos', [{ indice: 0, esZip: true }]);
    expect(marcar).toHaveBeenCalledWith(expect.anything(), 'c1', 'recibido', 'bitacora_casos');
    expect(r).toMatchObject({ encolado: true, jobId: 'job-1' });
    const [, job] = encolar.mock.calls[0];
    expect(job).toMatchObject({ casoId: 'c1', tabla: 'bitacora_casos' });
    expect(job.fuentes).toHaveLength(1);
    expect(job.fuentes[0]).toMatchObject({ indice: 0, refCrudo: 'dicom/crudo/c1/0', esZip: true });
    expect(job.fuentes[0].urlLecturaCrudo).toContain('sig=get');
    expect(job.fuentes[0].urlBorradoCrudo).toContain('sig=del');
  });

  it('firmarAnonimizados firma un PUT por serie', async () => {
    cargar.mockResolvedValue({ id: 'c1', estudio_estado: 'procesando', estudio_dicom_ref: null, estudio_series: [] });
    const r = await crear().svc.firmarAnonimizados('c1', 'bitacora_casos', 3);
    expect(r.destinos).toHaveLength(3);
    expect(r.destinos[2]).toMatchObject({ indice: 2, ref: 'dicom/casos/c1/2.dcm' });
    expect(r.destinos[0]!.urlSubida).toContain('sig=put');
    // Destino del thumb del caso (serie 0) bajo media/imagenes/* (familia B · §10).
    expect(r.thumb).toMatchObject({ ref: 'media/imagenes/casos/c1/thumb.jpg' });
    expect(r.thumb.urlSubida).toContain('sig=put');
  });

  it('urlLecturaEstudio firma la lectura de cada serie cuando está anonimizado', async () => {
    cargar.mockResolvedValue(casoAnon);
    const r = await crear().svc.urlLecturaEstudio('c1');
    expect(r.series).toHaveLength(2);
    expect(r.series[0]!.urlLectura).toContain('dicom/casos/c1/0.dcm');
    expect(r.series[1]!.urlLectura).toContain('dicom/casos/c1/1.dcm');
    expect(r.series[0]!.urlLectura).toContain('sig=get');
    expect(r.series[0]).toMatchObject({ frames: 12, modalidad: 'US' });
  });

  it('urlLecturaEstudio lanza 409 si el estudio aún no está anonimizado', async () => {
    cargar.mockResolvedValue({ ...casoAnon, estudio_estado: 'procesando', estudio_series: [] });
    await expect(crear().svc.urlLecturaEstudio('c1')).rejects.toBeInstanceOf(ConflictException);
  });
});
