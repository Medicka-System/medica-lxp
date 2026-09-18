import type { Job } from 'bullmq';
import { QUEUE_ENVIO_XAPI, type IngestaGrabacionZoomJob } from '@campus/shared';
import { IngestaGrabacionZoomWorker } from './ingesta-grabacion-zoom.worker';
import type { DbService } from '../db/db.service';
import type { ColasProducer } from '../colas/colas-producer';

const JOB: IngestaGrabacionZoomJob = {
  videotecaId: 'vid-1',
  claseId: 'clase-1',
  refDestino: 'media/grabaciones/vid-1/original',
  urlDescargaZoom: 'https://zoom.us/rec/download/abc',
  tokenDescarga: 'tok-123',
  urlSubidaDestino: 'http://storage/put-firmado',
  docenteId: '33333333-3333-4333-8333-333333333333',
  titulo: 'Clase de prueba',
};

function job(data: IngestaGrabacionZoomJob): Job<IngestaGrabacionZoomJob> {
  return { data } as Job<IngestaGrabacionZoomJob>;
}

describe('IngestaGrabacionZoomWorker', () => {
  let sql: jest.Mock;
  let db: DbService;
  let encolar: jest.Mock;
  let colas: ColasProducer;

  beforeEach(() => {
    sql = jest.fn().mockResolvedValue([]);
    db = { sql } as unknown as DbService;
    encolar = jest.fn().mockResolvedValue('xapi-job');
    colas = { encolar } as unknown as ColasProducer;
  });

  afterEach(() => jest.restoreAllMocks());

  it('descarga de Zoom, sube a storage, marca listo y emite xAPI', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    const worker = new IngestaGrabacionZoomWorker(db, colas);
    const r = await worker.procesar(job(JOB));

    expect(r).toEqual({ videotecaId: 'vid-1', bytes: 4 });

    // Descarga con token, subida con PUT a la URL firmada.
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      JOB.urlDescargaZoom,
      expect.objectContaining({ headers: { Authorization: 'Bearer tok-123' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      JOB.urlSubidaDestino,
      expect.objectContaining({ method: 'PUT' }),
    );

    // Marcó la videoteca listo (al menos un UPDATE) y encoló el statement xAPI.
    expect(sql).toHaveBeenCalled();
    expect(encolar).toHaveBeenCalledWith(
      QUEUE_ENVIO_XAPI,
      expect.objectContaining({ statement: expect.objectContaining({ verb: expect.anything() }) }),
      expect.anything(),
    );
  });

  it('marca error y relanza si falla la descarga (BullMQ reintenta)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false, status: 403 } as Response);

    const worker = new IngestaGrabacionZoomWorker(db, colas);
    await expect(worker.procesar(job(JOB))).rejects.toThrow(/descargar/i);

    // Se marcó la videoteca en error (último UPDATE) y NO se emitió xAPI.
    expect(sql).toHaveBeenCalled();
    expect(encolar).not.toHaveBeenCalled();
  });
});
