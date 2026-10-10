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
  thumb: revisionManual ? null : Buffer.from([9, 9, 9]),
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
    const firmar = (w.firmarAnonimizados = jest.fn(async () => ({
      destinos: [{ indice: 0, urlSubida: 'http://put', ref: 'dicom/casos/caso-1/0.dcm' }],
      thumb: { ref: 'media/imagenes/casos/caso-1/thumb.jpg', urlSubida: 'http://put-thumb' },
    })));
    const subir = (w.subirBinario = jest.fn());
    const guardar = (w.guardarEstudio = jest.fn());
    w.borrarCrudo = jest.fn(async () => undefined);

    const res = await worker.procesar(job);

    expect(firmar).toHaveBeenCalledTimes(1);
    // 2 subidas: la serie 0 (.dcm) + el thumb (reemplazo con thumb presente).
    expect(subir).toHaveBeenCalledTimes(2);
    expect(guardar).toHaveBeenCalledTimes(1); // se persiste como 'anonimizado'
    expect(res).toEqual({ casoId: 'caso-1', series: 1 });
  });
});

describe('ProcesarDicomWorker · redactarPixeles (contrato MULTIPART)', () => {
  const llamar = (resp: Response) => {
    const { worker } = nuevoWorker();
    (globalThis as { fetch: unknown }).fetch = jest.fn(async () => resp);
    return (worker as unknown as { redactarPixeles: (b: Buffer, ct: string) => Promise<{ buffer: Buffer; thumb: Buffer | null; revisionManual: boolean; redacciones: number }> })
      .redactarPixeles(Buffer.from([1, 2, 3]), 'application/dicom');
  };

  it('ÉXITO: parsea el multipart → `bin` (redactado) + `thumb` (JPEG)', async () => {
    const fd = new FormData();
    fd.set('bin', new Blob([new Uint8Array([9, 9, 9, 9])], { type: 'application/dicom' }), 'bin');
    fd.set('thumb', new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }), 'thumb');
    const resp = new Response(fd, { headers: { 'x-redacciones': '1', 'x-revision-manual': '0' } });
    const r = await llamar(resp);
    expect(r.revisionManual).toBe(false);
    expect([...r.buffer]).toEqual([9, 9, 9, 9]);
    expect(r.thumb && [...r.thumb]).toEqual([0xff, 0xd8, 0xff]);
  });

  it('ÉXITO sin parte thumb → thumb null (best-effort, placeholder)', async () => {
    const fd = new FormData();
    fd.set('bin', new Blob([new Uint8Array([1, 2])], { type: 'application/dicom' }), 'bin');
    const resp = new Response(fd, { headers: { 'x-redacciones': '1', 'x-revision-manual': '0' } });
    const r = await llamar(resp);
    expect(r.thumb).toBeNull();
    expect([...r.buffer]).toEqual([1, 2]);
  });

  it('CUARENTENA: X-Revision-Manual=1 → no parsea, buffer vacío, thumb null (fail-closed)', async () => {
    const resp = new Response('', { headers: { 'x-redacciones': '0', 'x-revision-manual': '1' } });
    const r = await llamar(resp);
    expect(r.revisionManual).toBe(true);
    expect(r.buffer.length).toBe(0);
    expect(r.thumb).toBeNull();
  });
});
