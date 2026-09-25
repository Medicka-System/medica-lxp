/** Studio admin · Alumnos — tipos compartidos. */


export type EstadoAlumno = "corriente" | "riesgo" | "activo" | "suspendido";

export type AlumnoFila = {
  id: string;
  ini: string;
  nombre: string;
  matricula: string;
  programa: string;
  grupo: string;
  avance: number;
  competencia: number;
  estado: EstadoAlumno;
  ultimaActividad: string;
  ultimaAlerta?: boolean;
  /** el motivo se escribe: nunca un puntaje suelto */
  senal?: string;
  /** cuando la señal viene del ERP y no del campus */
  senalDeCORA?: boolean;
};

export type DominioIAIM = { nombre: string; valor: number; nota?: string };

export type Expediente = {
  id: string;
  ini: string;
  nombre: string;
  matricula: string;
  programa: string;
  grupo: string;
  estado: EstadoAlumno;
  senal?: string;
  curso: { titulo: string; avance: number; esperado: number; posicion: string };
  cifras: { horas: string; casos: string; casosNota?: string; certificados: string; insignias: string };
  iaim: { dominios: DominioIAIM[]; general: number; nota: string };
  actividad: { titulo: string; detalle: string; alerta?: boolean; icono: "conexion" | "entregas" | "ateneo" | "consultas" }[];
  /** SOLO LECTURA: viene de CORA */
  cora: {
    campos: { etiqueta: string; valor: string; mono?: boolean }[];
    pagoVencido?: { titulo: string; detalle: string };
    corte: string;
  };
  eco: {
    pregunta: string;
    respuesta: string;
    puntos: { texto: string; tono: "warn" | "ok" }[];
    sugerencia: string;
    cta: string;
    sugerencias: string[];
  };
};

export type AlumnosData = {
  totales: { activos: string; enRiesgo: string; avanceMedio: string; competenciaMedia: string };
  detalleTotales: { activos: string; enRiesgo: string; avanceMedio: string; competenciaMedia: string };
  alumnos: AlumnoFila[];
  expediente: Expediente;
};
