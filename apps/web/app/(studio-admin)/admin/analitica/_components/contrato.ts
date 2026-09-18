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
  casos: { total: number; aprobados: number; rechazados: number; pendientes: number; tasaAprobacion: number | null };
  casosPorMes: BarraSimple[];
  iaim: IaimEscuela[];
  casosPorDominio: BarraSimple[];
  repaso: { conDecaimiento: number; repasos: number; dominiosMedidos: number };
  docentes: DocenteDesempeno[];
  ateneo: { casosSemana: number; casosTotal: number; comentarios: number; autores: number; sinResponder: number };
  ecoCorrecciones: number;
};
