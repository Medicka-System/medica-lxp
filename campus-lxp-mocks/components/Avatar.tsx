import { Check } from "lucide-react";

/**
 * Avatar de iniciales sobre navy. La palomita teal marca al DOCENTE: la autoridad clínica
 * se distingue del alumno sin usar color de alerta.
 */
export function Avatar({
  ini,
  size = 38,
  docente = false,
}: {
  ini: string;
  size?: number;
  docente?: boolean;
}) {
  return (
    <span className="relative shrink-0">
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        className="grid place-items-center rounded-full bg-sidebar font-bold text-sidebar-foreground"
      >
        {ini}
      </span>
      {docente && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-card bg-primary text-[color:var(--sidebar)]"
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

/** Pila de iniciales: "quiénes" sin listar nombres. */
export function AvatarStack({ inis, size = 26 }: { inis: string[]; size?: number }) {
  return (
    <span className="flex pl-1.5" aria-hidden>
      {inis.map((i) => (
        <span
          key={i}
          style={{ width: size, height: size }}
          className="-ml-2 grid place-items-center rounded-full border-2 border-card bg-muted font-mono text-[9px] font-bold tabular-nums text-muted-foreground"
        >
          {i}
        </span>
      ))}
    </span>
  );
}
