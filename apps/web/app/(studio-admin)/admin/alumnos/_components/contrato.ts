/**
 * Contrato de datos de Alumnos (consola admin / súper admin). Tipos puros
 * compartidos entre la lectura server (`_data.ts`) y las vistas client.
 *
 * Frontera con el ERP (§1/§10): alta, inscripción, matrícula y cobranza viven en
 * CORA. Esta vista NO los gestiona; el avance DENTRO del campus (competencia I-AIM,
 * casos, actividad) es REAL vía RLS. Lo administrativo de CORA va como placeholder
 * marcado (no legible en agregado en local; se conecta en §11).
 */

export type EstadoAlumno = 'corriente' | 'riesgo' | 'suspendido';

export type AlumnoFila = {
  id: string;
  ini: string;
  nombre: string;
  competencia: number | null;
  casosAprobados: number;
  casosTotal: number;
  estado: EstadoAlumno;
  senal?: string;
  ultimaActividad: string;
  sinActividad: boolean;
};

export type TotalesAlumnos = {
  activos: number;
  enRiesgo: number;
  suspendidos: number;
  competenciaMedia: number | null;
};

export type AlumnosData = {
  totales: TotalesAlumnos;
  alumnos: AlumnoFila[];
};

export type DominioIaimFila = { nombre: string; valor: number; decaimiento: number };

export type ActividadCaso = {
  id: string;
  titulo: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  cuando: string;
};

export type Expediente = {
  id: string;
  ini: string;
  nombre: string;
  email: string | null;
  estado: EstadoAlumno;
  senal?: string;
  desde: string;
  cifras: {
    horas: string;
    casosValidados: string;
    casosPendientes: number;
    casosRechazados: number;
    certificados: number;
    insignias: number;
  };
  iaim: { dominios: DominioIaimFila[]; general: number | null };
  actividad: ActividadCaso[];
  consultasAbiertas: number;
};
