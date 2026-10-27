import type { Job } from 'bullmq';
import { BorrarPaqueteWorker } from './borrar-paquete.worker';

/**
 * Pieza 1 · §7: el worker dispara la purga de storage (`POST /paquetes/:id/purgar`) y
 * reporta cuántas claves borró. El `api` es la autoridad de storage; aquí se mockea fetch.
 */

const job = { data: { contenidoId: 'cid-9' } } as Job<{ contenidoId: string }>;

describe('BorrarPaqueteWorker · purga de ambos prefijos (Pieza 1)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('llama a /purgar y devuelve los conteos del api', async () => {
    const worker = new BorrarPaqueteWorker();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ zip: 1, extraido: 4 }) } as never);

    const res = await worker.procesar(job);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/paquetes\/cid-9\/purgar$/),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res).toEqual({ contenidoId: 'cid-9', zip: 1, extraido: 4 });
  });

  it('lanza si el api falla (BullMQ reintentará)', async () => {
    const worker = new BorrarPaqueteWorker();
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as never);
    await expect(worker.procesar(job)).rejects.toThrow(/no pudo purgar/i);
  });
});
