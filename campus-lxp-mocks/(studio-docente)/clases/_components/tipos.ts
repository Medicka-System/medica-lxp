/** Studio docente · Clases — tipos compartidos. */

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoSesion = "zoom" | "mico";

export type ClaseProgramada = {
  id: string;
  tipo: TipoSesion;
  tema: string;
  grupo: string;
  alumnos: number;
  dia: string;
  hora: string;
  duracion: string;
  leccion?: string;
  hoy?: boolean;
  empiezaEn?: string;
  materialAdjunto?: number;
};

export type Grabacion = {
  id: string;
  tipo: TipoSesion;
  tema: string;
  grupo: string;
  fecha: string;
  duracion: string;
  asistieron: number;
  total: number;
  ligada: boolean;
  poster?: string;
};

export type RespuestaEco = {
  pregunta: string;
  intro: string;
  temas: { fecha: string; tema: string; asistencia: string }[];
  remate: string;
  acciones: { etiqueta: string; primaria?: boolean }[];
};

export type ClasesData = {
  clases: ClaseProgramada[];
  grabaciones: Grabacion[];
  gruposFiltro: string[];
  resumenMes: { titulo: string; valor: string; detalle: string }[];
  eco: { respuesta: RespuestaEco; sugerencias: string[] };
  totalGrabaciones: number;
};
