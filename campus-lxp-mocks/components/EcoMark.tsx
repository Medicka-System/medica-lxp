/**
 * ECO — el asistente de la plataforma. Marca de ondas concéntricas, siempre en violeta:
 * Eco PROPONE y la persona CONFIRMA, así que su color informa y nunca alarma.
 */
export function EcoMark({ size = 32, invertido = false }: { size?: number; invertido?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      className={`grid shrink-0 place-items-center ${
        invertido
          ? "bg-[color:var(--info-foreground)] text-white"
          : "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.58)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      >
        <path d="M7 9a7 7 0 0 1 0 6" />
        <path d="M11 6a11 11 0 0 1 0 12" />
        <circle cx="4" cy="12" r="1.6" />
      </svg>
    </span>
  );
}

/** Aviso de autoría: lo que Eco redacta sale con el nombre de quien publica. */
export function EcoNota({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10px] font-bold text-[color:var(--info-foreground)]">
      {children}
    </span>
  );
}
