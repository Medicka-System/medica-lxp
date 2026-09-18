import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ValidacionService, type ResultadoValidacion } from './validacion.service';

/** Cuerpo de una decisión de validación. */
interface DecisionBody {
  /** Docente que decide (en Sprint 9 vendrá del JWT; hoy del cuerpo, como el resto). */
  docenteId?: string;
  feedback?: string;
  /** Corrección del docente sobre la sugerencia de Eco (§7A). */
  correccionSobreEco?: unknown;
}

/**
 * Validación del docente sobre un caso de bitácora (§5B/§7A · Sprint 5).
 * Dominio/orquestación, no proxy de CRUD (§2): asentar la decisión dispara el
 * recálculo de competencia y la emisión de xAPI. La LECTURA de la bitácora va
 * directa `web → Supabase` con RLS.
 */
@Controller('validacion/casos/:casoId')
export class ValidacionController {
  constructor(private readonly validacion: ValidacionService) {}

  /** El docente APRUEBA el caso → competencia + xAPI. */
  @Post('aprobar')
  @HttpCode(200)
  aprobar(
    @Param('casoId') casoId: string,
    @Body() body: DecisionBody,
  ): Promise<ResultadoValidacion> {
    if (!body?.docenteId) throw new BadRequestException('docenteId es requerido');
    return this.validacion.aprobar(
      casoId,
      body.docenteId,
      body.feedback,
      body.correccionSobreEco,
    );
  }

  /** El docente RECHAZA el caso (feedback recomendado) → sin competencia. */
  @Post('rechazar')
  @HttpCode(200)
  rechazar(
    @Param('casoId') casoId: string,
    @Body() body: DecisionBody,
  ): Promise<ResultadoValidacion> {
    if (!body?.docenteId) throw new BadRequestException('docenteId es requerido');
    return this.validacion.rechazar(
      casoId,
      body.docenteId,
      body.feedback,
      body.correccionSobreEco,
    );
  }
}
