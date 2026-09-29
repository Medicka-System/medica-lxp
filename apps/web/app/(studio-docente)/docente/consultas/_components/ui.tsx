/**
 * Átomos compartidos de Consultas (docente): marca de Eco y avatar. Los tokens de
 * estilo (mono/kicker/softText/focusRing) salen del sistema del Studio (§5A) — sin hex.
 */

export { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';

/** Marca de Eco: rombo con ondas concéntricas (violeta = info · §5A). Solo Eco la usa. */
export function EcoMark({ size = 32, invertido = false }: { size?: number; invertido?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      className={`grid shrink-0 place-items-center ${
        invertido
          ? 'bg-[color:var(--info-foreground)] text-white'
          : 'bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.58)}
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

/** Avatar de iniciales sobre navy (§5A) · o foto cuando llega `url` (ya firmada por el call-site). */
export function Avatar({
  ini,
  size = 38,
  url,
}: {
  ini: string;
  size?: number;
  /** URL de imagen LISTA para `<img>` (ya firmada/pública). Sin url → iniciales. */
  url?: string | null;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-sidebar font-bold text-sidebar-foreground"
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : ini}
    </span>
  );
}
