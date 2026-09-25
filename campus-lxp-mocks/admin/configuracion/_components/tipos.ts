/** Studio admin · Configuración — tipos compartidos. */


export type AreaId =
  | "usuarios"
  | "ia"
  | "integraciones"
  | "academico"
  | "marca"
  | "almacenamiento"
  | "notificaciones"
  | "seguridad"
  | "badges";

export type TonoArea = "ok" | "warn" | "down" | "info" | "neutro";

export type PieArea =
  | { tipo: "texto"; texto: string }
  | { tipo: "barra"; pct: number; color: "primary" | "info"; texto: string }
  | { tipo: "semaforo"; estados: TonoArea[]; texto: string }
  | { tipo: "paleta"; colores: string[]; texto: string };

export type AreaConfig = {
  id: AreaId;
  numero: string;
  titulo: string;
  descripcion: string;
  dentro: string[];
  estado?: string;
  tono: TonoArea;
  pie?: PieArea;
  icono:
    | "usuarios"
    | "eco"
    | "integraciones"
    | "academico"
    | "marca"
    | "almacenamiento"
    | "notificaciones"
    | "seguridad"
    | "badges";
};

export type GrupoAreas = { rotulo: string; nota: string; areas: AreaConfig[] };

export type AvisoConfig = {
  id: string;
  titulo: string;
  valor: string;
  detalle: string;
  area: string;
  tono: "warn" | "info";
};

export type CambioAuditoria = {
  id: string;
  ini: string;
  quien: string;
  accion: string;
  donde: string;
  cuando: string;
};

export type ConfiguracionData = {
  critica?: { titulo: string; detalle: string; cta: string; area: AreaId };
  avisos: AvisoConfig[];
  grupos: GrupoAreas[];
  auditoria: { retencionMeses: number; eventosMes: number; cambios: CambioAuditoria[] };
};
