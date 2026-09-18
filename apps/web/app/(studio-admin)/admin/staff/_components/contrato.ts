/**
 * Contrato de datos de Staff (consola admin / súper admin). El equipo, su rol y su
 * CARGA (no "productividad"): cuántos grupos lleva, casos en cola, validaciones.
 * Todo REAL vía RLS. El alta y el cambio de rol viven en Configuración → Usuarios y
 * roles (frontera §5B); esas acciones son placeholder aquí. Eco = placeholder (§7A).
 */

export type RolStaff = 'super_admin' | 'admin' | 'docente' | 'disenador_instruccional';

export type MiembroStaff = {
  id: string;
  ini: string;
  nombre: string;
  rol: RolStaff;
  email: string | null;
  /** Qué tiene a su cargo, derivado del rol (grupos, casos curados, alcance). */
  cargo: string;
  /** Actividad reciente (validaciones / curaciones últimos 7 días). */
  actividad: string;
  desde: string;
  /** El motivo se escribe: sobrecarga de cola, etc. */
  senal?: string;
};

export type TotalesStaff = {
  total: number;
  conSobrecarga: number;
  validadosSemana: number;
  conteos: { todos: number; docentes: number; disenadores: number; admins: number };
};

export type StaffData = { totales: TotalesStaff; staff: MiembroStaff[] };

export type CifraCarga = {
  etiqueta: string;
  valor: string;
  icono: 'grupos' | 'cola' | 'validaciones' | 'curados';
  alerta?: boolean;
};

export type GrupoACargo = { id: string; nombre: string; cola: number };

export type DetalleStaff = {
  id: string;
  ini: string;
  nombre: string;
  rol: RolStaff;
  email: string | null;
  desde: string;
  senal?: string;
  cifras: CifraCarga[];
  grupos: GrupoACargo[];
  permisos: { etiqueta: string; valor: string }[];
};
