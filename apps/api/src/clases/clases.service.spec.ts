import { ClasesService, type ZoomRecordingCompleted } from './clases.service';
import type { DbService } from '../db/db.service';
import type { ZoomService } from './zoom.service';
import type { StorageService } from '../dicom/storage.service';
import type { ColasProducer } from '../colas/colas-producer';

const CLASE = {
  id: 'clase-1',
  grupo_id: 'grupo-1',
  leccion_id: 'leccion-1',
  docente_id: 'doc-1',
  titulo: 'POCUS',
  estado: 'agendada',
  enlace_union: 'https://zoom.us/j/1',
  enlace_inicio: 'https://zoom.us/s/1?zak=x',
  reunion_externa_id: '999',
};

function dbCon(resultados: unknown[][]): { db: DbService; sql: jest.Mock } {
  let i = 0;
  // `sql` falso: mock invocable con `.json` (identidad) como postgres.js.
  const sql = Object.assign(jest.fn(() => Promise.resolve(resultados[i++] ?? [])), {
    json: (v: unknown) => v,
  });
  return { db: { sql } as unknown as DbService, sql };
}

const zoom = {} as ZoomService;
const storage = { firmarSubida: jest.fn(() => 'http://storage/put') } as unknown as StorageService;

describe('ClasesService.ingestarGrabacion', () => {
  beforeEach(() => jest.clearAllMocks());

  const evento: ZoomRecordingCompleted = {
    meetingId: '999',
    tokenDescarga: 'tok',
    archivos: [
      { tipo: 'CHAT', urlDescarga: 'https://zoom.us/rec/chat' },
      { tipo: 'MP4', urlDescarga: 'https://zoom.us/rec/mp4' },
    ],
  };

  it('resuelve la clase, pre-registra la grabación y encola la ingesta con el MP4', async () => {
    const { db } = dbCon([
      [CLASE], // cargarClasePorReunion
      [{ id: 'vid-1', grupo_id: 'grupo-1', leccion_id: 'leccion-1' }], // insertarGrabacionProcesando
    ]);
    const encolar = jest.fn().mockResolvedValue('job-1');
    const colas = { encolar } as unknown as ColasProducer;

    const svc = new ClasesService(db, zoom, storage, colas);
    const r = await svc.ingestarGrabacion(evento);

    expect(r.encolado).toBe(true);
    expect(r.videotecaId).toBe('vid-1');
    expect(storage.firmarSubida).toHaveBeenCalledWith('media/grabaciones/vid-1/original');
    const [cola, job] = encolar.mock.calls[0];
    expect(cola).toBe('ingesta-grabacion-zoom');
    expect(job.urlDescargaZoom).toBe('https://zoom.us/rec/mp4'); // eligió el MP4
    expect(job.urlSubidaDestino).toBe('http://storage/put');
  });

  it('ignora (sin error) una reunión desconocida', async () => {
    const { db } = dbCon([[]]); // cargarClasePorReunion → nada
    const encolar = jest.fn();
    const colas = { encolar } as unknown as ColasProducer;

    const svc = new ClasesService(db, zoom, storage, colas);
    const r = await svc.ingestarGrabacion(evento);

    expect(r.encolado).toBe(false);
    expect(r.motivo).toBe('reunion_desconocida');
    expect(encolar).not.toHaveBeenCalled();
  });
});
