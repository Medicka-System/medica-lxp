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
 * Galería de imágenes del reporte clínico (§6.5 · unificación del uploader). El `api` es SOLO
 * firmante + orquestador (§2 — ya NO redacta inline): firma la subida del crudo, ENCOLA el job
 * async `procesar-imagen-reporte` (el worker redacta vía el parser compartido §10, genera thumb
 * y derivados, y escribe el estado en `lxp.reporte_imagenes`), y firma la lectura. El binario va
 * del navegador directo a object storage; nunca por el `api`. Propiedad gateada en el web (RLS).
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

  /** Paso 1: firma la subida del CRUDO. El navegador sube el original directo a storage. */
  firmarSubida(reporteId: string, ext: string): { id: string; ext: string; refCrudo: string; urlSubida: string } {
    const rid = normalizarId(reporteId);
    if (!rid) throw new BadRequestException('reporteId inválido.');
    const e = normalizarExt(ext);
    const id = randomUUID();
    const refCrudo = this.storage.claveReporteCrudo(rid, id, e);
    // PÚBLICA: el navegador sube el crudo directo a storage.
    return { id, ext: e, refCrudo, urlSubida: this.storage.firmarSubida(refCrudo, undefined, true) };
  }

  /**
   * Paso 2 (ASYNC): crea la fila `recibido`, firma TODO lo que el worker necesita (crudo
   * lectura/borrado, destino final, thumb, derivados webp para JPG/PNG) y ENCOLA el job. El
   * trabajo pesado (redacción Presidio §10 + thumb + derivados) corre en el worker, no aquí.
   * Devuelve la fila creada para que la UI la muestre y sondee su estado.
   */
  async encolar(
    reporteId: string,
    campoId: string,
    id: string,
    ext: string,
  ): Promise<{ imagenId: string; campoId: string; ref: string; ext: string; estado: 'recibido'; orden: number }> {
    const rid = normalizarId(reporteId);
    const iid = normalizarId(id);
    const cid = (campoId || '').slice(0, 128);
    if (!rid || !iid || !cid) throw new BadRequestException('reporteId/campoId/id inválido.');
    const e = normalizarExt(ext);

    const refCrudo = this.storage.claveReporteCrudo(rid, iid, e);
    const refFinal = this.storage.claveReporteImagen(rid, iid, e);
    const refThumb = this.storage.claveReporteThumb(rid, iid);

    const orden = await siguienteOrden(this.db.sql, rid, cid);
    const imagenId = await insertarImagen(this.db.sql, { reporteId: rid, campoId: cid, ref: refFinal, ext: e, orden });

    // Derivados webp SOLO para imágenes ráster (JPG/PNG); un `.dcm` no se redimensiona (usa thumb).
    const derivados: DestinoDerivadoReporte[] =
      e === 'dcm'
        ? []
        : ANCHOS_DERIVADO.contenido.map((ancho) => {
            const ref = this.storage.claveReporteDerivado(rid, iid, ancho);
            return { ancho, ref, urlSubida: this.storage.firmarSubida(ref) };
          });

    // URLs INTERNAS (worker dentro de Docker): lectura/borrado del crudo + escritura final/thumb.
    const job: ProcesarImagenReporteJob = {
      imagenId,
      reporteId: rid,
      ext: e,
      urlLecturaCrudo: this.storage.firmarLectura(refCrudo),
      urlBorradoCrudo: this.storage.firmarBorrado(refCrudo),
      refFinal,
      urlSubidaFinal: this.storage.firmarSubida(refFinal),
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
