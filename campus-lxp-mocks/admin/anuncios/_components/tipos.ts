/** Studio · Anuncios — tipos compartidos. */


export type RolStaff = "superadmin" | "admin" | "docente";
export type Prioridad = "normal" | "importante" | "urgente";
export type EstadoAnuncio = "publicado" | "programado" | "borrador" | "vencido";
export type Canal = "app" | "correo" | "whatsapp";
export type TipoAlcance =
  | "comunidad"
  | "alumnos"
  | "staff"
  | "programa"
  | "generacion"
  | "grupo";

export type Anuncio = {
  id: string;
  titulo: string;
  prioridad: Prioridad;
  estado: EstadoAnuncio;
  alcance: { tipo: TipoAlcance; etiqueta: string; personas: string };
  canales: Canal[];
  publicacion: string;
  vigencia: string;
  vistas: string;
  pctVisto: string;
};

export type AnunciosData = {
  rol: RolStaff;
  anuncios: Anuncio[];
  conteos: Record<EstadoAnuncio, number>;
  resumen: string;
};

