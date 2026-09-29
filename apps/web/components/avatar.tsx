import { mono } from '@/components/tokens';

/**
 * Avatar unificado (§5A). Contrato compartido por las 4 variantes del campus:
 *
 *   • `ini`  — iniciales (fallback cuando no hay foto). Usa `iniciales(nombre)`.
 *   • `url`  — URL de imagen LISTA para `<img src>`: una URL ya firmada (S3/MinIO) o
 *              pública. Este componente NO firma nada — el call-site resuelve el
 *              `avatar_url` del perfil, lo firma con `firmarLecturaImagenes` y pasa el
 *              resultado. `null`/`undefined` → cae al fallback de iniciales.
 *   • `size` — lado en px (círculo).
 *
 * Fondo navy + tinta blanca (§5A). Para el avatar del PROPIO perfil (teal + navy, con
 * anillo) usa `AvatarPerfil` en cuenta/_components.
 */
export function Avatar({
  ini,
  url,
  size = 36,
  className = '',
}: {
  ini: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={`${mono} grid shrink-0 place-items-center overflow-hidden rounded-full bg-sidebar font-bold text-sidebar-foreground ${className}`}
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : ini}
    </span>
  );
}

/** Iniciales a partir de un nombre ("Dra. Sofía Ramírez" → "SR"). */
export function iniciales(nombre: string): string {
  return nombre
    .replace(/^(Dr\.|Dra\.)\s*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
