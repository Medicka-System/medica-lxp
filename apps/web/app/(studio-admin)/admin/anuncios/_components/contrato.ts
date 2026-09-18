/**
 * Contrato de datos de Anuncios (gestor de comunicación oficial · §6). Comunicación
 * VERTICAL de la escuela (distinta del Ateneo). La misma pantalla sirve a admin y
 * súper admin; el rol acota el ALCANCE que puede segmentar.
 *
 * Real vía RLS: lectura de `lxp.anuncios` y creación (admin/súper admin son
 * `es_docente_o_mas`, §10). El conteo de audiencia por rol es real; la segmentación
 * por programa/grupo (padrón) y las métricas de lectura (vistas) son placeholder (§11).
 * "Redactar con Eco" es placeholder (por API · §7A).
 */

export type Prioridad = 'normal' | 'importante' | 'urgente';
export type EstadoAnuncio = 'publicado' | 'programado' | 'vencido';
export type Canal = 'in_app' | 'correo' | 'whatsapp';
export type TipoAlcance = 'comunidad' | 'alumnos' | 'staff';

/** Qué puede segmentar cada rol (§5B): el rol acota, la pantalla es la misma. */
export const ALCANCE_POR_ROL: Record<'admin' | 'super_admin', TipoAlcance[]> = {
  super_admin: ['comunidad', 'alumnos', 'staff'],
  admin: ['comunidad', 'alumnos'],
};

export const ETIQUETA_ALCANCE: Record<TipoAlcance, string> = {
  comunidad: 'Toda la comunidad',
  alumnos: 'Solo alumnos',
  staff: 'Solo staff',
};

export type AnuncioFila = {
  id: string;
  titulo: string;
  cuerpo: string;
  prioridad: Prioridad;
  estado: EstadoAnuncio;
  alcanceTipo: TipoAlcance;
  personas: string;
  canales: Canal[];
  publicacion: string;
  vigencia: string;
  vencePronto: boolean;
};

export type AnunciosData = {
  rol: 'admin' | 'super_admin';
  anuncios: AnuncioFila[];
  conteos: Record<EstadoAnuncio, number>;
  audiencia: Record<TipoAlcance, number>;
};
