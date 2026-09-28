import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from '../dicom/storage.service';

/**
 * Adjuntos de las ENTREGAS de tareas (§5C). El `api` es el único FIRMANTE (§3): emite
 * URLs firmadas de vida corta para que el navegador del alumno suba el archivo directo
 * a object storage y para leerlo después — el binario nunca pasa por el `api` ni por
 * Postgres. La entrega en sí (fila `lxp.entregas`) la escribe el `web` bajo RLS; aquí
 * solo se firma el objeto. NO hay anonimización: el adjunto de una tarea NO es DICOM
 * de paciente (§10) — un DICOM se sube por la bitácora, que sí anonimiza.
 */
@Injectable()
export class EntregasService {
  constructor(private readonly storage: StorageService) {}

  /**
   * Clave estable del adjunto de una entrega: una por lección×alumno, así el reenvío
   * sobrescribe en vez de acumular. El nombre original se sanea para que sea una key
   * S3 válida (se conserva el nombre real en `contenido.archivo.nombre`).
   */
  private clave(leccionId: string, alumnoId: string, nombre: string): string {
    const base = nombre
      .normalize('NFKD')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120) || 'archivo';
    return `entregas/${leccionId}/${alumnoId}/${base}`;
  }

  private validarId(v: unknown, campo: string): string {
    if (typeof v !== 'string' || !v.trim()) {
      throw new BadRequestException(`${campo} es obligatorio.`);
    }
    return v.trim();
  }

  /** Paso 1: firma la subida (PUT) del adjunto y devuelve la key a guardar en la entrega. */
  solicitarSubida(input: {
    leccionId: unknown;
    alumnoId: unknown;
    nombre: unknown;
  }): { key: string; urlSubida: string } {
    const leccionId = this.validarId(input.leccionId, 'leccionId');
    const alumnoId = this.validarId(input.alumnoId, 'alumnoId');
    const nombre = typeof input.nombre === 'string' && input.nombre.trim() ? input.nombre.trim() : 'archivo';
    const key = this.clave(leccionId, alumnoId, nombre);
    // PÚBLICA: el navegador del alumno sube el adjunto directo a storage.
    return { key, urlSubida: this.storage.firmarSubida(key, undefined, true) };
  }

  /** Firma la lectura (GET) de vida corta del adjunto ya subido. */
  firmarLectura(input: { key: unknown }): { url: string } {
    const key = this.validarId(input.key, 'key');
    if (!key.startsWith('entregas/')) {
      throw new BadRequestException('key fuera del espacio de entregas.');
    }
    return { url: this.storage.firmarLectura(key, undefined, true) }; // PÚBLICA: descarga desde el navegador
  }
}
