import { Readable } from 'node:stream';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DbService } from '../db/db.service';
import { parsearReactivos, type ResultadoImport } from './importar.logic';
import { reemplazarReactivos } from './reactivos.repositorio';

export interface ImportResultado {
  actividadId: string;
  importados: number;
  errores: string[];
}

/**
 * Import de reactivos de autoevaluación desde CSV/Excel (§7A · course builder). Lee el
 * archivo con exceljs (una sola dep, cubre .xlsx y .csv), lo convierte a matriz y
 * delega el parseo/validación a la lógica pura, luego reemplaza el banco de la
 * actividad. Es dominio (parseo + validación + persistencia), no proxy de CRUD (§2).
 */
@Injectable()
export class ReactivosService {
  private readonly logger = new Logger(ReactivosService.name);

  constructor(private readonly db: DbService) {}

  async importar(
    archivo: Buffer,
    datos: { actividadId: string },
  ): Promise<ImportResultado> {
    if (!archivo || archivo.length === 0) {
      throw new BadRequestException('El archivo de reactivos llegó vacío.');
    }

    const filas = await this.aMatriz(archivo);
    const resultado: ResultadoImport = parsearReactivos(filas);
    if (resultado.reactivos.length === 0) {
      throw new BadRequestException(
        `No se importó ningún reactivo. ${resultado.errores.join(' ') || 'Revisa el formato.'}`,
      );
    }

    const importados = await reemplazarReactivos(
      this.db.sql,
      datos.actividadId,
      resultado.reactivos,
    );
    this.logger.log(
      `Reactivos importados: ${importados} en actividad ${datos.actividadId} ` +
        `(${resultado.errores.length} fila(s) omitida(s)).`,
    );
    return { actividadId: datos.actividadId, importados, errores: resultado.errores };
  }

  /** Lee el buffer como .xlsx (magic ZIP "PK") o como .csv, y lo vuelve matriz de texto. */
  private async aMatriz(archivo: Buffer): Promise<string[][]> {
    const esXlsx = archivo.length > 1 && archivo[0] === 0x50 && archivo[1] === 0x4b; // "PK"
    const wb = new ExcelJS.Workbook();
    try {
      if (esXlsx) {
        // Cast: exceljs tipa un `Buffer` distinto al `Buffer<ArrayBufferLike>` de Node 24.
        await wb.xlsx.load(archivo as unknown as ArrayBuffer);
      } else {
        await wb.csv.read(Readable.from(archivo));
      }
    } catch (e) {
      throw new BadRequestException(`No se pudo leer el archivo: ${(e as Error).message}`);
    }

    const hoja = wb.worksheets[0];
    if (!hoja) throw new BadRequestException('El archivo no tiene ninguna hoja/datos.');

    const filas: string[][] = [];
    hoja.eachRow({ includeEmpty: false }, (row) => {
      const vals = Array.isArray(row.values) ? row.values.slice(1) : []; // [0] es hueco (1-indexed)
      filas.push(vals.map((v) => celdaAString(v)));
    });
    return filas;
  }
}

/** Convierte una celda de exceljs (texto, número, rich text, fórmula) a string. */
function celdaAString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text.trim();
    if (typeof o.result === 'string' || typeof o.result === 'number') return String(o.result).trim();
    if (Array.isArray(o.richText)) {
      return o.richText.map((r) => (r as { text?: string }).text ?? '').join('').trim();
    }
  }
  return String(v).trim();
}
