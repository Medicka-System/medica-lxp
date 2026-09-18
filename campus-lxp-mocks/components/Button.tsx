import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { focusRing, focusRingDark } from "./tokens";

type Variante = "primaria" | "secundaria" | "fantasma" | "invertida" | "peligro";
type Tamano = "md" | "lg" | "sm";

/**
 * Botón del sistema. Alturas fijas: 44px normal, 48px para el CTA principal de la pantalla,
 * 36px para acciones dentro de tarjetas. "invertida" es blanco sobre navy o teal — se usa
 * UNA sola vez por pantalla, para que el CTA principal no compita con nada.
 */
export function Button({
  children,
  variante = "primaria",
  tamano = "md",
  iconoIzq,
  iconoDer,
  sobreOscuro = false,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  children: ReactNode;
  variante?: Variante;
  tamano?: Tamano;
  iconoIzq?: ReactNode;
  iconoDer?: ReactNode;
  /** activa el anillo de foco para superficies navy */
  sobreOscuro?: boolean;
}) {
  const alto = { sm: "h-9 px-3 text-[12.5px]", md: "h-11 px-4 text-[13.5px]", lg: "h-12 px-5 text-[14.5px]" }[tamano];

  const look = {
    primaria:
      "bg-primary font-bold text-[color:var(--sidebar)] hover:bg-secondary hover:text-white",
    secundaria:
      "border border-border bg-card font-semibold text-foreground hover:bg-accent hover:text-accent-foreground",
    fantasma: "font-semibold text-secondary hover:bg-accent",
    invertida: "bg-card font-bold text-[color:var(--sidebar)] hover:bg-primary",
    peligro:
      "border border-[color:var(--destructive-border)] bg-card font-bold text-[color:var(--destructive-foreground)]",
  }[variante];

  return (
    <button
      type="button"
      {...props}
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] transition-colors disabled:opacity-40 ${alto} ${look} ${sobreOscuro ? focusRingDark : focusRing} ${className}`}
    >
      {iconoIzq}
      {children}
      {iconoDer}
    </button>
  );
}
