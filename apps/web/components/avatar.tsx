import { mono } from '@/components/tokens';

/** Avatar de iniciales (fondo navy, tinta blanca · §5A). Sin imágenes por ahora. */
export function Avatar({ ini, size = 36 }: { ini: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={`${mono} grid shrink-0 place-items-center rounded-full bg-sidebar font-bold text-sidebar-foreground`}
    >
      {ini}
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
