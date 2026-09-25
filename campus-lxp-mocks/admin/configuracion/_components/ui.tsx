"use client";

/** Estilos, íconos por área y tonos compartidos de Configuración. */

import {
  Award,
  BellRing,
  Database,
  Palette,
  Plug,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { TonoArea } from "./tipos";


export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.12em]";
export const softText = "text-[color:var(--foreground-soft)]";
export const card = "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export const ICONOS = {
  usuarios: Users,
  eco: Sparkles,
  integraciones: Plug,
  academico: Award,
  marca: Palette,
  almacenamiento: Database,
  notificaciones: BellRing,
  seguridad: ShieldCheck,
  badges: Award,
} as const;

export const TONO_CHIP: Record<TonoArea, string> = {
  ok: "bg-accent text-accent-foreground",
  warn: "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  down: "border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]",
  info: "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  neutro: "border border-border bg-muted text-muted-foreground",
};

export const TONO_PUNTO: Record<TonoArea, string> = {
  ok: "bg-secondary",
  warn: "bg-[color:var(--warning)]",
  down: "bg-[color:var(--destructive)]",
  info: "bg-[color:var(--info)]",
  neutro: "bg-[color:var(--track)]",
};
