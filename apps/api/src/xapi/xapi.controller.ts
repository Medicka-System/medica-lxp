import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { statementSchema } from '@campus/shared';
import { XapiService } from './xapi.service';

/**
 * Endpoints xAPI del `api` (§7):
 *  - POST /xapi/statements → valida y ENCOLA hacia el LRS (202, asíncrono).
 *  - GET  /xapi/statements → LEE del LRS (competencia/analítica).
 */
@Controller('xapi')
export class XapiController {
  constructor(private readonly xapi: XapiService) {}

  @Post('statements')
  @HttpCode(202)
  async emitir(
    @Body() body: unknown,
  ): Promise<{ encolado: true; jobId: string; statementId?: string }> {
    const parsed = statementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const jobId = await this.xapi.encolar(parsed.data);
    return { encolado: true, jobId, statementId: parsed.data.id };
  }

  @Get('statements')
  async consultar(
    @Query('agent') agent?: string,
    @Query('verb') verb?: string,
    @Query('activity') activity?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.xapi.consultarStatements({
      agent,
      verb,
      activity,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
