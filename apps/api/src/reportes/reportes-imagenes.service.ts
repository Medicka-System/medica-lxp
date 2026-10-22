import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ANCHOS_DERIVADO,
  QUEUE_PROCESAR_IMAGEN_REPORTE,
  type DestinoDerivadoReporte,
  type ProcesarImagenReporteJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { StorageService } from '../dicom/storage.service';
import {
  editarPie,
  insertarImagen,
  quitar,
  reordenar,
  siguienteOrden,
} from './reporte-imagenes.repositorio';

/**
 * Galería de imágenes del reporte clínico (§6.5). Un REPORTE es el entregable del PACIENTE:
 * conserva su PII — aquí NO se anonimiza (§10 es solo del camino educativo Bitácora/Ateneo, en
 * el handoff reporte→caso). El `api` es SOLO firmante + orquestador (§2): firma la subida del
 * ORIGINAL directo a su clave final, y para JPG/PNG ENCOLA un job que genera thumb + derivados
 * webp con sharp (del original). El `.dcm` se guarda tal cual y queda `listo` sin encolar (su
 * miniatura la rasteriza el cliente). El binario va del navegador directo a storage; nunca por
 * el `api`. Propiedad gateada en el web (RLS).
 */

const EXT_OK = new Set(['jpg', 'jpeg', 'png', 'dcm']);

function normalizarId(v: string): string {
  return (v || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
}
function normalizarExt(ext: string): string {
  const e = (ext || '').toLowerCase();
  if (e === 'jpeg') return 'jpg';
  return EXT_OK.has(e) ? e : 'jpg';
}

@Injectable()
export class ReportesImagenesService {
  constructor(
    private readonly storage: StorageService,
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {}

  /**
   * Paso 1: firma la subida del ORIGINAL directo a su clave FINAL (el reporte conserva PII · §6.5;
   * NO hay crudo ni redacción). El navegador sube el archivo íntegro a storage.
   */
  firmarSubida(reporteId: string, ext: string): { id: string; ext: string; ref: string; urlSubida: string } {
    const rid = normalizarId(reporteId);
    if (!rid) throw new BadRequestException('reporteId inválido.');
    const e = normalizarExt(ext);
    const id = randomUUID();
    const ref = this.storage.claveReporteImagen(rid, id, e);
    // PÚBLICA: el navegador sube el ORIGINAL directo a su clave final.
    return { id, ext: e, ref, urlSubida: this.storage.firmarSubida(ref, undefined, true) };
  }

  /**
   * Paso 2: registra la imagen y, SOLO para JPG/PNG, encola el job que genera thumb + derivados
   * webp con sharp (del original ya subido). El `.dcm` se guarda tal cual y queda `listo` de
   * una vez (sin encolar): su miniatura la rasteriza el cliente con Cornerstone desde el frame.
   * NO se anonimiza (un reporte conserva PII · §10 solo en el handoff reporte→caso).
   */
  async encolar(
    reporteId: string,
    campoId: string,
    id: string,
    ext: string,
  ): Promise<{ imagenId: string; campoId: string; ref: string; ext: string; estado: 'recibido' | 'listo'; orden: number }> {
    const rid = normalizarId(reporteId);
    const iid = normalizarId(id);
    const cid = (campoId || '').slice(0, 128);
    if (!rid || !iid || !cid) throw new BadRequestException('reporteId/campoId/id inválido.');
    const e = normalizarExt(ext);

    const refFinal = this.storage.claveReporteImagen(rid, iid, e);
    const orden = await siguienteOrden(this.db.sql, rid, cid);

    // DICOM: el original ya está en storage (el navegador lo subió); nada que procesar en el
    // servidor (el cliente rasteriza la miniatura). Queda `listo` directo.
    if (e === 'dcm') {
      const imagenId = await insertarImagen(this.db.sql, { reporteId: rid, campoId: cid, ref: refFinal, ext: e, orden, estado: 'listo' });
      return { imagenId, campoId: cid, ref: refFinal, ext: e, estado: 'listo', orden };
    }

    // JPG/PNG: fila `recibido` + encola thumb (sharp) + derivados webp del ORIGINAL.
    const refThumb = this.storage.claveReporteThumb(rid, iid);
    const imagenId = await insertarImagen(this.db.sql, { reporteId: rid, campoId: cid, ref: refFinal, ext: e, orden });
    const derivados: DestinoDerivadoReporte[] = ANCHOS_DERIVADO.contenido.map((ancho) => {
      const ref = this.storage.claveReporteDerivado(rid, iid, ancho);
      return { ancho, ref, urlSubida: this.storage.firmarSubida(ref) };
    });
    const job: ProcesarImagenReporteJob = {
      imagenId,
      reporteId: rid,
      ext: e,
      urlLecturaOriginal: this.storage.firmarLectura(refFinal), // interna (worker en Docker)
      refThumb,
      urlSubidaThumb: this.storage.firmarSubida(refThumb),
      derivados,
    };
    await this.colas.encolar(QUEUE_PROCESAR_IMAGEN_REPORTE, job);
    return { imagenId, campoId: cid, ref: refFinal, ext: e, estado: 'recibido', orden };
  }

  /** Firma la lectura PÚBLICA de refs de galería de reporte (imagen final / thumb / derivados). */
  firmarLectura(refs: string[]): { urls: Record<string, string> } {
    const urls: Record<string, string> = {};
    for (const ref of refs ?? []) {
      if (typeof ref === 'string' && ref.startsWith('reportes/imagenes/')) {
        urls[ref] = this.storage.firmarLectura(ref, undefined, true);
      }
    }
    return { urls };
  }

  /** Reordena una galería (orden = posición en `ids`). */
  async reordenar(reporteId: string, campoId: string, ids: string[]): Promise<{ ok: true }> {
    const rid = normalizarId(reporteId);
    if (!rid) throw new BadRequestException('reporteId inválido.');
    await reordenar(this.db.sql, rid, (campoId || '').slice(0, 128), Array.isArray(ids) ? ids : []);
    return { ok: true };
  }

  /** Edita el pie de una imagen. */
  async editarPie(reporteId: string, imagenId: string, pie: string): Promise<{ ok: true }> {
    const rid = normalizarId(reporteId);
    if (!rid) throw new BadRequestException('reporteId inválido.');
    await editarPie(this.db.sql, rid, normalizarId(imagenId), typeof pie === 'string' ? pie.slice(0, 500) : '');
    return { ok: true };
  }

  /** Quita una imagen (fila + binarios en storage: final, thumb, derivados). Idempotente. */
  async quitar(reporteId: string, imagenId: string): Promise<{ ok: true }> {
    const rid = normalizarId(reporteId);
    if (!rid) throw new BadRequestException('reporteId inválido.');
    const fila = await quitar(this.db.sql, rid, normalizarId(imagenId));
    if (fila) {
      const refs = [fila.ref, fila.thumb_ref, ...Object.values(fila.derivados ?? {})].filter(
        (r): r is string => typeof r === 'string' && r.length > 0,
      );
      await Promise.all(
        refs.map((ref) => fetch(this.storage.firmarBorrado(ref), { method: 'DELETE' }).catch(() => undefined)),
      );
    }
    return { ok: true };
  }
}
