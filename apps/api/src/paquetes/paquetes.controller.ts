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
import { PaquetesService, type IngestaResultado } from './paquetes.service';
import { ingestarPaqueteSchema } from './dto';

/**
 * Ingesta de paquetes SCORM/xAPI (§7 · course builder). Recibe el .zip (multipart,
 * campo `archivo`) + metadatos, valida el manifiesto y lo registra como contenido.
 * Es dominio (validación + object storage + registro), no proxy de CRUD (§2).
 */
@Controller('paquetes')
export class PaquetesController {
  constructor(private readonly paquetes: PaquetesService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('archivo'))
  ingestar(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body() body: unknown,
  ): Promise<IngestaResultado> {
    const parsed = ingestarPaqueteSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    if (!archivo?.buffer) {
      throw new BadRequestException('Falta el archivo del paquete (campo multipart "archivo").');
    }
    return this.paquetes.ingestar(archivo.buffer, parsed.data);
  }
}
