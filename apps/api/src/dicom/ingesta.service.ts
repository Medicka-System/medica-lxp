import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  QUEUE_PROCESAR_DICOM,
  type DestinoAnonimizado,
  type DestinoThumb,
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
  /** `dicom` (loader wadouri) o `imagen` (JPG/PNG · web loader). Default `dicom`. */
  tipo: 'dicom' | 'imagen';
  /** Espaciado físico `[row, col]` mm (aspect ratio USG); `null` si píxel cuadrado. */
  pixelSpacing: [number, number] | null;
  /** Caja `[x0,y0,x1,y1]` px de la región de ultrasonido (auto-encuadre); `null` si no hay. */
  region: [number, number, number, number] | null;
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
      // PÚBLICA: el VISOR (navegador) lee el anonimizado directo de storage.
      urlLectura: this.storage.firmarLectura(s.ref ?? caso.estudio_dicom_ref ?? this.storage.claveAnonimizado(casoId, i), undefined, true),
      tipo: s.tipo === 'imagen' ? 'imagen' : 'dicom',
      pixelSpacing: s.pixel_spacing ?? null,
      region: s.region ?? null,
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
        // PÚBLICA: el navegador sube cada fuente cruda directo a storage.
        urlSubida: this.storage.firmarSubida(refCrudo, undefined, true),
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
    anexar = false,
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    await this.exigirCaso(casoId, tabla);
    // Al anexar no marcamos 'recibido' global (el estudio ya está anonimizado); el
    // worker fija 'anonimizado' al terminar. Al reemplazar, sí pasa por 'recibido'.
    if (!anexar) await marcarEstado(this.db.sql, casoId, 'recibido', tabla);

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

    const job: ProcesarDicomJob = { casoId, tabla, fuentes, anexar };
    const jobId = await this.colas.encolar(QUEUE_PROCESAR_DICOM, job);
    return { encolado: true, cola: QUEUE_PROCESAR_DICOM, jobId };
  }

  /**
   * Firma la ESCRITURA de `cantidad` series anonimizadas (worker→servicio). El worker
   * ya conoce el nº final de series tras descomprimir; el `api` firma un PUT por serie.
   * `desde` desplaza el índice base para ANEXAR sin pisar refs existentes.
   */
  async firmarAnonimizados(
    casoId: string,
    tabla: TablaEstudioDicom,
    cantidad: number,
    desde = 0,
    extensiones: string[] = [],
  ): Promise<{ destinos: DestinoAnonimizado[]; thumb: DestinoThumb }> {
    await this.exigirCaso(casoId, tabla);
    const destinos: DestinoAnonimizado[] = Array.from({ length: Math.max(0, cantidad) }, (_, i) => {
      const indice = desde + i;
      // La extensión (dcm/jpg/png) la manda el worker tras husmear cada fuente; el ref la
      // lleva para que el visor elija el loader correcto (§3). Default `dcm`.
      const ref = this.storage.claveAnonimizado(casoId, indice, extensiones[i] ?? 'dcm');
      return { indice, ref, urlSubida: this.storage.firmarSubida(ref) };
    });
    // Destino del thumb del caso (serie 0): el `api` firma el PUT (§3, único firmante); el
    // worker lo usa solo al REEMPLAZAR (al anexar, la serie 0 no cambia → no se re-genera).
    const thumbRef = this.storage.claveThumbCaso(casoId);
    const thumb: DestinoThumb = { ref: thumbRef, urlSubida: this.storage.firmarSubida(thumbRef) };
    return { destinos, thumb };
  }

  /**
   * Quita UNA serie del estudio (editar caso · §6): borra su binario anonimizado de
   * object storage y la remueve de `estudio_series`. El `api` es el único firmante, así
   * que el borrado del objeto se hace aquí (firma + DELETE). Si queda vacío, limpia el
   * estado del estudio. La propiedad ya se validó en el web bajo RLS antes de llamar.
   */
  async quitarSerie(
    casoId: string,
    tabla: TablaEstudioDicom,
    indice: number,
  ): Promise<{ series: number }> {
    const caso = await this.exigirCaso(casoId, tabla);
    const series = caso.estudio_series;
    if (indice < 0 || indice >= series.length) {
      throw new NotFoundException(`La serie ${indice} no existe en el caso ${casoId}.`);
    }
    const [removida] = series.splice(indice, 1);
    // Borra el binario anonimizado (idempotente: 404 = ya no está).
    if (removida?.ref) {
      const url = this.storage.firmarBorrado(removida.ref);
      const resp = await fetch(url, { method: 'DELETE' }).catch(() => null);
      if (resp && !resp.ok && resp.status !== 404) {
        throw new Error(`No se pudo borrar la serie en storage (${resp.status}).`);
      }
    }
    const vacio = series.length === 0;
    const refPrimaria = vacio ? null : (series[0]!.ref ?? null);
    const sql = this.db.sql;
    if (tabla === 'casos_biblioteca') {
      // casos_biblioteca usa `dicom_ref` (no `estudio_dicom_ref`).
      await sql`
        update lxp.casos_biblioteca
        set estudio_series = ${sql.json(series)},
            dicom_ref = ${refPrimaria},
            estudio_estado = ${vacio ? null : 'anonimizado'}::lxp.estudio_dicom_estado,
            anonimizado_en = case when ${vacio} then null else anonimizado_en end
        where id = ${casoId}`;
    } else {
      await sql`
        update lxp.bitacora_casos
        set estudio_series = ${sql.json(series)},
            estudio_dicom_ref = ${refPrimaria},
            estudio_estado = ${vacio ? null : 'anonimizado'}::lxp.estudio_dicom_estado
        where id = ${casoId}`;
    }
    return { series: series.length };
  }
}
