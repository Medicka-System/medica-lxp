import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { calificarAutoevalSchema } from './dto';
import {
  AutoevaluacionService,
  type ResultadoCalificacion,
} from './autoevaluacion.service';

/**
 * Autoevaluación del alumno (§7A). Recibe las respuestas (reenviadas por la server
 * action de `web` con el `alumnoId` ya autenticado), autocalifica lo objetivo,
 * persiste la entrega y reporta al LRS. Devuelve el veredicto por reactivo para que
 * `web` revele la retroalimentación.
 */
@Controller('autoevaluacion')
export class AutoevaluacionController {
  constructor(private readonly autoeval: AutoevaluacionService) {}

  @Post('calificar')
  @HttpCode(200)
  calificar(@Body() body: unknown): Promise<ResultadoCalificacion> {
    const parsed = calificarAutoevalSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.autoeval.calificar(parsed.data);
  }
}
