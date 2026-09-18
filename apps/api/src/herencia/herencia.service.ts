import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import {
  detectarResync,
  existeEntidad,
  resolverHerencia,
  validarPatch,
} from './herencia.logic';
import {
  borrarOverride,
  cargarGrupo,
  cargarOverrides,
  cargarPlantilla,
  upsertOverride,
  type GrupoInfo,
} from './herencia.repositorio';
import type {
  AvisoResync,
  EntidadOverride,
  VistaEfectiva,
} from './herencia.types';

/** Comando para aplicar/actualizar un override de un grupo. */
export interface AplicarOverrideCmd {
  entidad: EntidadOverride;
  entidad_id: string;
  patch: Record<string, unknown>;
}

const ENTIDADES: readonly EntidadOverride[] = [
  'programa',
  'modulo',
  'leccion',
  'contenido',
  'actividad',
];

/**
 * Dominio de la herencia programa→grupo (§2 · Sprint 4.5). Resuelve la vista
 * efectiva (cómputo, no CRUD) y aplica overrides validándolos contra la plantilla
 * para que NO la rompan y queden sellados con su versión (re-sincronización).
 */
@Injectable()
export class HerenciaService {
  constructor(private readonly db: DbService) {}

  private async grupoConPlantilla(grupoId: string): Promise<{
    grupo: GrupoInfo;
    plantilla: NonNullable<Awaited<ReturnType<typeof cargarPlantilla>>>;
  }> {
    const grupo = await cargarGrupo(this.db.sql, grupoId);
    if (!grupo) throw new NotFoundException(`Grupo ${grupoId} no existe.`);
    const plantilla = await cargarPlantilla(this.db.sql, grupo.programa_id);
    if (!plantilla) {
      throw new NotFoundException(
        `El programa ${grupo.programa_id} del grupo no existe.`,
      );
    }
    return { grupo, plantilla };
  }

  /** Vista efectiva del grupo: plantilla + overrides, con heredado vs personalizado. */
  async vistaDeGrupo(
    grupoId: string,
  ): Promise<{ grupo: GrupoInfo } & VistaEfectiva> {
    const { grupo, plantilla } = await this.grupoConPlantilla(grupoId);
    const overrides = await cargarOverrides(this.db.sql, grupoId);
    return { grupo, ...resolverHerencia(plantilla, overrides) };
  }

  /**
   * Aplica (o actualiza) un override. Valida: entidad conocida, la entidad existe
   * en la plantilla, y el patch solo toca campos permitidos (si trae claves
   * estructurales → 400, así el override nunca rompe la plantilla).
   */
  async aplicarOverride(
    grupoId: string,
    cmd: AplicarOverrideCmd,
  ): Promise<{ aplicado: true; entidad: EntidadOverride; entidad_id: string }> {
    if (!ENTIDADES.includes(cmd.entidad)) {
      throw new BadRequestException(`Entidad inválida: ${cmd.entidad}`);
    }
    if (!cmd.patch || typeof cmd.patch !== 'object') {
      throw new BadRequestException('patch debe ser un objeto.');
    }

    const { plantilla } = await this.grupoConPlantilla(grupoId);

    if (!existeEntidad(plantilla, cmd.entidad, cmd.entidad_id)) {
      throw new NotFoundException(
        `La ${cmd.entidad} ${cmd.entidad_id} no existe en la plantilla del programa.`,
      );
    }

    const { limpio, oculto, rechazadas } = validarPatch(cmd.entidad, cmd.patch);
    if (rechazadas.length > 0) {
      throw new BadRequestException(
        `El patch toca campos no personalizables de ${cmd.entidad}: ${rechazadas.join(', ')}`,
      );
    }
    if (Object.keys(limpio).length === 0 && !oculto) {
      throw new BadRequestException('El patch no personaliza ningún campo.');
    }

    // Persistimos el patch original (ya validado); la marca `oculto` viaja dentro.
    await upsertOverride(this.db.sql, grupoId, {
      entidad: cmd.entidad,
      entidad_id: cmd.entidad_id,
      patch: cmd.patch,
      version: plantilla.version,
    });
    return { aplicado: true, entidad: cmd.entidad, entidad_id: cmd.entidad_id };
  }

  /** Revierte una entidad a heredada (borra su override). 404 si no la había. */
  async revertir(
    grupoId: string,
    entidad: EntidadOverride,
    entidadId: string,
  ): Promise<{ revertido: true }> {
    if (!ENTIDADES.includes(entidad)) {
      throw new BadRequestException(`Entidad inválida: ${entidad}`);
    }
    const borradas = await borrarOverride(this.db.sql, grupoId, entidad, entidadId);
    if (borradas === 0) {
      throw new NotFoundException(
        `No hay override de ${entidad} ${entidadId} en el grupo ${grupoId}.`,
      );
    }
    return { revertido: true };
  }

  /** Solo los avisos de re-sincronización del grupo (plantilla que avanzó). */
  async resyncDeGrupo(grupoId: string): Promise<AvisoResync[]> {
    const { plantilla } = await this.grupoConPlantilla(grupoId);
    const overrides = await cargarOverrides(this.db.sql, grupoId);
    return detectarResync(plantilla, overrides);
  }
}
