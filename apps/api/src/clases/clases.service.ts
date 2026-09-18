import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  QUEUE_INGESTA_GRABACION_ZOOM,
  type IngestaGrabacionZoomJob,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { StorageService } from '../dicom/storage.service';
import { ZoomService } from './zoom.service';
import { claveGrabacion } from '../media/claves';
import type { CrearClase } from './dto';
import {
  cargarClase,
  cargarClasePorReunion,
  insertarClase,
  insertarGrabacionProcesando,
  marcarClaseEnCurso,
  type ClaseFila,
} from './clases.repositorio';

/** Forma mínima del payload `recording.completed` de Zoom que consumimos (§9). */
export interface ZoomRecordingCompleted {
  meetingId: string;
  /** Ficheros de grabación; tomamos el primero reproducible (MP4). */
  archivos: Array<{
    id?: string;
    tipo?: string;
    urlDescarga: string;
  }>;
  tokenDescarga?: string;
  cruda?: Record<string, unknown>;
}

/**
 * Dominio de clases en vivo (§9 · Sprint 6). Crea/agenda reuniones (Zoom/MiCo+), las
 * lanza y orquesta la ingesta de grabaciones. NO proxya CRUD: el listado va
 * web→Supabase; aquí vive lo que habla con Zoom, firma storage o encola trabajo (§2).
 */
@Injectable()
export class ClasesService {
  private readonly logger = new Logger(ClasesService.name);

  constructor(
    private readonly db: DbService,
    private readonly zoom: ZoomService,
    private readonly storage: StorageService,
    private readonly colas: ColasProducer,
  ) {}

  /** Crea/agenda una clase: reunión en la plataforma + fila en `lxp.clases`. */
  async crearClase(datos: CrearClase): Promise<ClaseFila> {
    // MiCo+ (Mindray): sin API pública confirmada → solo se enlaza/agenda (§9).
    if (datos.plataforma === 'mico_plus') {
      return insertarClase(this.db.sql, {
        ...datos,
        enlaceUnion: datos.enlaceExterno,
        reunionExterna: { plataforma: 'mico_plus', enlace: datos.enlaceExterno },
      });
    }

    const reunion = await this.zoom.crearReunion({
      titulo: datos.titulo,
      inicioProgramado: datos.inicioProgramado,
      duracionMin: datos.duracionMin,
    });
    return insertarClase(this.db.sql, {
      ...datos,
      reunionExternaId: reunion.reunionExternaId,
      enlaceUnion: reunion.enlaceUnion,
      enlaceInicio: reunion.enlaceInicio,
      reunionExterna: reunion.cruda,
    });
  }

  /** "Iniciar clase": marca `en_curso` y devuelve el enlace de inicio del host. */
  async iniciarClase(
    claseId: string,
  ): Promise<{ claseId: string; enlaceInicio: string }> {
    const clase = await cargarClase(this.db.sql, claseId);
    if (!clase) throw new NotFoundException(`Clase ${claseId} no existe.`);
    if (!clase.enlace_inicio) {
      throw new ConflictException(
        `Clase ${claseId} sin enlace de inicio (¿MiCo+ o reunión no creada?).`,
      );
    }
    await marcarClaseEnCurso(this.db.sql, claseId);
    return { claseId, enlaceInicio: clase.enlace_inicio };
  }

  /**
   * Procesa un webhook `recording.completed` (firma YA validada por el controller):
   * resuelve la clase por el id de reunión, pre-registra la grabación en videoteca
   * (`procesando`), firma su subida y encola `ingesta-grabacion-zoom`. Las grabaciones
   * NO se quedan en Zoom Cloud (§9): el worker las mueve a object storage.
   */
  async ingestarGrabacion(
    ev: ZoomRecordingCompleted,
  ): Promise<{ encolado: boolean; motivo?: string; jobId?: string; videotecaId?: string }> {
    const clase = await cargarClasePorReunion(this.db.sql, ev.meetingId);
    if (!clase) {
      // Reunión desconocida (no creada por el LXP): se ignora, no es error.
      this.logger.warn(`Grabación de reunión desconocida ${ev.meetingId}: ignorada.`);
      return { encolado: false, motivo: 'reunion_desconocida' };
    }
    const archivo =
      ev.archivos.find((a) => (a.tipo ?? '').toUpperCase() === 'MP4') ?? ev.archivos[0];
    if (!archivo?.urlDescarga) {
      return { encolado: false, motivo: 'sin_archivo_descargable' };
    }

    const grabacion = await insertarGrabacionProcesando(this.db.sql, clase, ev.cruda ?? {});
    const refDestino = claveGrabacion(grabacion.id);

    const job: IngestaGrabacionZoomJob = {
      videotecaId: grabacion.id,
      claseId: clase.id,
      refDestino,
      urlDescargaZoom: archivo.urlDescarga,
      tokenDescarga: ev.tokenDescarga,
      urlSubidaDestino: this.storage.firmarSubida(refDestino),
      docenteId: clase.docente_id ?? undefined,
      titulo: clase.titulo,
    };
    const jobId = await this.colas.encolar(QUEUE_INGESTA_GRABACION_ZOOM, job);
    return { encolado: true, jobId, videotecaId: grabacion.id };
  }
}
