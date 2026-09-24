import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { H5pService } from './h5p.service';
import { guardarH5pSchema } from './dto';

/**
 * Endpoints del H5P server (§3/§7 · course builder). Cubren lo que el editor del web
 * necesita: el AJAX del hub/librerías, guardar/servir contenido y reproducirlo. El
 * RBAC real lo pondrá el guard de auth (pendiente · §10); por ahora el usuario H5P se
 * deriva de `x-user-id` (fallback `studio`) — H5P exige un usuario para permisos.
 */
@Controller('h5p')
export class H5pController {
  constructor(private readonly h5p: H5pService) {}

  private usuario(userId?: string) {
    return H5pService.usuario(userId?.trim() || 'studio');
  }

  /** AJAX GET: content-type-cache, libraries, etc. (lo consume el editor del web). */
  @Get('ajax')
  ajaxGet(
    @Query('action') action: string,
    @Query('machineName') machineName: string,
    @Query('majorVersion') majorVersion: string,
    @Query('minorVersion') minorVersion: string,
    @Query('language') language: string,
    @Headers('x-user-id') userId: string,
  ): Promise<unknown> {
    if (!action) throw new BadRequestException('Falta ?action.');
    return this.h5p.ajaxGet(
      action,
      { machineName, majorVersion, minorVersion, language },
      this.usuario(userId),
    );
  }

  /** AJAX POST: libraries, translations, filter, files (subida), get-content, etc. */
  @Post('ajax')
  @UseInterceptors(FileInterceptor('file'))
  ajaxPost(
    @Query('action') action: string,
    @Body() body: unknown,
    @Headers('x-user-id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<unknown> {
    if (!action) throw new BadRequestException('Falta ?action.');
    const archivo = file
      ? { data: file.buffer, mimetype: file.mimetype, name: file.originalname, size: file.size }
      : undefined;
    return this.h5p.ajaxPost(action, body, this.usuario(userId), archivo);
  }

  /** Guarda (crea/actualiza) el contenido H5P y lo enlaza a la lección. */
  @Post('contenido')
  guardar(
    @Body() body: unknown,
    @Headers('x-user-id') userId: string,
  ): Promise<{ contentId: string; registrado: boolean }> {
    const parsed = guardarH5pSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.h5p.guardarContenido({ ...parsed.data, usuario: this.usuario(userId) });
  }

  /** Sube un PAQUETE .h5p a la Biblioteca de Contenido (§5C) y devuelve su contentId. */
  @Post('paquete')
  @UseInterceptors(FileInterceptor('archivo'))
  subirPaquete(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body() body: unknown,
    @Headers('x-user-id') userId: string,
  ): Promise<{ contentId: string; titulo: string }> {
    if (!archivo?.buffer) {
      throw new BadRequestException('Falta el archivo .h5p (campo multipart "archivo").');
    }
    const titulo =
      body && typeof (body as { titulo?: unknown }).titulo === 'string'
        ? ((body as { titulo: string }).titulo)
        : undefined;
    return this.h5p.subirPaquete({ archivo: archivo.buffer, usuario: this.usuario(userId), titulo });
  }

  /** Modelo del editor para crear un contenido nuevo. */
  @Get('editar')
  nuevo(@Headers('x-user-id') userId: string): Promise<unknown> {
    return this.h5p.paraEditar(undefined, this.usuario(userId));
  }

  /** Modelo del editor para editar un contenido existente. */
  @Get('editar/:id')
  editar(@Param('id') id: string, @Headers('x-user-id') userId: string): Promise<unknown> {
    return this.h5p.paraEditar(id, this.usuario(userId));
  }

  /** Modelo del player para reproducir un contenido en el campus. */
  @Get('contenido/:id/reproducir')
  reproducir(@Param('id') id: string, @Headers('x-user-id') userId: string): Promise<unknown> {
    return this.h5p.reproducir(id, this.usuario(userId));
  }

  /** Sirve un archivo de una librería instalada (assets del content type). */
  @Get('libraries/:ubername/:filename')
  archivoLibreria(
    @Param('ubername') ubername: string,
    @Param('filename') filename: string,
  ): Promise<unknown> {
    return this.h5p.archivoLibreria(ubername, filename);
  }

  /** Sirve un archivo del contenido (media subido al contenido). */
  @Get('contenido/:id/archivo/:filename')
  archivoContenido(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Headers('x-user-id') userId: string,
  ): Promise<unknown> {
    return this.h5p.archivoContenido(id, filename, this.usuario(userId));
  }
}
