/** Studio admin · Analítica — tipos compartidos. */


export type TonoSenal = "ok" | "warn" | "info";
export type Senal = { texto: string; tono: TonoSenal };

export type PuntoSerie = { x: string; v: number };
export type Barra = { etiqueta: string; pct: number; valor: string; alerta?: boolean };

export type Atoro = {
  id: string;
  modulo: string;
  leccion: string;
  rezago: number;
  detalle: string;
  critico?: boolean;
};

export type DominioIAIM = { dominio: string; valor: number; nota: string; flojo?: boolean };

export type AvanceProgama = {
  programa: string;
  real: number;
  esperado: number;
  horas: string;
  alerta?: boolean;
};

export type Docente = {
  id: string;
  ini: string;
  nombre: string;
  grupos: string;
  validados: number;
  respuesta: string;
  consultas: number;
  alerta?: boolean;
  estado: string;
};

export type UsoEco = { tarea: string; aprobadoSinCambios: number; nota: string };

export type RespuestaEco = {
  pregunta: string;
  intro: string;
  evidencias: { titulo: string; detalle: string }[];
  accion: string;
  botones: string[];
};

export type AnaliticaData = {
  periodo: "30d" | "trimestre" | "anio";
  negocio: {
    activos: { valor: string; unidad: string; delta: string; serie: PuntoSerie[]; senal: Senal };
    altasBajas: { valor: string; unidad: string; delta: string; barras: Barra[]; senal: Senal };
    retencion: { valor: string; unidad: string; delta: string; barras: Barra[]; senal: Senal };
    llenado: { valor: string; unidad: string; delta: string; barras: Barra[]; senal: Senal };
    embudo: { etapas: { etapa: string; valor: number; pct: number }[]; senal: Senal };
    cartera: { valor: string; unidad: string; delta: string; barras: Barra[]; senal: Senal };
    ingreso: { filas: Barra[]; senal: Senal };
  };
  aprendizaje: {
    eco: RespuestaEco;
    atoros: Atoro[];
    iaim: { dominios: DominioIAIM[]; senal: Senal };
    avance: { programas: AvanceProgama[]; senal: Senal };
    repaso: {
      serie: { x: string; sinRepaso: number; conRepaso: number }[];
      retSin: string;
      retCon: string;
      senal: Senal;
    };
  };
  operacion: {
    docentes: { filas: Docente[]; senal: Senal };
    diseno: { valor: string; delta: string; barras: Barra[]; nota: string; senal: Senal };
    ateneo: { tarjetas: { titulo: string; valor: string; sub: string; ok: boolean }[]; senal: Senal };
    eco: { global: string; tareas: UsoEco[]; gasto: string; porCaso: string; senal: Senal };
  };
};
