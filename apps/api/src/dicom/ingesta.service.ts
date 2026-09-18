import { Injectable, NotFoundException } from '@nestjs/common';
import { QUEUE_PROCESAR_DICOM, type ProcesarDicomJob } from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { StorageService } from './storage.service';
import { cargarCaso, marcarEstado } from './dicom.repositorio';

/** Respuesta al solicitar la subida de un estudio. */
export interface SolicitudSubida {
  casoId: string;
  refCrudo: string;
  urlSubida: string;
}

/**
 * Ingesta de estudios DICOM (§8/§9 · Sprint 4.7). Orquesta la subida directa a
 * object storage (URL firmada) y encola la anonimización — no proxya el binario
 * (Regla de Oro §2): el archivo va cliente → storage, nunca por el `api`.
 *
 * Flujo: solicitar (firma PUT del crudo) → el cliente sube → confirmar (encola
 * `procesar-dicom` con URLs firmadas de lectura/escritura/borrado para el worker).
 */
@Injectable()
export class IngestaService {
  constructor(
    private readonly db: DbService,
    private readonly storage: StorageService,
    private readonly colas: ColasProducer,
  ) {}

  private async exigirCaso(casoId: string): Promise<void> {
    const caso = await cargarCaso(this.db.sql, casoId);
    if (!caso) throw new NotFoundException(`Caso ${casoId} no existe.`);
  }

  /** Firma la subida del estudio crudo y deja el caso a la espera del binario. */
  async solicitarSubida(casoId: string): Promise<SolicitudSubida> {
    await this.exigirCaso(casoId);
    const refCrudo = this.storage.claveCrudo(casoId);
    const urlSubida = this.storage.firmarSubida(refCrudo);
    await marcarEstado(this.db.sql, casoId, 'pendiente');
    return { casoId, refCrudo, urlSubida };
  }

  /**
   * Confirma que el crudo ya está en storage y encola la anonimización. Pasa al
   * worker URLs firmadas (lectura del crudo, escritura del anonimizado, borrado del
   * crudo) para que el worker no tenga que firmar.
   */
  async confirmarSubida(
    casoId: string,
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    await this.exigirCaso(casoId);
    const refCrudo = this.storage.claveCrudo(casoId);
    const refAnonimizado = this.storage.claveAnonimizado(casoId);

    await marcarEstado(this.db.sql, casoId, 'recibido');

    const job: ProcesarDicomJob = {
      casoId,
      refCrudo,
      refAnonimizado,
      urlLecturaCrudo: this.storage.firmarLectura(refCrudo),
      urlSubidaAnonimizado: this.storage.firmarSubida(refAnonimizado),
      urlBorradoCrudo: this.storage.firmarBorrado(refCrudo),
    };
    const jobId = await this.colas.encolar(QUEUE_PROCESAR_DICOM, job);
    return { encolado: true, cola: QUEUE_PROCESAR_DICOM, jobId };
  }
}
