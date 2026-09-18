import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { RubricasService } from './rubricas.service';
import type { RubricaFila } from './rubricas.repositorio';
import {
  actualizarRubricaSchema,
  asignarRubricaSchema,
  crearRubricaSchema,
} from './dto';

/**
 * Rúbricas del catálogo (§5B · course builder). Solo escritura con lógica (validar
 * pesos + indexar-rag); el listado va web→Supabase (§2). No es proxy de CRUD.
 */
@Controller('rubricas')
export class RubricasController {
  constructor(private readonly rubricas: RubricasService) {}

  @Post()
  @HttpCode(201)
  crear(@Body() body: unknown): Promise<RubricaFila> {
    const parsed = crearRubricaSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.rubricas.crear(parsed.data);
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() body: unknown): Promise<RubricaFila> {
    const parsed = actualizarRubricaSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.rubricas.actualizar(id, parsed.data);
  }

  /** Enlaza (o desenlaza con rubricaId=null) una rúbrica a una actividad. */
  @Post('asignar')
  @HttpCode(200)
  asignar(@Body() body: unknown): Promise<{ asignada: boolean }> {
    const parsed = asignarRubricaSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.rubricas.asignar(parsed.data.actividadId, parsed.data.rubricaId);
  }
}
