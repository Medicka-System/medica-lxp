import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  QUEUE_PROCESAR_DICOM,
  type DestinoAnonimizado,
  type FuenteDicom,
  type ProcesarDicomJob,
  type TablaEstudioDicom,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { StorageService } from './storage.service';
import { cargarCaso, marcarEstado, type CasoEstudio } from './dicom.repositorio';

/** Una fuente que el cliente va a subir (un `.dcm` suelto o un `.zip`). */
export interface ArchivoSolicitado {
  indice: number;
  esZip: boolean;
}

/** Item firmado devuelto al cliente para subir una fuente cruda directo al storage. */
export interface ItemSubida {
  indice: number;
  refCrudo: string;
  urlSubida: string;
  esZip: boolean;
}

/** Respuesta al solicitar la subida (una URL firmada por fuente). */
export interface SolicitudSubida {
  casoId: string;
  tabla: TablaEstudioDicom;
  items: ItemSubida[];
}

/** Una serie del estudio anonimizado con su URL firmada de lectura (para el visor). */
export interface SerieLectura {
  series_uid: string;
  modalidad: string;
  frames: number;
  urlLectura: string;
}

/** Respuesta al pedir la lectura del estudio anonimizado (para el visor). */
export interface LecturaEstudio {
  casoId: string;
  estado: string;
  /** URL firmada de la primera serie (compat); el visor usa `series[].urlLectura`. */
  urlLectura: string;
  series: SerieLectura[];
}

/**
 * Ingesta de estudios DICOM (§8/§9 · rediseño multi-serie). Orquesta la subida
 * directa a object storage (URLs firmadas, una por fuente) y encola la anonimización
 * — no proxya el binario (Regla de Oro §2): el archivo va cliente → storage, nunca
 * por el `api`. El estudio es TRANSVERSAL: bitácora (alumno) o banco curado (staff).
 *
 * Flujo: solicitar (firma N PUT de crudos) → el cliente sube cada fuente → confirmar
 * (encola `procesar-dicom` con las URLs firmadas por fuente). El worker descomprime
 * los zips, anonimiza cada `.dcm` en una serie, y pide al `api` las URLs de escritura
 * de los anonimizados (`firmarAnonimizados`) porque el nº de series de un zip no se
 * conoce hasta descomprimir. El `api` sigue siendo el ÚNICO firmante (§3).
 */
@Injectable()
export class IngestaService {
  constructor(
    private readonly db: DbService,
    private readonly storage: StorageService,
    private readonly colas: ColasProducer,
  ) {}

  private async exigirCaso(casoId: string, tabla: TablaEstudioDicom): Promise<CasoEstudio> {
    const caso = await cargarCaso(this.db.sql, casoId, tabla);
    if (!caso) throw new NotFoundException(`Caso ${casoId} no existe.`);
    return caso;
  }

  /**
   * Firma una URL de LECTURA de vida corta por SERIE del estudio ANONIMIZADO, para
   * que el visor Cornerstone3D las cargue vía `wadouri:` (§4.7). Solo cuando el
   * pipeline terminó (`anonimizado`): si sigue en proceso o falló, responde 409.
   */
  async urlLecturaEstudio(
    casoId: string,
    tabla: TablaEstudioDicom = 'bitacora_casos',
  ): Promise<LecturaEstudio> {
    const caso = await this.exigirCaso(casoId, tabla);
    if (caso.estudio_estado !== 'anonimizado' || caso.estudio_series.length === 0) {
      throw new ConflictException(
        `El estudio del caso ${casoId} no está anonimizado (estado: ${caso.estudio_estado ?? 'sin estudio'}).`,
      );
    }
    const series: SerieLectura[] = caso.estudio_series.map((s, i) => ({
      series_uid: s.series_uid,
      modalidad: s.modalidad,
      frames: s.frames,
      // `ref` por serie (multi-serie); compat con estudios viejos de una sola ref.
      urlLectura: this.storage.firmarLectura(s.ref ?? caso.estudio_dicom_ref ?? this.storage.claveAnonimizado(casoId, i)),
    }));
    return {
      casoId,
      estado: caso.estudio_estado,
      urlLectura: series[0]!.urlLectura,
      series,
    };
  }

  /** Firma la subida de cada fuente cruda y deja el caso a la espera del binario. */
  async solicitarSubida(
    casoId: string,
    tabla: TablaEstudioDicom = 'bitacora_casos',
    archivos: ArchivoSolicitado[] = [{ indice: 0, esZip: false }],
  ): Promise<SolicitudSubida> {
    await this.exigirCaso(casoId, tabla);
    const items: ItemSubida[] = archivos.map((a) => {
      const refCrudo = this.storage.claveCrudo(casoId, a.indice);
      return {
        indice: a.indice,
        refCrudo,
        urlSubida: this.storage.firmarSubida(refCrudo),
        esZip: a.esZip,
      };
    });
    await marcarEstado(this.db.sql, casoId, 'pendiente', tabla);
    return { casoId, tabla, items };
  }

  /**
   * Confirma que los crudos ya están en storage y encola la anonimización. Pasa al
   * worker las URLs firmadas de lectura/borrado por fuente; las de escritura de los
   * anonimizados las pide el worker luego (nº de series desconocido hasta descomprimir).
   */
  async confirmarSubida(
    casoId: string,
    tabla: TablaEstudioDicom = 'bitacora_casos',
    archivos: ArchivoSolicitado[] = [{ indice: 0, esZip: false }],
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    await this.exigirCaso(casoId, tabla);
    await marcarEstado(this.db.sql, casoId, 'recibido', tabla);

    const fuentes: FuenteDicom[] = archivos.map((a) => {
      const refCrudo = this.storage.claveCrudo(casoId, a.indice);
      return {
        indice: a.indice,
        refCrudo,
        urlLecturaCrudo: this.storage.firmarLectura(refCrudo),
        urlBorradoCrudo: this.storage.firmarBorrado(refCrudo),
        esZip: a.esZip,
      };
    });

    const job: ProcesarDicomJob = { casoId, tabla, fuentes };
    const jobId = await this.colas.encolar(QUEUE_PROCESAR_DICOM, job);
    return { encolado: true, cola: QUEUE_PROCESAR_DICOM, jobId };
  }

  /**
   * Firma la ESCRITURA de `cantidad` series anonimizadas (worker→servicio). El worker
   * ya conoce el nº final de series tras descomprimir; el `api` firma un PUT por serie.
   */
  async firmarAnonimizados(
    casoId: string,
    tabla: TablaEstudioDicom,
    cantidad: number,
  ): Promise<{ destinos: DestinoAnonimizado[] }> {
    await this.exigirCaso(casoId, tabla);
    const destinos: DestinoAnonimizado[] = Array.from({ length: Math.max(0, cantidad) }, (_, i) => {
      const ref = this.storage.claveAnonimizado(casoId, i);
      return { indice: i, ref, urlSubida: this.storage.firmarSubida(ref) };
    });
    return { destinos };
  }
}
