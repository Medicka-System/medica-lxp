/**
 * Marca de Eco (§7A) — sello local del asistente para la consola de admin. Vive
 * aquí (no en `components/`) para no cruzar territorio de otros agentes; es un
 * átomo visual sin lógica. Violeta = Eco (§5A, "el violeta es Eco").
 */
export function EcoMark({
  size = 30,
  invertido = false,
}: {
  size?: number;
  invertido?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-[9px] ${
        invertido
          ? 'bg-card text-[color:var(--info-foreground)]'
          : 'bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.56)}
        height={Math.round(size * 0.56)}
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
