import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  HerenciaService,
  type AplicarOverrideCmd,
} from './herencia.service';
import type { AvisoResync, EntidadOverride, VistaEfectiva } from './herencia.types';
import type { GrupoInfo } from './herencia.repositorio';

/**
 * Herencia programa→grupo (§2 · Sprint 4.5). Expone lo que NO es CRUD simple:
 * resolver la vista efectiva (cómputo plantilla+overrides) y aplicar/revertir
 * overrides con validación de dominio. El listado plano de grupos/programas va
 * directo `web → Supabase` con RLS (Regla de Oro), no por aquí.
 */
@Controller('herencia/grupos/:grupoId')
export class HerenciaController {
  constructor(private readonly herencia: HerenciaService) {}

  /** Vista efectiva del grupo: heredado vs personalizado + avisos de re-sync. */
  @Get('vista')
  vista(
    @Param('grupoId') grupoId: string,
  ): Promise<{ grupo: GrupoInfo } & VistaEfectiva> {
    return this.herencia.vistaDeGrupo(grupoId);
  }

  /** Solo los avisos de re-sincronización del grupo. */
  @Get('resync')
  resync(@Param('grupoId') grupoId: string): Promise<AvisoResync[]> {
    return this.herencia.resyncDeGrupo(grupoId);
  }

  /** Aplica/actualiza un override (personaliza una entidad heredada). */
  @Post('overrides')
  @HttpCode(200)
  aplicar(
    @Param('grupoId') grupoId: string,
    @Body() body: AplicarOverrideCmd,
  ): Promise<{ aplicado: true; entidad: EntidadOverride; entidad_id: string }> {
    return this.herencia.aplicarOverride(grupoId, body);
  }

  /** Revierte una entidad a heredada (borra su override). */
  @Delete('overrides/:entidad/:entidadId')
  @HttpCode(200)
  revertir(
    @Param('grupoId') grupoId: string,
    @Param('entidad') entidad: EntidadOverride,
    @Param('entidadId') entidadId: string,
  ): Promise<{ revertido: true }> {
    return this.herencia.revertir(grupoId, entidad, entidadId);
  }
}
