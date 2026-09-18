import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { PlayersService, type ResultadoProgreso } from './players.service';
import { progresoSchema, scormCommitSchema } from './dto';

/**
 * Players (§7 · Sprint 6). Registra progreso de reproducción y reporta al LRS. Vive en
 * el `api` (no CRUD directo) porque emite xAPI: H5P reporta su propio xAPI; SCORM
 * captura progreso vía su CMI y aquí se traduce a statements.
 */
@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  /** Progreso genérico (video/H5P): persiste y emite `completó` al terminar. */
  @Post('progreso')
  @HttpCode(200)
  progreso(@Body() body: unknown): Promise<ResultadoProgreso> {
    const parsed = progresoSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.players.registrarProgreso(parsed.data);
  }

  /** Commit SCORM: interpreta el CMI, persiste progreso y emite el statement. */
  @Post('scorm/commit')
  @HttpCode(200)
  scorm(@Body() body: unknown): Promise<ResultadoProgreso> {
    const parsed = scormCommitSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.players.commitScorm(parsed.data);
  }
}
