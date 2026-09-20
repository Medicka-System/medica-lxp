import { BadRequestException, Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import type { FirmarAnonimizadosReq, TablaEstudioDicom } from '@campus/shared';
import {
  IngestaService,
  type ArchivoSolicitado,
  type LecturaEstudio,
  type SolicitudSubida,
} from './ingesta.service';

const TABLAS: TablaEstudioDicom[] = ['bitacora_casos', 'casos_biblioteca'];

/** Normaliza `tabla` del body (default bitácora); 400 si viene un valor inválido. */
function tablaDe(v: unknown): TablaEstudioDicom {
  if (v === undefined || v === null) return 'bitacora_casos';
  if (typeof v === 'string' && (TABLAS as string[]).includes(v)) return v as TablaEstudioDicom;
  throw new BadRequestException(`tabla inválida: ${String(v)}`);
}

/** Normaliza la lista de fuentes; default = una fuente `.dcm` (indice 0). */
function archivosDe(v: unknown): ArchivoSolicitado[] {
  if (v === undefined || v === null) return [{ indice: 0, esZip: false }];
  if (!Array.isArray(v) || v.length === 0) {
    throw new BadRequestException('archivos debe ser un arreglo no vacío.');
  }
  return v.map((a, i) => {
    const o = (a ?? {}) as Record<string, unknown>;
    const indice = typeof o.indice === 'number' ? o.indice : i;
    return { indice, esZip: o.esZip === true };
  });
}

interface CuerpoIngesta {
  tabla?: TablaEstudioDicom;
  archivos?: ArchivoSolicitado[];
  /** true = anexar al estudio existente (editar); false/omitido = reemplazar. */
  anexar?: boolean;
}

/**
 * Ingesta DICOM (§8/§9 · rediseño multi-serie). Dominio/orquestación, no proxy de
 * CRUD: emite URLs firmadas para subir directo a object storage y encola la
 * anonimización bloqueante. El caso ya existe (bitácora del alumno o banco curado).
 */
@Controller('dicom/casos/:casoId')
export class IngestaController {
  constructor(private readonly ingesta: IngestaService) {}

  /** Firma la subida de las fuentes crudas (el cliente sube cada una directo). */
  @Post('ingesta/solicitar')
  @HttpCode(200)
  solicitar(
    @Param('casoId') casoId: string,
    @Body() cuerpo: CuerpoIngesta = {},
  ): Promise<SolicitudSubida> {
    return this.ingesta.solicitarSubida(casoId, tablaDe(cuerpo.tabla), archivosDe(cuerpo.archivos));
  }

  /** Confirma la subida y encola `procesar-dicom` (descomprime → anonimiza → series). */
  @Post('ingesta/confirmar')
  @HttpCode(202)
  confirmar(
    @Param('casoId') casoId: string,
    @Body() cuerpo: CuerpoIngesta = {},
  ): Promise<{ encolado: true; cola: string; jobId: string }> {
    return this.ingesta.confirmarSubida(
      casoId,
      tablaDe(cuerpo.tabla),
      archivosDe(cuerpo.archivos),
      cuerpo.anexar === true,
    );
  }

  /** Firma la lectura de las series anonimizadas para el visor (409 si no listo). */
  @Post('ingesta/estudio')
  @HttpCode(200)
  estudio(
    @Param('casoId') casoId: string,
    @Body() cuerpo: { tabla?: TablaEstudioDicom } = {},
  ): Promise<LecturaEstudio> {
    return this.ingesta.urlLecturaEstudio(casoId, tablaDe(cuerpo.tabla));
  }

  /**
   * Firma la ESCRITURA de los `.dcm` anonimizados (worker→servicio · §3: el `api` es
   * el único firmante). El worker la llama tras descomprimir/contar las series.
   */
  @Post('ingesta/firmar-anonimizados')
  @HttpCode(200)
  firmarAnonimizados(
    @Param('casoId') casoId: string,
    @Body() cuerpo: FirmarAnonimizadosReq,
  ) {
    const cantidad = typeof cuerpo?.cantidad === 'number' ? cuerpo.cantidad : 0;
    if (cantidad < 1) throw new BadRequestException('cantidad debe ser >= 1.');
    const desde = typeof cuerpo?.desde === 'number' && cuerpo.desde >= 0 ? cuerpo.desde : 0;
    return this.ingesta.firmarAnonimizados(casoId, tablaDe(cuerpo?.tabla), cantidad, desde);
  }

  /** Quita UNA serie del estudio (editar caso): borra su binario + la saca de la ficha. */
  @Post('ingesta/quitar-serie')
  @HttpCode(200)
  quitarSerie(
    @Param('casoId') casoId: string,
    @Body() cuerpo: { tabla?: TablaEstudioDicom; indice?: number },
  ): Promise<{ series: number }> {
    const indice = typeof cuerpo?.indice === 'number' ? cuerpo.indice : -1;
    if (indice < 0) throw new BadRequestException('indice inválido.');
    return this.ingesta.quitarSerie(casoId, tablaDe(cuerpo?.tabla), indice);
  }
}
