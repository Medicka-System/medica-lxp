/**
 * Plantilla de caso por DEFECTO (§6 · rediseño del caso sobre el motor de reportes).
 *
 * El caso MANUAL (subido por el alumno o el staff, sin reporte de origen) necesita un
 * CUERPO con la estructura del motor de reportes para editarse con el MISMO `CampoReporte`
 * que un caso-de-reporte. Como el alumno NO es staff, la RLS de `lxp.plantillas_reporte`
 * (select = `publicado or es_staff()`) le impediría leer una plantilla NO publicada, y
 * publicarla contaminaría el selector de plantillas del médico. Por eso la plantilla por
 * defecto vive como CONSTANTE de código (misma forma `EstructuraPlantilla` del motor), sin
 * fila en BD: cero RLS, cero migración, no ensucia el catálogo del médico.
 *
 * El cuerpo que se persiste en `bitacora_casos.contenido_estructurado` es un SNAPSHOT
 * autocontenido (secciones + valores), igual que el caso-de-reporte (§6/§7A · Opción B).
 * El texto `hallazgos` sigue siendo el índice DERIVADO (`aplanarContenidoCaso`).
 *
 * La sección va SIN título para que el `hallazgos` derivado (primera línea = título de la
 * tarjeta) sea el texto real y no un encabezado en mayúsculas.
 */

import type { ContenidoEstructuradoCaso } from '@campus/shared';
import type { EstructuraPlantilla } from './estructura';

/** id estable del campo de hallazgos de la plantilla por defecto (para precargar/derivar). */
export const CAMPO_HALLAZGOS_DEFECTO = 'c_hallazgos';

/** Estructura mínima del motor para un caso manual: una sección de hallazgos (multitexto). */
export const PLANTILLA_CASO_DEFECTO: EstructuraPlantilla = {
  secciones: [
    {
      id: 's_hallazgos',
      tipo: 'hallazgos',
      // Sin título: el aplanador no antepone encabezado → la 1a línea del `hallazgos`
      // derivado es el texto real (título limpio de la tarjeta).
      titulo: '',
      columnas: 1,
      campos: [
        {
          id: CAMPO_HALLAZGOS_DEFECTO,
          tipo: 'multitexto',
          nombre: 'Hallazgos del estudio',
          guia: 'Describa lo que vio: medidas, planos y lo que le hizo dudar.',
        },
      ],
    },
  ],
};

/**
 * Arma un `ContenidoEstructuradoCaso` (cuerpo del caso) desde una `EstructuraPlantilla` del
 * motor + los valores/impresión capturados. Marca `fuente: { tipo: 'ficha' }` (caso manual,
 * sin reporte de origen). Las formas de sección/campo son estructuralmente compatibles
 * (mismo `secciones[].campos[]`); el contrato del caso es más laxo, de ahí el cast.
 */
export function cuerpoCasoDesdeEstructura(
  estructura: EstructuraPlantilla,
  valores: Record<string, unknown> = {},
  impresion = '',
): ContenidoEstructuradoCaso {
  return {
    secciones: estructura.secciones as unknown as ContenidoEstructuradoCaso['secciones'],
    valores,
    impresion,
    fuente: { tipo: 'ficha' },
  };
}

/** Cuerpo inicial VACÍO para un caso manual nuevo (plantilla por defecto, sin valores). */
export function cuerpoCasoInicial(): ContenidoEstructuradoCaso {
  return cuerpoCasoDesdeEstructura(PLANTILLA_CASO_DEFECTO);
}

/**
 * Cuerpo para EDITAR un caso legado sin `contenido_estructurado`: usa la plantilla por
 * defecto y precarga el texto `hallazgos` viejo en el campo de hallazgos, para que al
 * guardar quede estructurado sin perder lo que el alumno ya había escrito.
 */
export function cuerpoCasoDesdeHallazgosLegado(hallazgos: string | null | undefined): ContenidoEstructuradoCaso {
  const t = (hallazgos ?? '').trim();
  return cuerpoCasoDesdeEstructura(
    PLANTILLA_CASO_DEFECTO,
    t ? { [CAMPO_HALLAZGOS_DEFECTO]: t } : {},
  );
}
