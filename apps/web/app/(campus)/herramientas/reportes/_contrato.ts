/**
 * Contrato del generador de reportes clínicos (§6/§6.5).
 *
 * ESTRUCTURA, no detalle clínico: los tipos describen la forma de un reporte y su
 * contenido persistido (`lxp.reportes.contenido` / `.datos_paciente` como jsonb). El
 * DETALLE CLÍNICO REAL —secciones por estudio, guía de redacción, fórmulas, membrete
 * y firma— se levanta con Manny al ejecutar este sprint (SPRINTS §6.5). Aquí las
 * plantillas son EJEMPLOS GENÉRICOS marcados como placeholder; no inventamos criterio.
 */

export type EstadoReporte = 'borrador' | 'finalizado' | 'enviado';

export type TipoEstudio = 'Abdominal' | 'Obstétrico' | 'Mama' | 'Doppler venoso';

/** Plantilla = tipo de estudio + sus secciones. PLACEHOLDER genérico (ver arriba). */
export type Plantilla = { tipo: TipoEstudio; secciones: string[] };

/**
 * PLACEHOLDER GENÉRICO — la estructura fina (secciones reales, campos esperados,
 * guía, fórmulas) la define el docente/diseñador con Manny. No es contenido clínico
 * validado: solo da forma al editor para poder construir el flujo.
 */
export const PLANTILLAS: Plantilla[] = [
  {
    tipo: 'Abdominal',
    secciones: [
      'Hígado y vía biliar',
      'Riñones y vía urinaria',
      'Bazo y páncreas',
      'Grandes vasos',
      'Vejiga',
      'Otros hallazgos',
    ],
  },
  { tipo: 'Obstétrico', secciones: ['Biometría', 'Anatomía', 'Placenta', 'Líquido', 'Doppler'] },
  { tipo: 'Mama', secciones: ['Mama derecha', 'Mama izquierda', 'Axilas', 'Clasificación'] },
  {
    tipo: 'Doppler venoso',
    secciones: ['Femoral', 'Poplítea', 'Tibiales', 'Superficial', 'Compresibilidad'],
  },
];

export function plantillaDe(tipo: TipoEstudio): Plantilla {
  return PLANTILLAS.find((p) => p.tipo === tipo) ?? PLANTILLAS[0];
}

/** Datos de paciente — viven SOLO en el reporte clínico, nunca en el caso educativo (§10). */
export type DatosPaciente = {
  paciente: string;
  edadSexo: string;
  expediente: string;
  fechaEstudio: string;
  solicitante: string;
  equipo: string;
  motivo: string;
};

export type SeccionContenido = {
  id: string;
  titulo: string;
  texto: string;
  imagenesInsertadas: number;
};

/**
 * Pieza = imagen/plano DICOM del estudio. PLACEHOLDER del visor: la ingesta y
 * anonimización DICOM real es el pipeline `procesar-dicom` (§8, Sprint 4.7). Aquí
 * solo se listan etiquetas de plano para el hueco del visor.
 */
export type PiezaReporte = { etiqueta: string; insertada?: boolean };

/** Cuerpo del reporte, persistido en `lxp.reportes.contenido` (jsonb). */
export type ContenidoReporte = {
  folio: string;
  tipo: TipoEstudio;
  secciones: SeccionContenido[];
  impresion: string;
  piezas: PiezaReporte[];
};

/** Fila del listado "Mis reportes". */
export type ReporteListItem = {
  id: string;
  folio: string;
  paciente: string;
  edadSexo: string;
  tipo: TipoEstudio;
  fecha: string;
  estado: EstadoReporte;
  imagenes: number;
  nota: string;
};

export type ReportesData = {
  resumen: { borradores: number; listos: number; enviadosSemana: number; delMes: number };
  conteos: { todos: number; borradores: number; finalizados: number; enviados: number };
  plantillas: Plantilla[];
  items: ReporteListItem[];
};

/** Reporte completo para el editor. */
export type ReporteDetalle = {
  id: string;
  estado: EstadoReporte;
  guardado: string;
  datosPaciente: DatosPaciente;
  contenido: ContenidoReporte;
  casoGeneradoId: string | null;
};

export const ETIQUETA_ESTADO: Record<EstadoReporte, string> = {
  borrador: 'Borrador',
  finalizado: 'Finalizado',
  enviado: 'Enviado',
};

/** Piezas placeholder por defecto para el hueco del visor (reemplaza pipeline 4.7). */
export function piezasPorDefecto(): PiezaReporte[] {
  return [
    { etiqueta: 'long. der' },
    { etiqueta: 'transv. der' },
    { etiqueta: 'izquierdo' },
    { etiqueta: 'vejiga' },
  ];
}

/** Datos de paciente vacíos para un reporte recién creado. */
export function datosPacienteVacios(): DatosPaciente {
  return {
    paciente: '',
    edadSexo: '',
    expediente: '',
    fechaEstudio: '',
    solicitante: '',
    equipo: '',
    motivo: '',
  };
}
