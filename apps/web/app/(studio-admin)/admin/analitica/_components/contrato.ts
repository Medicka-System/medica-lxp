/**
 * Contrato de datos de Analítica (consola admin / súper admin). Tres capas:
 *   CAPA 1 · Negocio y crecimiento  → parcial real (alumnos), resto de CORA (placeholder).
 *   CAPA 2 · Aprendizaje (del LRS)   → el diferenciador: I-AIM, casos, repaso — REAL.
 *   CAPA 3 · Operación y comunidad   → desempeño docente, Ateneo — REAL; Eco = placeholder.
 *
 * Regla del diseño (§ mock): ninguna tarjeta termina en la cifra; cierra con una señal
 * accionable. Aquí las señales se derivan del dato real donde se puede.
 */

export type BarraSimple = { etiqueta: string; valor: string; pct: number; alerta?: boolean };

/** Punto de serie temporal para las gráficas reales (Recharts vía wrapper). */
export type PuntoSerie = { x: string; v: number };

export type IaimEscuela = { dominio: string; valor: number; n: number; decaimiento: number; flojo: boolean };

export type DocenteDesempeno = {
  id: string;
  ini: string;
  nombre: string;
  validados: number;
  cola: number;
  alerta: boolean;
};

export type AnaliticaData = {
  alumnos: { activos: number; altas30: number };
  /** Crecimiento acumulado de alumnos por mes (gráfica real · Recharts). */
  crecimiento: PuntoSerie[];
  casos: { total: number; aprobados: number; rechazados: number; pendientes: number; tasaAprobacion: number | null };
  casosPorMes: BarraSimple[];
  /** Casos subidos por mes como serie numérica (gráfica real · Recharts). */
  casosMesSerie: PuntoSerie[];
  iaim: IaimEscuela[];
  casosPorDominio: BarraSimple[];
  repaso: { conDecaimiento: number; repasos: number; dominiosMedidos: number };
  docentes: DocenteDesempeno[];
  /** Actividad de diseño (real): piezas publicadas por autor (recursos + casos curados). */
  diseno: { total: number; barras: BarraSimple[] };
  ateneo: { casosSemana: number; casosTotal: number; comentarios: number; autores: number; sinResponder: number };
  ecoCorrecciones: number;
};
