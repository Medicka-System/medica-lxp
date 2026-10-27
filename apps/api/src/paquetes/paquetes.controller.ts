import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PaquetesService, type IngestaResultado } from './paquetes.service';
import { ingestarPaqueteSchema } from './dto';
import { firmarExtraccionSchema, type FirmarExtraccionResultado } from './extraccion.contrato';

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

  /**
   * Firma las URLs de la extracción para el worker `extraer-paquete` (§3: el `api` es el
   * único firmante; el binario no pasa por aquí). Sin `entryNames` → solo el GET del .zip;
   * con nombres → los PUT por archivo del paquete descomprimido. Endpoint INTERNO (worker).
   */
  @Post(':contenidoId/firmar-extraccion')
  @HttpCode(200)
  firmarExtraccion(
    @Param('contenidoId') contenidoId: string,
    @Body() body: unknown,
  ): FirmarExtraccionResultado {
    const parsed = firmarExtraccionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.paquetes.firmarExtraccion(contenidoId, parsed.data.entryNames);
  }

  /**
   * Resuelve el lanzador PÚBLICO del paquete descomprimido para el iframe del lector
   * (Pieza 1 · §7): `lanzadorUrl` (URL sin firma del entryPoint) + `listo` (la extracción
   * del worker ya depositó el archivo de arranque en storage). Lo consulta el web al armar
   * la lección; no es CRUD (es convención de storage + existencia · dominio §2).
   */
  @Get(':contenidoId/lanzador')
  lanzador(
    @Param('contenidoId') contenidoId: string,
    @Query('entry') entry: string | undefined,
  ): Promise<{ lanzadorUrl: string; listo: boolean }> {
    const entryPoint = (entry ?? '').trim();
    if (!entryPoint) throw new BadRequestException('Falta el parámetro "entry" (archivo de arranque).');
    return this.paquetes.resolverLanzador(contenidoId, entryPoint);
  }

  /**
   * ENCOLA el borrado del paquete (lo pide el web al eliminar/reemplazar un recurso
   * SCORM/xAPI). No borra en el request: el worker purga storage con reintentos. 202.
   */
  @Post(':contenidoId/borrar')
  @HttpCode(202)
  borrar(@Param('contenidoId') contenidoId: string): Promise<{ encolado: boolean }> {
    return this.paquetes.solicitarBorrado(contenidoId);
  }

  /**
   * EJECUTA la purga de ambos prefijos (zip privado + árbol extraído). Endpoint INTERNO
   * que invoca el worker `borrar-paquete` (el `api` es el firmante de storage · §3).
   */
  @Post(':contenidoId/purgar')
  @HttpCode(200)
  purgar(@Param('contenidoId') contenidoId: string): Promise<{ zip: number; extraido: number }> {
    return this.paquetes.purgarPaquete(contenidoId);
  }
}
