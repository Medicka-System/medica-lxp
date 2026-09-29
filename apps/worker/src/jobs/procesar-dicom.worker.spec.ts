import type { Job } from 'bullmq';
import { ProcesarDicomWorker } from './procesar-dicom.worker';
import type { ProcesarDicomJob } from '@campus/shared';

/**
 * Regresión §10 (fail-CLOSED del worker): si el redactor NO garantiza la redacción de PII
 * quemada (`revisionManual`), el estudio se pone en CUARENTENA — NO se sube ni se marca
 * 'anonimizado'; se marca 'revision_manual' y se descartan los crudos. El opuesto (redacción
 * ok) sí publica. Esto impide que un leak vuelva a colarse en silencio.
 */

type SqlCall = { texto: string; valores: unknown[] };

function nuevoWorker() {
  const calls: SqlCall[] = [];
  const sql = ((strings: TemplateStringsArray, ...valores: unknown[]) => {
    calls.push({ texto: strings.join('?'), valores });
    return Promise.resolve([] as unknown[]);
  }) as unknown as { (): Promise<unknown[]> };
  const worker = new ProcesarDicomWorker({ sql } as never);
  return { worker, calls };
}

const serie = (revisionManual: boolean) => ({
  tipo: 'dicom' as const,
  ext: 'dcm',
  buffer: Buffer.from([1, 2, 3]),
  series_uid: 'S1',
  modalidad: 'US',
  frames: 1,
  instancias: 1,
  pixel_spacing: null,
  region: null,
  campos_removidos: ['PatientName'],
  removidos_n: 1,
  redacciones: revisionManual ? 0 : 1,
  revisionManual,
});

const job = {
  data: {
    casoId: 'caso-1',
    tabla: 'bitacora_casos',
    fuentes: [{ urlLecturaCrudo: 'http://crudo', urlBorradoCrudo: 'http://borrar' }],
    anexar: false,
  } as ProcesarDicomJob,
} as Job<ProcesarDicomJob>;

function estados(calls: SqlCall[]): unknown[] {
  // marcarEstado hace: update ... set estudio_estado = ${estado} where id = ${casoId}
  return calls
    .filter((c) => c.texto.includes('set estudio_estado'))
    .map((c) => c.valores[0]);
}

describe('ProcesarDicomWorker · cuarentena §10 (fail-closed)', () => {
  it('CUARENTENA: revisionManual → no sube, no anonimiza, marca revision_manual y borra el crudo', async () => {
    const { worker, calls } = nuevoWorker();
    const w = worker as unknown as Record<string, unknown>;
    w.leerBinario = jest.fn(async () => new ArrayBuffer(8)); // no zip/jpg/png → dicom
    w.procesarDicom = jest.fn(async () => serie(true));
    const firmar = (w.firmarAnonimizados = jest.fn());
    const subir = (w.subirBinario = jest.fn());
    const guardar = (w.guardarEstudio = jest.fn());
    const borrar = (w.borrarCrudo = jest.fn(async () => undefined));

    const res = await worker.procesar(job);

    expect(firmar).not.toHaveBeenCalled();
    expect(subir).not.toHaveBeenCalled();
    expect(guardar).not.toHaveBeenCalled(); // NUNCA se marca 'anonimizado'
    expect(borrar).toHaveBeenCalledTimes(1); // PII fuera del storage
    expect(estados(calls)).toContain('revision_manual');
    expect(estados(calls)).not.toContain('anonimizado');
    expect(res).toEqual({ casoId: 'caso-1', series: 0 });
  });

  it('OK: redacción garantizada → firma, sube y persiste el estudio anonimizado', async () => {
    const { worker } = nuevoWorker();
    const w = worker as unknown as Record<string, unknown>;
    w.leerBinario = jest.fn(async () => new ArrayBuffer(8));
    w.procesarDicom = jest.fn(async () => serie(false));
    const firmar = (w.firmarAnonimizados = jest.fn(async () => [
      { urlSubida: 'http://put', ref: 'dicom/casos/caso-1/0.dcm' },
    ]));
    const subir = (w.subirBinario = jest.fn());
    const guardar = (w.guardarEstudio = jest.fn());
    w.borrarCrudo = jest.fn(async () => undefined);

    const res = await worker.procesar(job);

    expect(firmar).toHaveBeenCalledTimes(1);
    expect(subir).toHaveBeenCalledTimes(1);
    expect(guardar).toHaveBeenCalledTimes(1); // se persiste como 'anonimizado'
    expect(res).toEqual({ casoId: 'caso-1', series: 1 });
  });
});
