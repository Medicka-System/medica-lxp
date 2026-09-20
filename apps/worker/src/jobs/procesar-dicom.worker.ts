import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import AdmZip from 'adm-zip';
import {
  QUEUE_PROCESAR_DICOM,
  type DestinoAnonimizado,
  type FirmarAnonimizadosResp,
  type ProcesarDicomJob,
  type TablaEstudioDicom,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { TrabajadorBase } from './trabajador-base';
import {
  anonimizarDicomBinario,
  type ResultadoAnonimizacionBinaria,
} from './dicom/anonimizacion-binaria';

/** Serie anonimizada lista para persistir (metadatos + ref en object storage). */
type SeriePersistida = {
  series_uid: string;
  modalidad: string;
  frames: number;
  instancias: number;
  ref: string;
};

/** Traza auditable agregada del estudio (§10) — forma JSON serializable. */
type TrazaEstudio = {
  motor: string;
  version: string;
  campos_removidos: string[];
  removidos_n: number;
  series_procesadas: number;
  verificado: boolean;
};

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
    const { casoId, tabla, fuentes } = job.data;

    try {
      await this.marcarEstado(tabla, casoId, 'procesando');

      // 1) Traer cada fuente cruda y expandir los zips a `.dcm` individuales.
      const crudos: ArrayBuffer[] = [];
      for (const fuente of fuentes) {
        const bin = await this.leerBinario(fuente.urlLecturaCrudo);
        if (fuente.esZip) {
          crudos.push(...this.expandirZip(bin));
        } else {
          crudos.push(bin);
        }
      }
      if (crudos.length === 0) {
        throw new Error('El estudio no contiene ningún archivo `.dcm` procesable.');
      }

      // 2) Anonimizar + VERIFICAR (bloqueante · §10) cada `.dcm` → una serie por archivo.
      const anonimizados: ResultadoAnonimizacionBinaria[] = crudos.map((c) =>
        anonimizarDicomBinario(c),
      );

      // 3) Pedir al `api` las URLs firmadas de escritura (una por serie). El `api` es
      //    el único firmante (§3); el worker no tiene credenciales de storage.
      const destinos = await this.firmarAnonimizados(casoId, tabla, anonimizados.length);
      if (destinos.length < anonimizados.length) {
        throw new Error('El `api` firmó menos destinos que series a persistir.');
      }

      // 4) Subir cada `.dcm` anonimizado a su destino y armar las series.
      const series: SeriePersistida[] = [];
      for (let i = 0; i < anonimizados.length; i++) {
        const anon = anonimizados[i]!;
        const destino = destinos[i]!;
        await this.subirBinario(destino.urlSubida, anon.buffer);
        const s = anon.series[0];
        series.push({
          series_uid: s?.series_uid ?? '',
          modalidad: s?.modalidad ?? 'US',
          frames: s?.frames ?? 1,
          instancias: s?.instancias ?? 1,
          ref: destino.ref,
        });
      }

      // 5) Borrar los crudos (PII fuera del storage) — idempotente.
      for (const fuente of fuentes) {
        await this.borrarCrudo(fuente.urlBorradoCrudo);
      }

      // 6) Persistir metadatos + traza agregada. La referencia del estudio educativo
      //    se fija SOLO ahora, junto con anonimizado_en (lo exige el CHECK de 0014/0024).
      const traza = this.agregarTraza(anonimizados, destinos);
      await this.guardarEstudio(tabla, casoId, series, traza);

      this.logger.log(
        `Caso ${casoId} (${tabla}) anonimizado: ${series.length} serie(s), ` +
          `${traza.removidos_n} campo(s) PII removido(s).`,
      );
      return { casoId, series: series.length };
    } catch (err) {
      await this.marcarEstado(tabla, casoId, 'error');
      throw err;
    }
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

  /** Pide al `api` las URLs firmadas de escritura de los anonimizados (§3). */
  private async firmarAnonimizados(
    casoId: string,
    tabla: TablaEstudioDicom,
    cantidad: number,
  ): Promise<DestinoAnonimizado[]> {
    const base = process.env.API_URL ?? 'http://localhost:8000';
    const resp = await fetch(
      `${base}/dicom/casos/${encodeURIComponent(casoId)}/ingesta/firmar-anonimizados`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tabla, cantidad }),
      },
    );
    if (!resp.ok) {
      throw new Error(`El api no firmó los anonimizados (${resp.status}).`);
    }
    const { destinos } = (await resp.json()) as FirmarAnonimizadosResp;
    return destinos;
  }

  /** Agrega las trazas por serie en una sola traza auditable del estudio. */
  private agregarTraza(
    anonimizados: ResultadoAnonimizacionBinaria[],
    destinos: DestinoAnonimizado[],
  ): TrazaEstudio {
    const campos = new Set<string>();
    let removidos_n = 0;
    for (const a of anonimizados) {
      for (const c of a.traza.campos_removidos) campos.add(c);
      removidos_n += a.traza.removidos_n;
    }
    const primera = anonimizados[0]!.traza;
    return {
      motor: primera.motor,
      version: primera.version,
      campos_removidos: [...campos].sort(),
      removidos_n,
      series_procesadas: destinos.length,
      verificado: true,
    };
  }

  /** Marca el estado del pipeline en la tabla dueña (bitácora o banco curado). */
  private async marcarEstado(
    tabla: TablaEstudioDicom,
    casoId: string,
    estado: 'procesando' | 'error',
  ): Promise<void> {
    const sql = this.db.sql;
    if (tabla === 'casos_biblioteca') {
      await sql`update lxp.casos_biblioteca set estudio_estado = ${estado} where id = ${casoId}`;
    } else {
      await sql`update lxp.bitacora_casos set estudio_estado = ${estado} where id = ${casoId}`;
    }
  }

  /** Persiste el estudio anonimizado (estado + ref + series + traza) en la tabla dueña. */
  private async guardarEstudio(
    tabla: TablaEstudioDicom,
    casoId: string,
    series: SeriePersistida[],
    traza: TrazaEstudio,
  ): Promise<void> {
    const sql = this.db.sql;
    const refPrimaria = series[0]!.ref;
    if (tabla === 'casos_biblioteca') {
      await sql`
        update lxp.casos_biblioteca
        set estudio_estado    = 'anonimizado',
            estudio_dicom_ref = ${refPrimaria},
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

  private async subirBinario(url: string, buffer: Buffer): Promise<void> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/dicom' },
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
