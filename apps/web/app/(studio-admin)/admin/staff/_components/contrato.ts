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
  /** Foto de perfil ya firmada (lista para render) o null → cae a iniciales. */
  avatarUrl: string | null;
  nombre: string;
  rol: RolStaff;
  email: string | null;
  /** Área / especialidad (real: `perfiles.especialidad`; fallback por rol). */
  area: string;
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
  /** Tiempo medio consulta→primera respuesta del docente (real · `lxp.consultas`). */
  respuestaMedia: string | null;
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

export type RegistroTrabajo = {
  titulo: string;
  detalle: string;
  alerta?: boolean;
  icono: 'casos' | 'cola' | 'entregas' | 'consultas';
};

export type DetalleStaff = {
  id: string;
  ini: string;
  /** Foto de perfil ya firmada (lista para render) o null → cae a iniciales. */
  avatarUrl: string | null;
  nombre: string;
  rol: RolStaff;
  email: string | null;
  area: string;
  desde: string;
  senal?: string;
  cifras: CifraCarga[];
  /** Aviso de sobrecarga (derivado, se muestra cuando la señal está activa). */
  aviso?: { titulo: string; detalle: string };
  grupos: GrupoACargo[];
  /** Registro de su trabajo (validación y entregas · real). */
  registro: RegistroTrabajo[];
  permisos: { etiqueta: string; valor: string }[];
};
