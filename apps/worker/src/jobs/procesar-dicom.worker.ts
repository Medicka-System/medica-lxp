import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import AdmZip from 'adm-zip';
import {
  QUEUE_PROCESAR_DICOM,
  type DestinoAnonimizado,
  type DestinoThumb,
  type FirmarAnonimizadosResp,
  type ProcesarDicomJob,
  type TablaEstudioDicom,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { TrabajadorBase } from './trabajador-base';
import { anonimizarDicomBinario } from './dicom/anonimizacion-binaria';
import { MOTOR_ANON, VERSION_ANON } from './dicom/anonimizacion';
import { detectarFormato, contentTypeDe, type FormatoFuente } from './dicom/detectar-formato';

/** Serie anonimizada lista para persistir (metadatos + ref en object storage). */
type SeriePersistida = {
  series_uid: string;
  modalidad: string;
  frames: number;
  instancias: number;
  ref: string;
  /**
   * Tipo de la serie: `dicom` (loader wadouri, cine/mm/aspect/auto-encuadre) o `imagen`
   * (JPG/PNG por el web loader, SIN calibración). Ausente = `dicom` (estudios previos).
   */
  tipo?: 'dicom' | 'imagen';
  /** Espaciado físico `[row, col]` mm (aspect ratio USG); `null` si píxel cuadrado. */
  pixel_spacing?: [number, number] | null;
  /** Caja `[x0,y0,x1,y1]` px de la región de ultrasonido (auto-encuadre); `null` si no hay. */
  region?: [number, number, number, number] | null;
};

/**
 * Una serie ya PROCESADA y redactada (buffer listo para subir + metadatos + traza).
 * Unifica el camino DICOM y el de imagen web para persistir/agregar traza igual.
 */
type SerieProcesada = {
  tipo: 'dicom' | 'imagen';
  ext: string;
  buffer: Buffer;
  series_uid: string;
  modalidad: string;
  frames: number;
  instancias: number;
  pixel_spacing: [number, number] | null;
  region: [number, number, number, number] | null;
  /** Campos PII de TAGS removidos (solo DICOM; imagen no tiene tags). */
  campos_removidos: string[];
  removidos_n: number;
  /** Cajas de NOMBRE ennegrecidas por Presidio. */
  redacciones: number;
  revisionManual: boolean;
  /** Thumb JPEG del primer frame YA REDACTADO (§10); null si el redactor no lo emitió. */
  thumb: Buffer | null;
};

/** Resultado de redactar la PII quemada de un `.dcm` con el servicio Presidio. */
type RedaccionPresidio = {
  buffer: Buffer;
  /** Nº de cajas de NOMBRE ennegrecidas. */
  redacciones: number;
  /** El OCR vio texto pero NER no reconoció un nombre → cuarentena (revisión humana). */
  revisionManual: boolean;
  /** Thumb JPEG (del frame YA redactado · §10) decodificado del header X-Thumb-B64; null si no vino. */
  thumb: Buffer | null;
};

/** Traza auditable agregada del estudio (§10) — forma JSON serializable. */
type TrazaEstudio = {
  motor: string;
  version: string;
  campos_removidos: string[];
  removidos_n: number;
  series_procesadas: number;
  verificado: boolean;
  /** Redacción de PII quemada en píxeles (§10) por el servicio Presidio (OCR+NER). */
  redaccion_pixel: 'presidio' | 'ninguna';
  /** El OCR vio texto sin nombre confiable en alguna serie → el estudio EXIGE revisión. */
  revision_manual: boolean;
  /** Cajas de NOMBRE ennegrecidas en todo el estudio. */
  cajas_redactadas: number;
};

/** Índice de una serie a partir de su ref `.../{idx}.dcm` (para anexar sin pisar). */
function indiceDeRef(ref: string | undefined): number {
  const m = /(\d+)\.dcm$/.exec(ref ?? '');
  return m ? Number(m[1]) : -1;
}

/**
 * Map con concurrencia ACOTADA preservando el ORDEN del resultado (`out[i]` ↔ `items[i]`).
 * Corre a lo sumo `limite` tareas a la vez (coincide con los workers del redactor). Si una
 * tarea lanza, `Promise.all` rechaza → el error PROPAGA al try/catch del job → reintento y
 * NADA se persiste (fail-closed §10 intacto: la persistencia es posterior y solo si TODAS
 * las series se redactaron). No agrega dependencias (p-limit casero).
 */
async function mapConLimite<T, R>(
  items: T[],
  limite: number,
  fn: (item: T, indice: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let siguiente = 0;
  const corredor = async (): Promise<void> => {
    for (let i = siguiente++; i < items.length; i = siguiente++) {
      out[i] = await fn(items[i]!, i);
    }
  };
  const n = Math.max(1, Math.min(limite, items.length));
  await Promise.all(Array.from({ length: n }, () => corredor()));
  return out;
}

/**
 * `procesar-dicom` (§8, job #2 · rediseño MULTI-SERIE): al confirmarse la subida de
 * las FUENTES de un estudio (uno o varios `.dcm`, o un `.zip` con varias series), este
 * worker las trae de object storage, DESCOMPRIME los zips server-side (adm-zip · §10 —
 * el binario nunca se procesa en el cliente), ANONIMIZA cada `.dcm` de forma BLOQUEANTE
 * (quita PII del paciente, §10) y reescribe un `.dcm` anonimizado POR SERIE. NINGÚN
 * caso educativo se guarda con PII: si algo sobrevive a la verificación, el job falla
 * (reintenta) y no se fija la referencia del estudio.
 *
 * El binario vive en object storage; el `api` es el único FIRMANTE (§3): provee en el
 * job las URLs de lectura/borrado de los crudos, y firma las de ESCRITURA de los
 * anonimizados bajo demanda (`firmar-anonimizados`), porque el nº de series de un zip
 * no se conoce hasta descomprimir. El estudio es TRANSVERSAL: se persiste en la tabla
 * dueña (bitácora del alumno o banco curado).
 */
@Injectable()
export class ProcesarDicomWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_PROCESAR_DICOM;

  constructor(private readonly db: DbService) {
    super();
  }

  async procesar(job: Job<ProcesarDicomJob>): Promise<{ casoId: string; series: number }> {
    const { casoId, tabla, fuentes, anexar = false } = job.data;

    try {
      // Al ANEXAR el estudio ya está anonimizado y visible: no lo pasamos a
      // 'procesando' (evita 409 en el visor durante la edición). Al reemplazar, sí.
      if (!anexar) await this.marcarEstado(tabla, casoId, 'procesando');

      // Series ya existentes (para anexar sin pisar refs). Vacío si reemplaza.
      const existentes = anexar ? await this.leerSeriesExistentes(tabla, casoId) : [];
      const desde = existentes.reduce((max, s) => Math.max(max, indiceDeRef(s.ref) + 1), 0);

      // 1) Traer cada fuente cruda, husmear su formato y expandir los zips. Cada fuente
      //    produce uno o varios binarios TIPADOS (dicom | imagen web).
      const tipados: { buffer: ArrayBuffer; formato: FormatoFuente }[] = [];
      for (const fuente of fuentes) {
        const bin = await this.leerBinario(fuente.urlLecturaCrudo);
        const fmt = detectarFormato(bin);
        if (fmt.tipo === 'zip' || fuente.esZip) {
          // El `.zip` es un estudio de `.dcm` (se descomprime server-side · §10).
          for (const dcm of this.expandirZip(bin)) {
            tipados.push({ buffer: dcm, formato: { tipo: 'dicom', ext: 'dcm' } });
          }
        } else {
          tipados.push({ buffer: bin, formato: fmt });
        }
      }
      if (tipados.length === 0) {
        throw new Error('El estudio no contiene ninguna fuente procesable.');
      }

      // 2) Procesar cada fuente según su tipo. En AMBOS casos la PII QUEMADA se tapa con
      //    Presidio (OCR+NER, ON-PREM · §10) ANTES de subir; si el servicio falla, lanza →
      //    el job reintenta y NADA se sube sin redactar (nunca se persiste un posible leak).
      //    · DICOM: anonimiza TAGS (dcmjs, bloqueante · §10) + Presidio sobre el binario P10.
      //    · Imagen: no tiene tags; Presidio directo sobre la JPG/PNG. Sin calibración (mm).
      // PARALELO ACOTADO: las series se redactan con concurrencia `REDACCION_CONCURRENCIA`
      // (default 3 = workers del redactor), no en fila. El redactor (uvicorn multi-worker)
      // sirve esas N en paralelo; el orden del resultado se preserva (destinos[i]↔procesadas[i]).
      // Si una serie falla, propaga → job reintenta, nada se persiste (§10 fail-closed).
      const concurrencia = Number(process.env.REDACCION_CONCURRENCIA ?? '3') || 3;
      const procesadas: SerieProcesada[] = await mapConLimite(tipados, concurrencia, (t) =>
        t.formato.tipo === 'imagen'
          ? this.procesarImagen(t.buffer, t.formato.ext)
          : this.procesarDicom(t.buffer),
      );

      // 2.5) CUARENTENA BLOQUEANTE (§10 · fail-CLOSED): si el redactor NO pudo garantizar la
      //      redacción de una serie (excepción, formato no decodificable, nombre dudoso o la
      //      verificación post-redacción falló) devuelve cuerpo VACÍO + X-Revision-Manual=1;
      //      aquí NUNCA se sube ni se marca 'anonimizado'. Se descartan los crudos (PII fuera del
      //      storage) y el estudio queda 'revision_manual' → el caso NO expone el estudio.
      if (procesadas.some((p) => p.revisionManual)) {
        for (const fuente of fuentes) {
          await this.borrarCrudo(fuente.urlBorradoCrudo);
        }
        // Al REEMPLAZAR: el estudio entero queda en cuarentena. Al ANEXAR: se descartan solo las
        // series nuevas y NO se toca el estudio anonimizado ya visible (no se degrada lo válido).
        if (!anexar) await this.marcarEstado(tabla, casoId, 'revision_manual');
        this.logger.warn(
          `Caso ${casoId} (${tabla}) EN CUARENTENA (§10): el redactor no garantizó la redacción ` +
            `de PII quemada en ${procesadas.filter((p) => p.revisionManual).length}/${procesadas.length} ` +
            `serie(s). No se publicó el estudio; crudos descartados.`,
        );
        return { casoId, series: anexar ? existentes.length : 0 };
      }

      // 3) Pedir al `api` las URLs firmadas de escritura (una por serie), con la extensión
      //    de cada una (dcm/jpg/png). El `api` es el único firmante (§3). Incluye el destino
      //    del THUMB del caso (serie 0), que se usa solo al REEMPLAZAR.
      const { destinos, thumb: destinoThumb } = await this.firmarAnonimizados(
        casoId,
        tabla,
        procesadas.length,
        desde,
        procesadas.map((p) => p.ext),
      );
      if (destinos.length < procesadas.length) {
        throw new Error('El `api` firmó menos destinos que series a persistir.');
      }

      // 4) Subir cada binario redactado a su destino (content-type por extensión).
      const nuevas: SeriePersistida[] = [];
      for (let i = 0; i < procesadas.length; i++) {
        const p = procesadas[i]!;
        const destino = destinos[i]!;
        await this.subirBinario(destino.urlSubida, p.buffer, contentTypeDe(p.ext));
        nuevas.push({
          series_uid: p.series_uid,
          modalidad: p.modalidad,
          frames: p.frames,
          instancias: p.instancias,
          ref: destino.ref,
          tipo: p.tipo,
          pixel_spacing: p.pixel_spacing,
          region: p.region,
        });
      }

      // 5) Borrar los crudos (PII fuera del storage) — idempotente.
      for (const fuente of fuentes) {
        await this.borrarCrudo(fuente.urlBorradoCrudo);
      }

      // 5.5) THUMB del caso (JPEG del primer frame YA REDACTADO · §10). Solo al REEMPLAZAR:
      //      al anexar, la serie 0 no cambia → se conserva el thumb existente (no se toca la
      //      columna). Best-effort: si no hay thumb o falla la subida, queda estudio_thumb_ref
      //      = null → el front cae al raster-cliente (fallback de transición). Un fallo del
      //      thumb NUNCA rompe el job (el thumb es cosmético, no §10-bloqueante).
      // `undefined` = no tocar la columna (anexar); `null`/ref = fijarla (reemplazar).
      let thumbRef: string | null | undefined = undefined;
      if (!anexar) {
        thumbRef = null;
        const thumbBuf = procesadas[0]?.thumb ?? null;
        if (thumbBuf && destinoThumb) {
          try {
            await this.subirBinario(destinoThumb.urlSubida, thumbBuf, 'image/jpeg');
            thumbRef = destinoThumb.ref;
          } catch (e) {
            this.logger.warn(
              `Caso ${casoId} (${tabla}): no se pudo subir el thumb (se usará fallback): ${String(e)}`,
            );
          }
        }
      }

      // 6) Persistir. Al anexar, concatena a las existentes; al reemplazar, sólo las
      //    nuevas. La referencia del estudio se fija junto con anonimizado_en (CHECK 0014/0024).
      const series = anexar ? [...existentes, ...nuevas] : nuevas;
      const traza = this.agregarTraza(procesadas);
      await this.guardarEstudio(tabla, casoId, series, traza, thumbRef);

      this.logger.log(
        `Caso ${casoId} (${tabla}) ${anexar ? 'ampliado' : 'anonimizado'}: ${series.length} serie(s) ` +
          `(+${nuevas.length}), ${traza.removidos_n} campo(s) PII removido(s), ` +
          `${traza.cajas_redactadas} caja(s) de nombre tapada(s).`,
      );
      return { casoId, series: series.length };
    } catch (err) {
      // Al anexar NO marcamos 'error' para no ocultar el estudio ya anonimizado; el
      // job reintenta. Al reemplazar sí, porque no hay estudio válido que preservar.
      if (!anexar) await this.marcarEstado(tabla, casoId, 'error');
      throw err;
    }
  }

  /** Lee las series ya persistidas del caso (para anexar). */
  private async leerSeriesExistentes(
    tabla: TablaEstudioDicom,
    casoId: string,
  ): Promise<SeriePersistida[]> {
    const sql = this.db.sql;
    const rows =
      tabla === 'casos_biblioteca'
        ? await sql<{ estudio_series: SeriePersistida[] }[]>`
            select coalesce(estudio_series, '[]'::jsonb) as estudio_series
            from lxp.casos_biblioteca where id = ${casoId}`
        : await sql<{ estudio_series: SeriePersistida[] }[]>`
            select coalesce(estudio_series, '[]'::jsonb) as estudio_series
            from lxp.bitacora_casos where id = ${casoId}`;
    return rows[0]?.estudio_series ?? [];
  }

  /** Descomprime un `.zip` y devuelve los buffers de sus `.dcm` (ignora el resto). */
  private expandirZip(bin: ArrayBuffer): ArrayBuffer[] {
    const zip = new AdmZip(Buffer.from(bin));
    const buffers: ArrayBuffer[] = [];
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const nombre = entry.entryName.toLowerCase();
      // Solo `.dcm` (o extensión ausente estilo DICOM export). DICOMDIR/otros: fuera.
      const base = nombre.split('/').pop() ?? nombre;
      if (base === 'dicomdir') continue;
      if (!base.endsWith('.dcm')) continue;
      const data = entry.getData();
      if (data.byteLength === 0) continue;
      // Copia a un ArrayBuffer propio (adm-zip devuelve un Node Buffer respaldado
      // por un pool compartido); dcmjs lee sobre este ArrayBuffer contiguo.
      const copia = new ArrayBuffer(data.byteLength);
      new Uint8Array(copia).set(data);
      buffers.push(copia);
    }
    if (buffers.length === 0) {
      throw new Error('El `.zip` no contiene archivos `.dcm`.');
    }
    return buffers;
  }

  /**
   * Procesa una fuente DICOM: anonimiza TAGS (dcmjs, bloqueante · §10) y luego tapa la
   * PII quemada con Presidio sobre el binario P10. Extrae aspect ratio + región (§5A).
   */
  private async procesarDicom(bin: ArrayBuffer): Promise<SerieProcesada> {
    const anon = anonimizarDicomBinario(bin);
    const red = await this.redactarPixeles(anon.buffer, 'application/dicom');
    const s = anon.series[0];
    return {
      tipo: 'dicom',
      ext: 'dcm',
      buffer: red.buffer,
      series_uid: s?.series_uid ?? '',
      modalidad: s?.modalidad ?? 'US',
      frames: s?.frames ?? 1,
      instancias: s?.instancias ?? 1,
      pixel_spacing: s?.pixelSpacing ?? null,
      region: s?.region ?? null,
      campos_removidos: anon.traza.campos_removidos,
      removidos_n: anon.traza.removidos_n,
      redacciones: red.redacciones,
      revisionManual: red.revisionManual,
      thumb: red.thumb,
    };
  }

  /**
   * Procesa una IMAGEN web (JPG/PNG) extraída del equipo: NO tiene tags que limpiar, pero
   * puede traer el nombre del paciente QUEMADO → Presidio (OCR+NER) directo sobre la imagen
   * (§10). Sin calibración: el visor la muestra sin medición en mm (una serie de 1 frame).
   */
  private async procesarImagen(bin: ArrayBuffer, ext: string): Promise<SerieProcesada> {
    const entrada = Buffer.from(bin);
    const red = await this.redactarPixeles(entrada, contentTypeDe(ext));
    return {
      tipo: 'imagen',
      ext,
      buffer: red.buffer,
      series_uid: '',
      modalidad: 'IMG',
      frames: 1,
      instancias: 1,
      pixel_spacing: null,
      region: null,
      campos_removidos: [],
      removidos_n: 0,
      redacciones: red.redacciones,
      revisionManual: red.revisionManual,
      thumb: red.thumb,
    };
  }

  /** Pide al `api` las URLs firmadas de escritura de los anonimizados (§3), con extensión. */
  private async firmarAnonimizados(
    casoId: string,
    tabla: TablaEstudioDicom,
    cantidad: number,
    desde = 0,
    extensiones: string[] = [],
  ): Promise<{ destinos: DestinoAnonimizado[]; thumb?: DestinoThumb }> {
    const base = process.env.API_URL ?? 'http://localhost:8000';
    const resp = await fetch(
      `${base}/dicom/casos/${encodeURIComponent(casoId)}/ingesta/firmar-anonimizados`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tabla, cantidad, desde, extensiones }),
      },
    );
    if (!resp.ok) {
      throw new Error(`El api no firmó los anonimizados (${resp.status}).`);
    }
    const { destinos, thumb } = (await resp.json()) as FirmarAnonimizadosResp;
    return { destinos, thumb };
  }

  /** Agrega las trazas por serie (tags + redacción Presidio) en una traza del estudio. */
  private agregarTraza(procesadas: SerieProcesada[]): TrazaEstudio {
    const campos = new Set<string>();
    let removidos_n = 0;
    let cajas_redactadas = 0;
    let revision_manual = false;
    for (const p of procesadas) {
      for (const c of p.campos_removidos) campos.add(c);
      removidos_n += p.removidos_n;
      cajas_redactadas += p.redacciones;
      if (p.revisionManual) revision_manual = true;
    }
    return {
      motor: MOTOR_ANON,
      version: VERSION_ANON,
      campos_removidos: [...campos].sort(),
      removidos_n,
      series_procesadas: procesadas.length,
      verificado: true,
      redaccion_pixel: 'presidio',
      revision_manual,
      cajas_redactadas,
    };
  }

  /**
   * Redacta la PII quemada (nombre) con el servicio Presidio (§10 · ON-PREM). Envía el
   * binario (DICOM P10 o imagen JPG/PNG, según `contentType`) y recibe el binario con la
   * caja del nombre ennegrecida + metadata (`X-Redacciones`, `X-Revision-Manual`). El
   * servicio ramifica por content-type. Un fallo de red LANZA → el job reintenta y nada se
   * sube sin redactar (nunca se persiste un posible leak).
   */
  private async redactarPixeles(buffer: Buffer, contentType: string): Promise<RedaccionPresidio> {
    const base = process.env.REDACTOR_URL ?? 'http://localhost:8002';
    const resp = await fetch(`${base}/redact`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    if (!resp.ok) {
      throw new Error(`El servicio redactor-dicom respondió ${resp.status}.`);
    }
    const redactado = Buffer.from(await resp.arrayBuffer());
    // Thumb (base64 del frame YA redactado · §10) en el header X-Thumb-B64; "" = sin thumb.
    const thumbB64 = resp.headers.get('x-thumb-b64') ?? '';
    const thumb = thumbB64 ? Buffer.from(thumbB64, 'base64') : null;
    return {
      buffer: redactado,
      redacciones: Number(resp.headers.get('x-redacciones') ?? '0'),
      revisionManual: resp.headers.get('x-revision-manual') === '1',
      thumb,
    };
  }

  /** Marca el estado del pipeline en la tabla dueña (bitácora o banco curado). */
  private async marcarEstado(
    tabla: TablaEstudioDicom,
    casoId: string,
    estado: 'procesando' | 'error' | 'revision_manual',
  ): Promise<void> {
    const sql = this.db.sql;
    if (tabla === 'casos_biblioteca') {
      await sql`update lxp.casos_biblioteca set estudio_estado = ${estado} where id = ${casoId}`;
    } else {
      await sql`update lxp.bitacora_casos set estudio_estado = ${estado} where id = ${casoId}`;
    }
  }

  /**
   * Persiste el estudio anonimizado (estado + ref + series + traza) en la tabla dueña.
   * `thumbRef`: `undefined` = no tocar `estudio_thumb_ref` (anexar); `string`/`null` = fijarla
   * (reemplazar; la ref del JPEG del thumb o null si no se generó → fallback raster-cliente).
   */
  private async guardarEstudio(
    tabla: TablaEstudioDicom,
    casoId: string,
    series: SeriePersistida[],
    traza: TrazaEstudio,
    thumbRef: string | null | undefined = undefined,
  ): Promise<void> {
    const sql = this.db.sql;
    const refPrimaria = series[0]!.ref;
    if (tabla === 'casos_biblioteca') {
      // casos_biblioteca usa `dicom_ref` (no existe `estudio_dicom_ref` aquí; ese vive en
      // bitacora_casos). Fijarlo tumbaba la ingesta del curado.
      await sql`
        update lxp.casos_biblioteca
        set estudio_estado    = 'anonimizado',
            dicom_ref         = ${refPrimaria},
            estudio_series    = ${sql.json(series)},
            anonimizacion     = ${sql.json(traza)},
            anonimizado_en    = now()
        where id = ${casoId}`;
    } else {
      await sql`
        update lxp.bitacora_casos
        set estudio_estado    = 'anonimizado',
            estudio_dicom_ref = ${refPrimaria},
            estudio_series    = ${sql.json(series)},
            anonimizacion     = ${sql.json(traza)},
            anonimizado_en    = now()
        where id = ${casoId}`;
    }
    // Fijar la ref del thumb SOLO cuando se indicó (reemplazar); en anexar se deja intacta.
    if (thumbRef !== undefined) {
      if (tabla === 'casos_biblioteca') {
        await sql`update lxp.casos_biblioteca set estudio_thumb_ref = ${thumbRef} where id = ${casoId}`;
      } else {
        await sql`update lxp.bitacora_casos set estudio_thumb_ref = ${thumbRef} where id = ${casoId}`;
      }
    }
  }

  /** Descarga el binario del estudio (crudo) como ArrayBuffer. */
  private async leerBinario(url: string): Promise<ArrayBuffer> {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`No se pudo leer el estudio crudo (${resp.status}).`);
    }
    const buf = await resp.arrayBuffer();
    if (buf.byteLength === 0) {
      throw new Error('El estudio crudo está vacío.');
    }
    return buf;
  }

  private async subirBinario(
    url: string,
    buffer: Buffer,
    contentType = 'application/dicom',
  ): Promise<void> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': contentType },
      // Vista tipada del Buffer (evita enviar el pool subyacente completo).
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    if (!resp.ok) {
      throw new Error(`No se pudo guardar el estudio anonimizado (${resp.status}).`);
    }
  }

  private async borrarCrudo(url: string): Promise<void> {
    const resp = await fetch(url, { method: 'DELETE' });
    // 204/200 ok; 404 = ya no está (idempotente). Otros → error para reintentar.
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`No se pudo borrar el estudio crudo (${resp.status}).`);
    }
  }
}
