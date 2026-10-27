import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { DbService } from '../db/db.service';
import { StorageService } from '../dicom/storage.service';
import { ColasProducer } from '../colas/colas-producer';
import { basePaquete, clavePaquete } from '../media/claves';
import {
  analizarManifiesto,
  type ManifiestosCandidatos,
  type ResultadoManifiesto,
} from './manifiesto';
import { insertarContenidoPaquete } from './paquetes.repositorio';
import {
  QUEUE_BORRAR_PAQUETE,
  QUEUE_EXTRAER_PAQUETE,
  type BorrarPaqueteJob,
  type ExtraerPaqueteJob,
  type FirmarExtraccionResultado,
} from './extraccion.contrato';

export interface IngestaResultado {
  contenidoId: string;
  tipo: string;
  titulo: string;
  entryPoint: string | null;
  /** Clave del .zip en object storage (para que el web guarde el lxp.recursos · §5C). */
  recursoRef: string;
}

/**
 * Ingesta de paquetes SCORM/xAPI (§7 · course builder + biblioteca §5C). Flujo de
 * DOMINIO (no proxy de CRUD · §2): descomprime → VALIDA el manifiesto → sube el .zip a
 * object storage. Si viene `leccionId`, además registra la fila `lxp.contenidos` (tipo
 * scorm|xapi) que el player del Sprint 6 sabe reproducir; si NO (modo Biblioteca), solo
 * valida+guarda y devuelve la ref para que el web cree el lxp.recursos. El binario nunca
 * vive en Postgres (§3): solo su referencia.
 */
@Injectable()
export class PaquetesService {
  private readonly logger = new Logger(PaquetesService.name);

  constructor(
    private readonly db: DbService,
    private readonly storage: StorageService,
    private readonly colas: ColasProducer,
  ) {}

  async ingestar(
    archivo: Buffer,
    datos: { leccionId?: string; orden?: number; titulo?: string },
  ): Promise<IngestaResultado> {
    if (!archivo || archivo.length === 0) {
      throw new BadRequestException('El paquete llegó vacío.');
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(archivo);
    } catch (e) {
      throw new BadRequestException(`El archivo no es un .zip válido: ${(e as Error).message}`);
    }

    const candidatos = this.extraerCandidatos(zip);
    let info: ResultadoManifiesto;
    try {
      info = analizarManifiesto(candidatos);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const contenidoId = randomUUID();
    const recursoRef = clavePaquete(contenidoId);
    await this.subirPaquete(recursoRef, archivo);

    // Extracción ASÍNCRONA al prefijo público (worker `extraer-paquete` · Pieza 1 §7):
    // descomprime el .zip y sirve sus archivos con rutas relativas para el iframe del
    // lector. No bloquea la ingesta; el binario no vuelve a pasar por el `api` (§3). Se
    // encola en AMBOS modos (lección y Biblioteca): la clave de salida se deriva del
    // `contenidoId`, no depende de la fila que el web crea después.
    const job: ExtraerPaqueteJob = { contenidoId };
    await this.colas.encolar(QUEUE_EXTRAER_PAQUETE, job);

    const titulo = datos.titulo?.trim() || info.titulo;

    // Modo Biblioteca (§5C): sin lección → solo validar + guardar. El web crea el
    // lxp.recursos (CRUD directo web→Supabase bajo RLS · Regla de Oro §2).
    if (!datos.leccionId) {
      this.logger.log(`Paquete ${info.tipo} para Biblioteca: ${contenidoId} ("${titulo}") → ${recursoRef}.`);
      return { contenidoId, tipo: info.tipo, titulo, entryPoint: info.entryPoint, recursoRef };
    }

    const fila = await insertarContenidoPaquete(this.db.sql, {
      id: contenidoId,
      leccionId: datos.leccionId,
      tipo: info.tipo,
      titulo,
      recursoRef,
      entryPoint: info.entryPoint,
      orden: datos.orden ?? 0,
    });

    this.logger.log(
      `Paquete ${info.tipo} ingerido: contenido ${fila.id} ("${fila.titulo}") → ${recursoRef}.`,
    );
    return {
      contenidoId: fila.id,
      tipo: fila.tipo,
      titulo: fila.titulo,
      entryPoint: info.entryPoint,
      recursoRef,
    };
  }

  /** Busca imsmanifest.xml / tincan.xml en el zip (prefiere el más cercano a la raíz). */
  private extraerCandidatos(zip: AdmZip): ManifiestosCandidatos {
    const entradas = zip
      .getEntries()
      .filter((e) => !e.isDirectory)
      .sort((a, b) => a.entryName.length - b.entryName.length); // raíz primero

    const out: ManifiestosCandidatos = {};
    for (const e of entradas) {
      const base = e.entryName.split('/').pop()?.toLowerCase();
      if (base === 'imsmanifest.xml' && !out.imsmanifest) {
        out.imsmanifest = e.getData().toString('utf8');
      } else if (base === 'tincan.xml' && !out.tincan) {
        out.tincan = e.getData().toString('utf8');
      }
    }
    return out;
  }

  /**
   * Resuelve el LANZADOR público del paquete descomprimido para el iframe del lector
   * (Pieza 1 §7). `lanzadorUrl` = URL pública (sin firma) del `entryPoint` bajo el prefijo
   * anonymous-download; `listo` = el archivo de arranque YA existe en storage (la extracción
   * del worker terminó). El estado "listo" se deriva de STORAGE, no de un flag en BD (sin
   * carrera entre la ingesta y la fila que el web crea después).
   */
  async resolverLanzador(
    contenidoId: string,
    entryPoint: string,
  ): Promise<{ lanzadorUrl: string; listo: boolean }> {
    const lanzadorUrl = this.storage.urlPublicaEntryPoint(contenidoId, entryPoint);
    const entryKey = this.storage.clavePaqueteExtraido(contenidoId, entryPoint);
    const claves = await this.storage.listarPrefijo(entryKey);
    return { lanzadorUrl, listo: claves.includes(entryKey) };
  }

  /**
   * ENCOLA el borrado del paquete (job `borrar-paquete`): no bloquea la eliminación del
   * recurso en el web y reintenta si el storage falla. El web lo pide cuando un recurso
   * SCORM/xAPI se elimina (usos===0) o se reemplaza (queda el binario viejo huérfano).
   */
  async solicitarBorrado(contenidoId: string): Promise<{ encolado: boolean }> {
    const job: BorrarPaqueteJob = { contenidoId };
    await this.colas.encolar(QUEUE_BORRAR_PAQUETE, job);
    return { encolado: true };
  }

  /**
   * PURGA de storage ambos prefijos del paquete: el `.zip` privado (`media/paquetes/{id}/`)
   * y el árbol extraído público (`media/paquetes-extraidos/{id}/`). Lo ejecuta el worker
   * (el `api` es la autoridad de storage · §3); idempotente (prefijo vacío → 0). Devuelve
   * cuántas claves borró de cada prefijo.
   */
  async purgarPaquete(contenidoId: string): Promise<{ zip: number; extraido: number }> {
    const zip = await this.storage.borrarPrefijo(basePaquete(contenidoId));
    const extraido = await this.storage.borrarPrefijo(this.storage.basePaqueteExtraido(contenidoId));
    this.logger.log(`Paquete ${contenidoId} purgado: ${zip} del .zip + ${extraido} del extraído.`);
    return { zip, extraido };
  }

  /**
   * Firma las URLs de la EXTRACCIÓN para el worker (patrón worker→servicio, como
   * `firmar-anonimizados` del DICOM · §3/§10): el `api` es el ÚNICO firmante. Devuelve
   * SIEMPRE el GET interno del .zip; si llegan `entryNames`, además un PUT interno por
   * archivo del paquete descomprimido, bajo el prefijo público (`clavePaqueteExtraido`).
   * `publico=false`: el worker opera contra el endpoint interno de Docker.
   */
  firmarExtraccion(contenidoId: string, entryNames: string[]): FirmarExtraccionResultado {
    const urlLecturaZip = this.storage.firmarLectura(clavePaquete(contenidoId));
    const subidas = entryNames.map((entryName) => ({
      entryName,
      url: this.storage.firmarSubida(this.storage.clavePaqueteExtraido(contenidoId, entryName)),
    }));
    return { urlLecturaZip, subidas };
  }

  /** Sube el .zip a object storage con URL firmada (PUT). El binario no pasa por Postgres. */
  private async subirPaquete(recursoRef: string, archivo: Buffer): Promise<void> {
    const url = this.storage.firmarSubida(recursoRef);
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/zip' },
      body: archivo,
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      throw new Error(`Subida del paquete a object storage falló ${res.status}: ${cuerpo.slice(0, 200)}`);
    }
  }
}
