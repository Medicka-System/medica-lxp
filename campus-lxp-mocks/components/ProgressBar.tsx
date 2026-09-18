import { mono } from "./tokens";

/** Barra de avance. En ámbar solo cuando el dominio está en repaso o la fecha aprieta. */
export function ProgressBar({
  valor,
  alto = 6,
  tono = "primary",
  etiqueta,
}: {
  valor: number;
  alto?: number;
  tono?: "primary" | "warn" | "info" | "white";
  etiqueta?: string;
}) {
  const relleno = {
    primary: "bg-primary",
    warn: "bg-[color:var(--warning)]",
    info: "bg-[color:var(--info)]",
    white: "bg-white",
  }[tono];

  return (
    <div
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiqueta}
      style={{ height: alto }}
      className={`w-full overflow-hidden rounded-full ${
        tono === "white" ? "bg-white/[0.22]" : "bg-[color:var(--track)]"
      }`}
    >
      <span aria-hidden className={`block h-full rounded-full ${relleno}`} style={{ width: `${valor}%` }} />
    </div>
  );
}

/** Barra con su cifra al lado, el patrón más repetido del sistema. */
export function ProgressRow({
  valor,
  titulo,
  detalle,
  tono = "primary",
}: {
  valor: number;
  titulo?: string;
  detalle?: string;
  tono?: "primary" | "warn";
}) {
  return (
    <div>
      {titulo && (
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 text-[12px] font-semibold">{titulo}</span>
          <span className={`${mono} shrink-0 text-[13px] font-bold`}>{valor}%</span>
        </div>
      )}
      <div className="mt-1.5">
        <ProgressBar valor={valor} alto={7} tono={tono} etiqueta={titulo} />
      </div>
      {detalle && <p className="mt-1.5 text-[11px] text-muted-foreground">{detalle}</p>}
    </div>
  );
}
