import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { card, kickerTight, mono, softText } from "./tokens";

/**
 * Cifra con contexto. Regla del sistema: ninguna métrica termina en el número — siempre lleva
 * su unidad y una línea que diga qué hacer con ella.
 */
export function StatCard({
  icono,
  titulo,
  valor,
  unidad,
  delta,
  deltaPositivo,
  pie,
  children,
}: {
  icono?: ReactNode;
  titulo: string;
  valor: string;
  unidad?: string;
  delta?: string;
  deltaPositivo?: boolean;
  pie?: string;
  /** señal accionable al pie: barra, semáforo o enlace */
  children?: ReactNode;
}) {
  return (
    <article className={`${card} p-[18px]`}>
      <div className="flex items-center gap-2.5">
        {icono && (
          <span
            aria-hidden
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground"
          >
            {icono}
          </span>
        )}
        <p className={`${kickerTight} min-w-0 flex-1 text-muted-foreground`}>{titulo}</p>
      </div>

      <div className="mt-3.5 flex items-baseline gap-2.5">
        <span className={`${mono} text-[34px] font-extrabold leading-none tracking-[-0.03em]`}>
          {valor}
        </span>
        {unidad && <span className="text-[12px] font-semibold text-muted-foreground">{unidad}</span>}
      </div>

      {(delta || pie) && (
        <div className="mt-3 flex items-center gap-2">
          {delta && (
            <span
              className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-bold ${
                deltaPositivo ? "bg-accent text-accent-foreground" : `bg-muted ${softText}`
              }`}
            >
              {deltaPositivo && <TrendingUp aria-hidden className="h-3 w-3" strokeWidth={2.2} />}
              {delta}
            </span>
          )}
          {pie && <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{pie}</span>}
        </div>
      )}

      {children && <div className="mt-3.5 border-t border-border pt-3">{children}</div>}
    </article>
  );
}
