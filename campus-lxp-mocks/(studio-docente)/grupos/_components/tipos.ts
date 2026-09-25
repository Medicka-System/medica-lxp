/** Studio docente · Grupos — tipos compartidos. */

export type EstadoGrupo = "al-dia" | "con-rezago" | "requiere-atencion";

export type GrupoDocente = {
  id: string;
  nombre: string;
  programa: string;
  modalidad: "En línea" | "Mixta" | "Presencial";
  alumnos: number;
  avance: number;
  enRiesgo: number;
  estado: EstadoGrupo;
  moduloEnCurso: string;
  inicio: string;
  /** por qué requieren intervención, en palabras */
  resumenRiesgo: string;
};

export type SenalRiesgo = "sin-actividad" | "reprobando" | "casos-rechazados";

export type AlumnoSeguimiento = {
  id: string;
  ini: string;
  nombre: string;
  moduloEnCurso: string;
  avance: number;
  casosSubidos: number;
  casosValidados: number;
  entregas: string;
  competencia: number;
  ultimaActividad: string;
  sinActividad?: boolean;
  /** null = sin señal: va al día */
  senal: { tipo: SenalRiesgo; motivo: string } | null;
};

export type ResumenGrupo = { etiqueta: string; valor: string; nota: string; atencion?: boolean };

export type MensajeEco = {
  id: string;
  de: "docente" | "eco";
  texto: string;
  alumnos?: { ini: string; nombre: string; motivo: string }[];
  destacado?: string;
  involucrados?: string[];
  acciones?: { etiqueta: string; primaria?: boolean; icono?: "consulta" | "bitacora" | "clase" }[];
};

export type GruposData = {
  grupos: GrupoDocente[];
  /** grupo abierto en el detalle */
  detalle: {
    grupoId: string;
    resumen: ResumenGrupo[];
    alumnos: AlumnoSeguimiento[];
    conteos: { todos: number; atencion: number; sinActividad: number; alDia: number };
  };
  eco: { resumenGlobal: string; conversacion: MensajeEco[]; sugerencias: string[] };
};
