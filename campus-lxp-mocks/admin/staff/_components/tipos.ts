/** Studio admin · Staff — tipos compartidos. */


export type Rol = "super" | "admin" | "disenador" | "docente";

export type MiembroStaff = {
  id: string;
  ini: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  area: string;
  /** qué tiene a su cargo: grupos, programas o alcance */
  cargo: string;
  actividad: string;
  ultimaSesion: string;
  ultimaAlerta?: boolean;
  /** el motivo se escribe: sobrecarga, lentitud, inactividad */
  senal?: string;
};

export type GrupoACargo = { nombre: string; alumnos: number; avance: number; cola?: string };

export type DetalleStaff = {
  id: string;
  ini: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  area: string;
  desde: string;
  correo: string;
  telefono: string;
  senal?: string;
  cifras: { etiqueta: string; valor: string; icono: "grupos" | "casos" | "reloj" | "consultas"; alerta?: boolean }[];
  aviso?: { titulo: string; detalle: string };
  grupos?: GrupoACargo[];
  registro: { titulo: string; detalle: string; alerta?: boolean; icono: "casos" | "cola" | "entregas" | "consultas" }[];
  permisos: { etiqueta: string; valor: string }[];
  eco: {
    pregunta: string;
    respuesta: string;
    comparativa: { quien: string; detalle: string; pct: number; alerta?: boolean }[];
    sugerencia: string;
    cta: string;
    sugerencias: string[];
  };
};

export type StaffData = {
  totales: { activo: string; sobrecarga: string; validados: string; respuesta: string };
  detalleTotales: { activo: string; sobrecarga: string; validados: string; respuesta: string };
  conteos: { todos: number; docentes: number; disenadores: number; admins: number };
  staff: MiembroStaff[];
  detalle: DetalleStaff;
};
