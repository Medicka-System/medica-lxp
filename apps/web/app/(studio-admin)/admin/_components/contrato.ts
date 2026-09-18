/**
 * Contrato de datos del Centro de control (dashboard de admin / súper admin).
 * Tipos puros compartidos entre la lectura server (`_data.ts`) y la vista client
 * (`centro-control.tsx`). Sin lógica ni dependencias de runtime.
 *
 * Origen de cada bloque (importa para la Regla de Oro · §2 y la honestidad de la
 * demo):
 *   • REAL (RLS, `lxp`): kpis, tendencia, avance, riesgo, decisiones, actividad, ateneo.
 *   • CORA (solo lectura, agregado no disponible en local): cartera → `disponible=false`.
 *   • SISTEMA / IA (telemetría de infra y costo de Eco, no es dato de dominio):
 *     integraciones, sistema, gastoIA, alertas → PLACEHOLDER, solo súper admin.
 *   • ECO analista: `eco` → PLACEHOLDER (respuesta mock; el dominio llega por API · §7A).
 */

export type IconoKpi = 'alumnos' | 'grupos' | 'programas' | 'inscripciones';

export type Kpi = {
  id: string;
  titulo: string;
  valor: string;
  unidad: string;
  delta?: string;
  deltaPositivo?: boolean;
  pie: string;
  icono: IconoKpi;
};

export type PuntoTendencia = { mes: string; valor: string; altura: number };

export type Avance = { titulo: string; pct: number; detalle: string };

export type EstadoIntegracion = 'ok' | 'degradada' | 'caida';

export type Integracion = {
  id: string;
  nombre: string;
  estado: EstadoIntegracion;
  detalle: string;
  meta: string;
  icono: 'zoom' | 'mico' | 'cora' | 'pagos' | 'correo';
};

export type MedidorSistema = {
  titulo: string;
  valor: string;
  pct?: number;
  detalle: string;
  icono: 'almacenamiento' | 'colas' | 'lrs';
};

export type Alerta = {
  id: string;
  titulo: string;
  detalle: string;
  gravedad: 'critica' | 'media';
};

export type Decision = {
  id: string;
  n: number;
  titulo: string;
  detalle: string;
  cta: string;
  icono: 'certificados' | 'accesos' | 'escaladas';
};

export type ActividadStaff = {
  id: string;
  ini: string;
  nombre: string;
  accion: string;
  meta: string;
  rol: 'docente' | 'diseñador' | 'admin';
};

export type GastoIA = {
  monto: string;
  moneda: string;
  periodo: string;
  pctTope: number;
  tope: string;
  desglose: { tarea: string; monto: string; pct: string }[];
};

export type CorteCartera = {
  etiqueta: string;
  valor: string;
  tono: 'ok' | 'porVencer' | 'vencido';
};

export type EcoResumen = {
  pregunta: string;
  intro: string;
  puntos: { titulo: string; detalle: string; tono: 'critica' | 'media' | 'info' }[];
  cierre: string;
  sugerencias: string[];
};

export type CentroControlData = {
  /** Súper admin ve la capa de salud del sistema y los accesos de gobierno; admin no. */
  esSuper: boolean;
  fecha: string;
  kpis: Kpi[];
  tendencia: { puntos: PuntoTendencia[]; resumen: { valor: string; etiqueta: string }[] };
  avance: Avance[];
  riesgo: { n: number; detalle: string };
  /** Cartera de CORA. `disponible=false` en local: el agregado no se lee sin la integración (§11). */
  cartera: {
    disponible: boolean;
    pctAlCorriente: string;
    cortes: CorteCartera[];
    ultimoCorte: string;
  };
  integraciones: Integracion[];
  gastoIA: GastoIA;
  sistema: MedidorSistema[];
  alertas: Alerta[];
  decisiones: Decision[];
  actividad: ActividadStaff[];
  ateneo: { casos: number; comentarios: number; sinResponder: number };
  eco: EcoResumen;
};
