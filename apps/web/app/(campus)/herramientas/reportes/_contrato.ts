/**
 * Contrato del generador de reportes clínicos (§6/§6.5).
 *
 * FASE 1 (motor cableado): la estructura del reporte YA NO es un placeholder hardcodeado.
 * Cada reporte apunta a una `lxp.plantillas_reporte` (por `plantilla_id`) y su forma sale
 * de `plantillas_reporte.estructura` (jsonb), el contrato COMPARTIDO con el constructor del
 * Studio (`@/lib/reportes/estructura`). El médico llena los campos; los VALORES se guardan
 * en `lxp.reportes.contenido.valores` (indexados por `campo.id`).
 *
 * DOMINIO (pendiente de API · §2/§8/§10): generar PDF, enviar por correo y "guardar como
 * caso anonimizado". Aquí solo se persiste el cuerpo bajo RLS.
 */

import type { EstructuraPlantilla, ValoresReporte } from '@/lib/reportes/estructura';

export type EstadoReporte = 'borrador' | 'finalizado' | 'enviado';

/**
 * Datos de paciente — viven SOLO en el reporte clínico, nunca en el caso educativo (§10).
 * Indexados por `campo.id` del encabezado (edad/sexo separados; expediente autollenado).
 * Se guarda laxo (Record) porque el encabezado es editable: el diseñador puede quitar o
 * añadir campos y sus valores se guardan por id.
 */
export type DatosPaciente = Record<string, string>;

/** Ids estándar del encabezado (los que tienen comportamiento especial). */
export const CAMPO_EXPEDIENTE = 'expediente';
export const CAMPO_SOLICITANTE = 'solicitante';

/** Cuerpo del reporte, persistido en `lxp.reportes.contenido` (jsonb). */
export type ContenidoReporte = {
  folio: string;
  plantillaId: string | null;
  /** Respuestas del médico por `campo.id` de la estructura de la plantilla. */
  valores: ValoresReporte;
  impresion: string;
};

/** Plantilla publicada, resumida para el diálogo "Nuevo reporte". */
export type PlantillaOpcion = {
  id: string;
  nombre: string;
  tipoEstudio: string;
  secciones: number;
  campos: number;
};

/** Fila del listado "Mis reportes". */
export type ReporteListItem = {
  id: string;
  folio: string;
  paciente: string;
  edadSexo: string;
  plantilla: string;
  tipoEstudio: string;
  fecha: string;
  estado: EstadoReporte;
  imagenes: number;
  nota: string;
};

export type ReportesData = {
  resumen: { borradores: number; listos: number; enviadosSemana: number; delMes: number };
  conteos: { todos: number; borradores: number; finalizados: number; enviados: number };
  plantillas: PlantillaOpcion[];
  items: ReporteListItem[];
};

/** Plantilla resuelta para el editor (nombre + estructura viva). */
export type PlantillaReporte = {
  id: string;
  nombre: string;
  tipoEstudio: string;
  estructura: EstructuraPlantilla;
};

/** Caso de la bitácora del médico con estudio listo, para insertar en el visor. */
export type CasoDicomOpcion = {
  id: string;
  titulo: string;
  series: number;
  fecha: string;
};

/** Reporte completo para el editor. */
export type ReporteDetalle = {
  id: string;
  estado: EstadoReporte;
  guardado: string;
  datosPaciente: DatosPaciente;
  contenido: ContenidoReporte;
  casoGeneradoId: string | null;
  /** null si la plantilla fue despublicada/eliminada (el editor avisa). */
  plantilla: PlantillaReporte | null;
};

export const ETIQUETA_ESTADO: Record<EstadoReporte, string> = {
  borrador: 'Borrador',
  finalizado: 'Finalizado',
  enviado: 'Enviado',
};

export function datosPacienteVacios(): DatosPaciente {
  return {};
}

export function contenidoVacio(folio: string, plantillaId: string | null): ContenidoReporte {
  return { folio, plantillaId, valores: {}, impresion: '' };
}
