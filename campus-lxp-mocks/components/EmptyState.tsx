import type { ReactNode } from "react";

/**
 * Estado vacío. Nunca deja la pantalla muda: dice qué falta, por qué está vacío y cuál es el
 * siguiente paso. El borde punteado marca que es una zona por llenar, no un error.
 */
export function EmptyState({
  icono,
  titulo,
  cuerpo,
  acciones,
  nota,
}: {
  icono?: ReactNode;
  titulo: string;
  cuerpo: string;
  acciones?: ReactNode;
  /** letra chica: promesas del sistema, p. ej. la anonimización */
  nota?: string;
}) {
  return (
    <div className="rounded-[14px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-10 py-14 text-center">
      {icono && (
        <span
          aria-hidden
          className="inline-grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground"
        >
          {icono}
        </span>
      )}
      <h3 className="mt-4 text-[19px] font-extrabold tracking-[-0.015em]">{titulo}</h3>
      <p className="mx-auto mt-2.5 max-w-[58ch] text-[13.5px] leading-relaxed text-[color:var(--foreground-soft)]">
        {cuerpo}
      </p>
      {acciones && <div className="mt-5 flex flex-wrap justify-center gap-2.5">{acciones}</div>}
      {nota && <p className="mt-5 text-[12px] text-muted-foreground">{nota}</p>}
    </div>
  );
}
