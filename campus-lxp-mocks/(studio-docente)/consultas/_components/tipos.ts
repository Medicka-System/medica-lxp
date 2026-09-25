/** Studio docente · Consultas — tipos compartidos. */

export type EstadoConsulta = "sin-responder" | "respondida";

export type Alumno = {
  id: string;
  ini: string;
  nombre: string;
  grupo: string;
  moduloEnCurso: string;
  horas: number;
};

export type Adjunto = { nombre: string; meta: string; tipo: "loop" | "imagen" | "archivo" };

export type Mensaje = {
  id: string;
  de: "alumno" | "docente";
  texto: string;
  hora: string;
  dia?: string;
  adjunto?: Adjunto;
  leido?: boolean;
};

export type Recurso = { clave: string; titulo: string; meta: string };

export type SugerenciaEco = {
  borrador: string;
  cita: string;
  resumen: string;
  metaHilo: string;
  patron?: {
    cuantos: number;
    inis: string[];
    texto: string;
  };
  recursos: Recurso[];
  ajustes: string[];
};

export type Conversacion = {
  id: string;
  alumno: Alumno;
  estado: EstadoConsulta;
  esperando?: string;
  ultimoMensaje: string;
  hora: string;
  mensajes: Mensaje[];
  eco: SugerenciaEco;
};

export type ConsultasData = {
  docente: { nombre: string };
  grupos: string[];
  conversaciones: Conversacion[];
  sinResponder: number;
};
