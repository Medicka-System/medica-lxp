import type { Job } from 'bullmq';
import AdmZip from 'adm-zip';
import { ExtraerPaqueteWorker } from './extraer-paquete.worker';

/**
 * Pieza 1 · §7: el worker descomprime el .zip y sube CADA archivo al prefijo público
 * preservando su ruta relativa, con content-type por extensión. El `api` firma todo
 * (worker→servicio); aquí se mockea para probar el flujo de extracción aislado.
 */

function zipDemo(): Buffer {
  const zip = new AdmZip();
  zip.addFile('index.html', Buffer.from('<html>hola</html>', 'utf8'));
  zip.addFile('assets/app.js', Buffer.from('console.log(1)', 'utf8'));
  zip.addFile('styles/main.css', Buffer.from('body{}', 'utf8'));
  return zip.toBuffer();
}

const job = { data: { contenidoId: 'cid-1' } } as Job<{ contenidoId: string }>;

describe('ExtraerPaqueteWorker · extracción al prefijo público (Pieza 1)', () => {
  it('sube cada archivo preservando rutas relativas y content-type por extensión', async () => {
    const worker = new ExtraerPaqueteWorker();
    const w = worker as unknown as Record<string, unknown>;

    w.leerBinario = jest.fn(async () => zipDemo());
    w.firmarExtraccion = jest.fn(async (_id: string, entryNames: string[]) => ({
      urlLecturaZip: 'http://api/get-zip',
      subidas: entryNames.map((entryName) => ({ entryName, url: `http://put/${entryName}` })),
    }));
    const subidas: Array<{ url: string; contentType: string }> = [];
    w.subirBinario = jest.fn(async (url: string, _buf: Buffer, contentType: string) => {
      subidas.push({ url, contentType });
    });

    const res = await worker.procesar(job);

    expect(res).toEqual({ contenidoId: 'cid-1', subidos: 3, total: 3 });
    // Fase 1 (sin nombres) + fase 2 (con los 3 nombres; el orden del zip es indiferente).
    expect((w.firmarExtraccion as jest.Mock).mock.calls[0][1]).toEqual([]);
    expect((w.firmarExtraccion as jest.Mock).mock.calls[1][1]).toEqual(
      expect.arrayContaining(['index.html', 'assets/app.js', 'styles/main.css']),
    );
    expect((w.firmarExtraccion as jest.Mock).mock.calls[1][1]).toHaveLength(3);
    // Rutas relativas preservadas en el PUT firmado + content-type por extensión.
    const porUrl = new Map(subidas.map((s) => [s.url, s.contentType]));
    expect(porUrl.get('http://put/index.html')).toMatch(/^text\/html/);
    expect(porUrl.get('http://put/assets/app.js')).toMatch(/^text\/javascript/);
    expect(porUrl.get('http://put/styles/main.css')).toMatch(/^text\/css/);
  });

  it('zip vacío: no sube nada y no falla', async () => {
    const worker = new ExtraerPaqueteWorker();
    const w = worker as unknown as Record<string, unknown>;
    w.firmarExtraccion = jest.fn(async () => ({ urlLecturaZip: 'http://api/get-zip', subidas: [] }));
    w.leerBinario = jest.fn(async () => new AdmZip().toBuffer());
    const subir = (w.subirBinario = jest.fn());

    const res = await worker.procesar(job);

    expect(res).toEqual({ contenidoId: 'cid-1', subidos: 0, total: 0 });
    expect(subir).not.toHaveBeenCalled();
  });
});
