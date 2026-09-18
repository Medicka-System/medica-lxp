import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  OPCIONES_REINTENTO_DOMINIO,
  QUEUE_RENDER_TTS,
  type RenderTtsJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { StorageService } from '../dicom/storage.service';
import { claveAudioTts } from '../media/claves';
import { TtsConfigService } from './config/tts-config.service';
import { TtsProveedorFactory } from './proveedores/tts-proveedor.factory';
import {
  cargarAudio,
  insertarAudioProcesando,
  marcarAudioError,
  marcarAudioListo,
  type FilaAudio,
} from './tts.repositorio';
import type { SolicitarTts } from './dto';

export interface SolicitudRenderResultado {
  audioId: string;
  estado: string;
  proveedor: string;
  voz: string;
}

export interface EstadoAudioResultado {
  audioId: string;
  estado: string;
  recursoRef: string | null;
  error: string | null;
  urlReproduccion?: string;
}

/**
 * Servicio de TTS (course builder). Orquesta la síntesis con un adaptador
 * INTERCAMBIABLE (§3, patrón model-agnostic de Eco · §7A): lee la config activa de
 * `lxp.tts_config`, sintetiza con el proveedor configurado (OpenAI hoy) y guarda el
 * binario en object storage — NUNCA en Postgres. El render es ASÍNCRONO (cola
 * `render-tts` + worker con buffer/retry), como el resto de jobs pesados (§8). Esto
 * NO es proxy de CRUD (§2): sintetizar y persistir un artefacto generado es dominio,
 * no algo que pueda vivir en el cliente ni en una policy.
 */
@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(
    private readonly db: DbService,
    private readonly storage: StorageService,
    private readonly colas: ColasProducer,
    private readonly config: TtsConfigService,
    private readonly factory: TtsProveedorFactory,
  ) {}

  /**
   * Pre-registra el audio (estado `procesando`), fija proveedor/voz de la config
   * (con overrides puntuales) y ENCOLA el render. Devuelve de inmediato (no bloquea).
   * Es también el gancho que Eco usa para orquestar la narración de un contenido.
   */
  async solicitarRender(datos: SolicitarTts): Promise<SolicitudRenderResultado> {
    const cfg = await this.config.activa();
    const fila = await insertarAudioProcesando(this.db.sql, {
      contenidoId: datos.contenidoId ?? null,
      texto: datos.texto,
      proveedor: cfg.proveedor,
      modelo: datos.modelo ?? cfg.modelo,
      voz: datos.voz ?? cfg.voz,
      velocidad: datos.velocidad ?? cfg.velocidad,
      formato: datos.formato ?? cfg.formato,
      creadoPor: datos.creadoPor ?? null,
    });

    const job: RenderTtsJob = { audioId: fila.id };
    await this.colas.encolar(QUEUE_RENDER_TTS, job, OPCIONES_REINTENTO_DOMINIO);
    this.logger.log(`TTS encolado: audio ${fila.id} (${fila.proveedor}/${fila.voz}).`);

    return {
      audioId: fila.id,
      estado: fila.estado,
      proveedor: fila.proveedor,
      voz: fila.voz,
    };
  }

  /**
   * Renderiza un audio pendiente: sintetiza con el proveedor configurado, sube el
   * binario a object storage con URL firmada y marca `listo`. Lo dispara el worker
   * `render-tts` (buffer/retry). Ante fallo: marca `error` y RELANZA (BullMQ reintenta).
   */
  async render(audioId: string): Promise<{ audioId: string; estado: string }> {
    const fila = await cargarAudio(this.db.sql, audioId);
    if (!fila) throw new NotFoundException(`Audio TTS ${audioId} no existe.`);
    if (fila.estado === 'listo' && fila.recurso_ref) {
      return { audioId, estado: 'listo' }; // idempotente: ya rendido.
    }

    try {
      const proveedor = this.factory.obtener(fila.proveedor);
      const resp = await proveedor.sintetizar({
        texto: fila.texto,
        modelo: fila.modelo,
        voz: fila.voz,
        velocidad: Number(fila.velocidad),
        formato: fila.formato,
      });

      const recursoRef = claveAudioTts(audioId, resp.formato);
      await this.subirAudio(recursoRef, resp.audio, resp.mime);
      await marcarAudioListo(this.db.sql, audioId, recursoRef);
      this.logger.log(`TTS listo: audio ${audioId} → ${recursoRef} (${resp.audio.length} bytes).`);
      return { audioId, estado: 'listo' };
    } catch (e) {
      const motivo = (e as Error).message;
      await marcarAudioError(this.db.sql, audioId, motivo);
      this.logger.warn(`TTS falló para ${audioId}: ${motivo}`);
      throw e; // relanza → el worker reintenta con backoff.
    }
  }

  /** Estado del audio + URL de lectura firmada (vida corta) si ya está `listo`. */
  async estado(audioId: string): Promise<EstadoAudioResultado> {
    const fila = await cargarAudio(this.db.sql, audioId);
    if (!fila) throw new NotFoundException(`Audio TTS ${audioId} no existe.`);
    const base: EstadoAudioResultado = {
      audioId,
      estado: fila.estado,
      recursoRef: fila.recurso_ref,
      error: fila.error,
    };
    if (fila.estado === 'listo' && fila.recurso_ref) {
      base.urlReproduccion = this.storage.firmarLectura(fila.recurso_ref);
    }
    return base;
  }

  /** Sube el binario del audio a object storage con la URL firmada (PUT). */
  private async subirAudio(recursoRef: string, audio: Buffer, mime: string): Promise<void> {
    const url = this.storage.firmarSubida(recursoRef);
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': mime },
      body: audio,
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => '');
      throw new Error(`Subida a object storage falló ${res.status}: ${cuerpo.slice(0, 200)}`);
    }
  }
}

/** Re-export para el que quiera el tipo de fila sin importar el repositorio. */
export type { FilaAudio };
