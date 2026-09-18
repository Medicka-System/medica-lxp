import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { focusRing, kicker } from "./tokens";

/**
 * Encabezado de sección: ícono en accent, título, una línea de contexto y la salida a la
 * sección completa. Sin descripciones largas — el rótulo y el dato bastan.
 */
export function SectionHeader({
  icono,
  titulo,
  contexto,
  accion,
  onAccion,
  className = "",
}: {
  icono?: ReactNode;
  titulo: string;
  contexto?: string;
  accion?: string;
  onAccion?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {icono && (
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground"
        >
          {icono}
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-[15.5px] font-bold leading-tight">{titulo}</h3>
        {contexto && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{contexto}</p>}
      </div>
      {accion && (
        <button
          type="button"
          onClick={onAccion}
          className={`ml-auto inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
        >
          {accion}
          <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

/** Rótulo suelto de bloque, cuando no hace falta el encabezado completo. */
export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`${kicker} text-muted-foreground ${className}`}>{children}</p>;
}
