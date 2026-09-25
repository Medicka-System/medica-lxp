/** Studio docente · Entregas — tipos compartidos. */


export type TipoEntrega = "abierta" | "autoevaluacion";
export type EstadoEntrega = "auto" | "sugerida" | "requiere-lectura" | "sin-entregar";

export type Alumno = { id: string; ini: string; nombre: string };

export type CriterioRubrica = {
  id: string;
  texto: string;
  peso: number;
  nivelAlcanzado: string;
  puntaje: number; // 0–1
};

export type PreAnalisisIA = {
  notaSugerida: number;
  confianza: "alta" | "media" | "baja";
  sustento: { clase: "ok" | "falta"; texto: string }[];
  comentario: string;
};

export type Entrega = {
  id: string;
  alumno: Alumno;
  tipo: TipoEntrega;
  estado: EstadoEntrega;
  entregadaHace: string;
  nota: number | null;
  detalleCorto: string;
  respuesta?: string[];
  rubrica?: CriterioRubrica[];
  ia?: PreAnalisisIA;
};

export type PreguntaAuto = {
  n: string;
  texto: string;
  aciertoPct: number;
  aciertos: string;
};

export type Actividad = {
  id: string;
  clave: string;
  titulo: string;
  tipo: TipoEntrega;
  consigna?: string;
  preguntas?: PreguntaAuto[];
  estadisticas?: { promedio: number; mediana: number; masBaja: number; masAlta: number };
  contestada?: string;
};

export type MensajeIA = {
  id: string;
  de: "docente" | "ia";
  texto: string;
  alumnos?: { ini: string; nombre: string; porque: string; chip: string }[];
  borrador?: string;
  acciones?: { etiqueta: string; primaria?: boolean }[];
};

export type EntregasData = {
  grupo: string;
  grupos: string[];
  actividad: Actividad;
  actividades: Actividad[];
  resumen: {
    entregadas: number;
    delGrupo: number;
    autoCalificadas: number;
    porConfirmar: number;
    promedio: number;
    sinEntregar: number;
    vencio: string;
  };
  entregas: Entrega[];
  sinEntregar: Alumno[];
  altaConfianza: number;
  asistente: { sugerencias: string[]; conversacion: MensajeIA[] };
};
