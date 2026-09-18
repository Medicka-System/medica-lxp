import type { ReactNode } from "react";
import { TONO, type Tono } from "./tokens";

/**
 * Chip de estado. El tono comunica: teal = resuelto · ámbar = requiere acción ·
 * rojo = dinero vencido o sistema caído · violeta = Eco · navy = autoridad (docente, rol).
 */
export function Chip({
  children,
  tono = "neutro",
  punto = false,
  icono,
  className = "",
}: {
  children: ReactNode;
  tono?: Tono;
  /** punto sólido a la izquierda: para estados que se vigilan */
  punto?: boolean;
  icono?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${TONO[tono]} ${className}`}
    >
      {punto && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icono}
      {children}
    </span>
  );
}

/** Chip de sección o etiqueta neutra, sin carga de estado. */
export function Tag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11px] font-medium text-[color:var(--foreground-soft)] ${className}`}
    >
      {children}
    </span>
  );
}
