import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QUEUE_PROCESAR_DICOM, type ProcesarDicomJob } from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { StorageService } from './storage.service';
import { cargarCaso, marcarEstado, type CasoEstudio, type SerieEstudio } from './dicom.repositorio';

/** Respuesta al solicitar la subida de un estudio. */
export interface SolicitudSubida {
  casoId: string;
  refCrudo: string;
  urlSubida: string;
}

/** Respuesta al pedir la lectura del estudio anonimizado (para el visor). */
export interface LecturaEstudio {
  casoId: string;
  estado: string;
  urlLectura: string;
  series: SerieEstudio[];
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

  private async exigirCaso(casoId: string): Promise<CasoEstudio> {
    const caso = await cargarCaso(this.db.sql, casoId);
    if (!caso) throw new NotFoundException(`Caso ${casoId} no existe.`);
    return caso;
  }

  /**
   * Firma una URL de LECTURA de vida corta del estudio ANONIMIZADO, para que el
   * visor Cornerstone3D lo cargue vía `wadouri:` (§4.7). El signer es el `api`
   * (único con credenciales de storage · §3). Solo cuando el pipeline terminó
   * (`anonimizado`): si sigue en proceso o falló, responde 409 (nada que mostrar).
   */
  async urlLecturaEstudio(casoId: string): Promise<LecturaEstudio> {
    const caso = await this.exigirCaso(casoId);
    if (caso.estudio_estado !== 'anonimizado' || !caso.estudio_dicom_ref) {
      throw new ConflictException(
        `El estudio del caso ${casoId} no está anonimizado (estado: ${caso.estudio_estado ?? 'sin estudio'}).`,
      );
    }
    return {
      casoId,
      estado: caso.estudio_estado,
      urlLectura: this.storage.firmarLectura(caso.estudio_dicom_ref),
      series: caso.estudio_series,
    };
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
