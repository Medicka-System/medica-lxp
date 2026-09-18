import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  AteneoService,
  type ResultadoModeracion,
  type ResultadoPublicacion,
  type ResultadoSello,
} from './ateneo.service';
import type { ModeracionDecision } from './ateneo.repositorio';

interface SelloBody {
  docenteId?: string;
  /** `false` para retirar el sello; por defecto sella. */
  sellar?: boolean;
}

interface ModeracionBody {
  docenteId?: string;
  decision?: ModeracionDecision;
}

/**
 * Dominio del Ateneo (§5B/§7 · Sprint 5). Solo lo que dispara side-effects:
 *  - sello de autoridad del docente (comentario/post) → emite xAPI;
 *  - publicar un caso validado y anonimizado al feed (idempotente) → emite xAPI.
 * El feed, comentarios y upvotes simples van directo `web → Supabase` (§2).
 */
@Controller('ateneo')
export class AteneoController {
  constructor(private readonly ateneo: AteneoService) {}

  /** Sella (o retira el sello) de un comentario de interconsulta. */
  @Post('comentarios/:comentarioId/sello')
  @HttpCode(200)
  sellarComentario(
    @Param('comentarioId') comentarioId: string,
    @Body() body: SelloBody,
  ): Promise<ResultadoSello> {
    if (!body?.docenteId) throw new BadRequestException('docenteId es requerido');
    return this.ateneo.sellarComentario(
      comentarioId,
      body.docenteId,
      body.sellar ?? true,
    );
  }

  /** Modera un post del Ateneo (aprobar/rechazar). */
  @Post('posts/:postId/moderar')
  @HttpCode(200)
  moderarPost(
    @Param('postId') postId: string,
    @Body() body: ModeracionBody,
  ): Promise<ResultadoModeracion> {
    if (!body?.docenteId) throw new BadRequestException('docenteId es requerido');
    if (body.decision !== 'aprobado' && body.decision !== 'rechazado') {
      throw new BadRequestException('decision debe ser aprobado | rechazado');
    }
    return this.ateneo.moderar(postId, body.docenteId, body.decision);
  }

  /** Publica un caso aprobado y anonimizado al feed de la comunidad (idempotente). */
  @Post('casos/:casoId/publicar')
  @HttpCode(200)
  publicarCaso(@Param('casoId') casoId: string): Promise<ResultadoPublicacion> {
    return this.ateneo.publicarCaso(casoId);
  }
}
