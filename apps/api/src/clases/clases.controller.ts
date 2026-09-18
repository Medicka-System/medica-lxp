import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ClasesService } from './clases.service';
import { crearClaseSchema } from './dto';
import type { ClaseFila } from './clases.repositorio';

/**
 * Clases en vivo (§9 · Sprint 6). Dominio: crear/agendar (habla con Zoom) e iniciar
 * (lanza la clase). El listado/consulta va web→Supabase directo (Regla de Oro §2).
 */
@Controller('clases')
export class ClasesController {
  constructor(private readonly clases: ClasesService) {}

  /** Crea/agenda una clase (Zoom o MiCo+) y registra la reunión. */
  @Post()
  @HttpCode(201)
  crear(@Body() body: unknown): Promise<ClaseFila> {
    const parsed = crearClaseSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.clases.crearClase(parsed.data);
  }

  /** "Iniciar clase": marca `en_curso` y entrega el enlace de inicio del host. */
  @Post(':id/iniciar')
  @HttpCode(200)
  iniciar(
    @Param('id') id: string,
  ): Promise<{ claseId: string; enlaceInicio: string }> {
    return this.clases.iniciarClase(id);
  }
}
