"use client";

/** Estilos, marca de Eco, mapas de prioridad / estado / canal y alcance por rol de Anuncios. */

import {
  Mail,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import type { RolStaff, Prioridad, EstadoAnuncio, Canal, TipoAlcance } from "./tipos";

export function EcoMark({ size = 26, invertido = false }: { size?: number; invertido?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      className={`grid shrink-0 place-items-center ${
        invertido
          ? "bg-[color:var(--info-foreground)] text-white"
          : "bg-card text-[color:var(--info-foreground)]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
        <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
      </svg>
    </span>
  );
}

/** Qué puede segmentar cada rol: el rol acota, la pantalla es la misma. */
export const ALCANCE_POR_ROL: Record<RolStaff, TipoAlcance[]> = {
  superadmin: ["comunidad", "alumnos", "staff", "programa", "generacion", "grupo"],
  admin: ["comunidad", "alumnos", "programa", "generacion", "grupo"],
  docente: ["grupo"],
};

export const ETIQUETA_ALCANCE: Record<TipoAlcance, string> = {
  comunidad: "Toda la comunidad",
  alumnos: "Solo alumnos",
  staff: "Solo staff",
  programa: "Un programa",
  generacion: "Una generación",
  grupo: "Un grupo",
};


export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.12em]";
export const softText = "text-[color:var(--foreground-soft)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

/** El rojo se gasta una sola vez: la prioridad urgente. */
export const PRIORIDAD: Record<Prioridad, { etiqueta: string; clase: string }> = {
  urgente: {
    etiqueta: "Urgente",
    clase:
      "border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]",
  },
  importante: {
    etiqueta: "Importante",
    clase:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  },
  normal: { etiqueta: "Normal", clase: "border border-border bg-muted text-muted-foreground" },
};

export const ESTADO: Record<EstadoAnuncio, { etiqueta: string; clase: string }> = {
  publicado: { etiqueta: "Publicado", clase: "bg-accent text-accent-foreground" },
  programado: {
    etiqueta: "Programado",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  },
  borrador: { etiqueta: "Borrador", clase: "border border-border bg-muted text-muted-foreground" },
  vencido: { etiqueta: "Vencido", clase: "border border-border bg-muted text-muted-foreground" },
};

export const ICONO_CANAL: Record<Canal, typeof Smartphone> = {
  app: Smartphone,
  correo: Mail,
  whatsapp: MessageCircle,
};
export const NOMBRE_CANAL: Record<Canal, string> = {
  app: "In-app",
  correo: "Correo",
  whatsapp: "WhatsApp",
};
