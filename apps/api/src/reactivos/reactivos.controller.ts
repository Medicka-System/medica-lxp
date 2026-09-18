import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReactivosService, type ImportResultado } from './reactivos.service';
import { importarReactivosSchema } from './dto';

/**
 * Import de reactivos de autoevaluación (§7A · course builder). Recibe el CSV/Excel
 * (multipart, campo `archivo`) + `actividadId`, lo parsea/valida y reemplaza el banco
 * de la actividad. El banco alimenta la auto-calificación de Eco (§7A).
 */
@Controller('reactivos')
export class ReactivosController {
  constructor(private readonly reactivos: ReactivosService) {}

  @Post('importar')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('archivo'))
  importar(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body() body: unknown,
  ): Promise<ImportResultado> {
    const parsed = importarReactivosSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    if (!archivo?.buffer) {
      throw new BadRequestException('Falta el archivo (campo multipart "archivo").');
    }
    return this.reactivos.importar(archivo.buffer, parsed.data);
  }
}
