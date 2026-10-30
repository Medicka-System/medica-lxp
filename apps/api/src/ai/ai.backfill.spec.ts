import { AiService } from './ai.service';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';

// Backfill de indexación RAG (§7A · GAP-B): recorre el corpus publicado y encola un job
// `indexar-rag` por fuente reusando `encolarIndexacion`. Verificamos que:
//   (a) encola N jobs por tipo con el fuenteTipo correcto,
//   (b) el conteo devuelto cuadra con el corpus,
//   (c) NO toca embeddings (encolar es solo Redis) — ni siquiera se inyecta el servicio.
describe('AiService.backfillIndexacion (GAP-B)', () => {
  function crear(corpus: { casos: string[]; rubricas: string[]; lecciones: string[] }) {
    // `db.sql` es un tagged-template: se invoca una vez por query, en orden
    // (casos → rúbricas → lecciones). Devolvemos filas {id} por llamada.
    const sql = jest
      .fn()
      .mockResolvedValueOnce(corpus.casos.map((id) => ({ id })))
      .mockResolvedValueOnce(corpus.rubricas.map((id) => ({ id })))
      .mockResolvedValueOnce(corpus.lecciones.map((id) => ({ id })));
    const db = { sql } as unknown as DbService;
    const encolar = jest.fn().mockResolvedValue('job-id');
    const colas = { encolar } as unknown as ColasProducer;
    const ai = new AiService(
      db,
      colas,
      {} as never, // embeddings — NO se usa en el backfill (no requiere embeddings vivo)
      {} as never, // pipeline
      {} as never, // tts
      {} as never, // config
      {} as never, // proveedores
      {} as never, // telemetria
    );
    return { ai, encolar };
  }

  it('encola un job por fuente publicada, con el fuenteTipo correcto, y reporta el conteo', async () => {
    const { ai, encolar } = crear({
      casos: ['c1', 'c2'],
      rubricas: ['r1'],
      lecciones: ['l1', 'l2', 'l3'],
    });

    const resumen = await ai.backfillIndexacion();

    expect(resumen).toEqual({ caso_biblioteca: 2, rubrica: 1, contenido: 3, total: 6 });
    expect(encolar).toHaveBeenCalledTimes(6);
    // El 2º argumento de encolar(QUEUE, job) es el IndexarRagJob.
    const jobs = encolar.mock.calls.map((c) => c[1]);
    expect(jobs).toContainEqual({ fuenteTipo: 'caso_biblioteca', fuenteId: 'c1' });
    expect(jobs).toContainEqual({ fuenteTipo: 'caso_biblioteca', fuenteId: 'c2' });
    expect(jobs).toContainEqual({ fuenteTipo: 'rubrica', fuenteId: 'r1' });
    expect(jobs).toContainEqual({ fuenteTipo: 'contenido', fuenteId: 'l3' });
  });

  it('corpus vacío → 0 jobs, sin tronar', async () => {
    const { ai, encolar } = crear({ casos: [], rubricas: [], lecciones: [] });
    const resumen = await ai.backfillIndexacion();
    expect(resumen).toEqual({ caso_biblioteca: 0, rubrica: 0, contenido: 0, total: 0 });
    expect(encolar).not.toHaveBeenCalled();
  });
});
