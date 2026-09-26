/** Studio admin · Inicio — tipos compartidos. */

/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoIntegracion = "ok" | "degradada" | "caida";

export type Kpi = {
  id: string;
  titulo: string;
  valor: string;
  unidad: string;
  delta?: string;
  deltaPositivo?: boolean;
  pie: string;
  icono: "alumnos" | "grupos" | "programas" | "inscripciones";
};

export type PuntoTendencia = { mes: string; valor: string; altura: number };

export type Integracion = {
  id: string;
  nombre: string;
  estado: EstadoIntegracion;
  detalle: string;
  meta: string;
  icono: "zoom" | "mico" | "cora" | "pagos" | "correo";
};

export type GastoIA = {
  monto: string;
  moneda: string;
  periodo: string;
  pctTope: number;
  tope: string;
  desglose: { tarea: string; monto: string; pct: string }[];
};

export type MedidorSistema = {
  titulo: string;
  valor: string;
  pct?: number;
  detalle: string;
  icono: "almacenamiento" | "colas" | "lrs";
};

export type Alerta = {
  id: string;
  titulo: string;
  detalle: string;
  gravedad: "critica" | "media";
};

export type Decision = {
  id: string;
  n: number;
  titulo: string;
  detalle: string;
  cta: string;
  icono: "certificados" | "accesos" | "escaladas";
};

export type ActividadStaff = {
  id: string;
  ini: string;
  nombre: string;
  accion: string;
  meta: string;
  rol: "docente" | "diseñador";
};

export type AdminHomeData = {
  fecha: string;
  kpis: Kpi[];
  tendencia: { puntos: PuntoTendencia[]; resumen: { valor: string; etiqueta: string }[] };
  avance: { titulo: string; pct: number; detalle: string }[];
  riesgo: { n: number; detalle: string };
  cartera: {
    pctAlCorriente: string;
    cortes: { etiqueta: string; valor: string; tono: "ok" | "porVencer" | "vencido" }[];
    ultimoCorte: string;
  };
  integraciones: Integracion[];
  gastoIA: GastoIA;
  sistema: MedidorSistema[];
  alertas: Alerta[];
  decisiones: Decision[];
  actividad: ActividadStaff[];
  ateneo: { casos: number; comentarios: number; sinResponder: number };
  eco: {
    pregunta: string;
    intro: string;
    puntos: { titulo: string; detalle: string; tono: "critica" | "media" | "info" }[];
    cierre: string;
    sugerencias: string[];
  };
};
