import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  PublicacionService,
  type ResultadoTransicion,
} from './publicacion.service';
import type { AccionPublicacion, EstadoPublicacion } from './versionado.logic';
import type { VersionMeta } from './publicacion.repositorio';

const ACCIONES: readonly AccionPublicacion[] = [
  'enviar_a_revision',
  'devolver',
  'publicar',
  'reabrir',
  'archivar',
  'reactivar',
];

interface TransicionBody {
  accion?: AccionPublicacion;
  notas?: string;
  actorId?: string;
}

/**
 * Publicación con versionado del programa (§2/§5B · Sprint 4.5). Expone la máquina
 * de estados y el historial de versiones — dominio, no CRUD: la edición del árbol
 * del programa va directa `web → Supabase` con RLS (Regla de Oro).
 */
@Controller('publicacion/programas/:programaId')
export class PublicacionController {
  constructor(private readonly publicacion: PublicacionService) {}

  /** Estado actual + acciones posibles + visibilidad para alumno. */
  @Get('estado')
  estado(@Param('programaId') programaId: string): Promise<{
    programa_id: string;
    nombre: string;
    estado: EstadoPublicacion;
    version: number;
    acciones: AccionPublicacion[];
    visible_para_alumno: boolean;
  }> {
    return this.publicacion.estado(programaId);
  }

  /** Aplica una transición (enviar_a_revision | devolver | publicar | …). */
  @Post('transicion')
  @HttpCode(200)
  transicion(
    @Param('programaId') programaId: string,
    @Body() body: TransicionBody,
  ): Promise<ResultadoTransicion> {
    if (!body?.accion || !ACCIONES.includes(body.accion)) {
      throw new BadRequestException(
        `accion inválida. Usa una de: ${ACCIONES.join(', ')}`,
      );
    }
    return this.publicacion.transicionar(programaId, body.accion, {
      actorId: body.actorId ?? null,
      notas: body.notas ?? null,
    });
  }

  /** Historial de versiones publicadas (metadatos). */
  @Get('historial')
  historial(@Param('programaId') programaId: string): Promise<VersionMeta[]> {
    return this.publicacion.historial(programaId);
  }

  /** Snapshot congelado de una versión concreta. */
  @Get('versiones/:version')
  version(
    @Param('programaId') programaId: string,
    @Param('version', ParseIntPipe) version: number,
  ): Promise<unknown> {
    return this.publicacion.snapshot(programaId, version);
  }
}
