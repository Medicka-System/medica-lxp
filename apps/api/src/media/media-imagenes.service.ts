import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ANCHOS_DERIVADO,
  QUEUE_GENERAR_DERIVADOS_IMAGEN,
  clavesDerivados,
  esImagenContenidoDerivable,
  type DestinoDerivado,
  type GenerarDerivadosImagenJob,
  type TipoDerivado,
} from '@campus/shared';
import { StorageService } from '../dicom/storage.service';
import { ColasProducer } from '../colas/colas-producer';

/**
 * Imágenes de CONTENIDO del course builder (§5C) — las que el diseñador sube en un bloque
 * de IMAGEN de una lección de teoría (diagramas, esquemas, ilustraciones). NO son imágenes
 * de pacientes: no tienen PII, así que NO pasan por el redactor Presidio (eso solo aplica a
 * los flujos de paciente: bitácora, biblioteca de casos y reportes · §10). Subida DIRECTA:
 * se firma un PUT a la clave FINAL y el navegador sube el archivo tal cual a object storage
 * (§2 — el binario nunca pasa por el `api`). La propiedad la gatea el web (`requireAutoria`).
 *
 * También sirve de MEDIA DE CONTENIDO general (imagen + video ligero) para el Ateneo
 * (posts de media, sin PII/redactor): el video preserva su extensión real y su content-type
 * lo fija el PUT del navegador (la firma solo cubre el host, no el content-type · §3).
 */

const EXT_OK = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', // imagen
  'mp4', 'webm', 'mov', 'm4v', 'ogg', // video (Ateneo · sin anonimizador)
]);

@Injectable()
export class MediaImagenesService {
  constructor(
    private readonly storage: StorageService,
    private readonly colas: ColasProducer,
  ) {}

  /**
   * Encola la generación de DERIVADOS responsivos para imágenes de `media/imagenes/*` (feed,
   * avatares, portadas). `tipo` elige el set de anchos (ANCHOS_DERIVADO): el `api` firma TODO
   * por adelantado (§3 único firmante): URL INTERNA de lectura del original + un PUT INTERNO
   * por ancho (el worker corre dentro de Docker y es genérico: genera los anchos del job).
   * Ignora refs no derivables (video/gif/casos/`.dcm`). Best-effort: el consumidor cae al
   * original si un derivado falta. Devuelve cuántos trabajos se encolaron.
   */
  async derivar(refs: unknown, tipo: TipoDerivado = 'contenido'): Promise<{ encolados: number }> {
    const t: TipoDerivado = tipo in ANCHOS_DERIVADO ? tipo : 'contenido';
    const lista = Array.isArray(refs) ? refs.filter((r): r is string => typeof r === 'string') : [];
    const derivables = [...new Set(lista)].filter(esImagenContenidoDerivable);
    for (const ref of derivables) {
      const destinos: DestinoDerivado[] = clavesDerivados(ref, t).map((d) => ({
        ancho: d.ancho,
        ref: d.ref,
        urlSubida: this.storage.firmarSubida(d.ref), // INTERNA (worker en Docker)
      }));
      const job: GenerarDerivadosImagenJob = {
        ref,
        urlLectura: this.storage.firmarLectura(ref), // INTERNA
        destinos,
      };
      await this.colas.encolar(QUEUE_GENERAR_DERIVADOS_IMAGEN, job);
    }
    return { encolados: derivables.length };
  }

  /** Firma la subida DIRECTA a la clave final. El navegador sube el archivo tal cual. */
  firmarSubida(ext: string): { id: string; ext: string; ref: string; urlSubida: string; urlLectura: string } {
    const e = (ext ?? '').toLowerCase();
    // Extensión desconocida → se rechaza. Antes se forzaba a 'jpg', lo que guardaba el
    // binario con la clave/extensión equivocada y lo servía roto (§2: la firma la usa el
    // navegador tal cual). Mejor un 400 explícito que un recurso silenciosamente corrupto.
    if (!EXT_OK.has(e)) {
      throw new BadRequestException(`Extensión no soportada: "${ext}". Permitidas: ${[...EXT_OK].join(', ')}.`);
    }
    const id = randomUUID();
    const ref = this.storage.claveImagenContenido(id, e);
    // PÚBLICAS: el navegador (diseñador) sube y lee la imagen directo a storage.
    return {
      id,
      ext: e,
      ref,
      urlSubida: this.storage.firmarSubida(ref, undefined, true),
      urlLectura: this.storage.firmarLectura(ref, undefined, true),
    };
  }

  /**
   * Firma la lectura de imágenes de contenido (solo claves `media/imagenes/`). Usa firma
   * ESTABLE (Fase 1 entrega): la URL es byte-idéntica dentro de la ventana → el navegador
   * la cachea y deja de re-descargar en cada render/scroll/regreso. Sigue firmada (gating
   * de visibilidad intacto: el feed solo pasa aquí los refs que el usuario puede ver).
   */
  firmarLectura(refs: string[]): { urls: Record<string, string> } {
    if (!Array.isArray(refs)) throw new BadRequestException('refs inválido.');
    const urls: Record<string, string> = {};
    for (const ref of refs) {
      if (typeof ref === 'string' && ref.startsWith('media/imagenes/')) {
        urls[ref] = this.storage.firmarLecturaEstable(ref, undefined, true); // PÚBLICA + cacheable
      }
    }
    return { urls };
  }
}
