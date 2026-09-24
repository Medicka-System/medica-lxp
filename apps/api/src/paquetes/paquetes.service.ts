import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { DbService } from '../db/db.service';
import { StorageService } from '../dicom/storage.service';
import { clavePaquete } from '../media/claves';
import {
  analizarManifiesto,
  type ManifiestosCandidatos,
  type ResultadoManifiesto,
} from './manifiesto';
import { insertarContenidoPaquete } from './paquetes.repositorio';

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
