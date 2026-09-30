'use client';

/**
 * Menú del curso · reemplaza al buscador del header del campus cuando el alumno está
 * dentro de un curso. Cinco secciones; la activa en teal con un subrayado que SE
 * DESLIZA entre tabs (un solo <span>, animado por transform — translateX + scaleX —
 * jamás por width). Se registra en el header vía CursoShell (contexto del CampusShell).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BarChart3, ClipboardCheck, LayoutGrid, MessagesSquare, Users } from 'lucide-react';
import { focusRing } from './curso';

const SECCIONES = [
  { seg: 'contenido', etiqueta: 'Contenido', icono: LayoutGrid },
  { seg: 'tareas', etiqueta: 'Tareas', icono: ClipboardCheck },
  { seg: 'foros', etiqueta: 'Foros', icono: MessagesSquare },
  { seg: 'calificaciones', etiqueta: 'Calificaciones', icono: BarChart3 },
  { seg: 'alumnos', etiqueta: 'Alumnos', icono: Users },
] as const;

// El subrayado abraza SOLO la etiqueta (no el padding horizontal del tab), como antes
// hacía el `inset-x-3.5` del bar por-tab. px-3.5 = 14px a cada lado.
const PAD = 14;

export function MenuCurso({ cursoId }: { cursoId: string }) {
  const ruta = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const activo = SECCIONES.findIndex(({ seg }) => ruta.startsWith(`/curso/${cursoId}/${seg}`));
  // { left, width } del subrayado en el sistema de coordenadas de la nav; null =
  // ninguna sección activa (p. ej. Historial/Comentarios no viven aquí) → oculto.
  const [barra, setBarra] = useState<{ left: number; width: number } | null>(null);

  // Mide el tab activo tras montar/navegar y ante cambios de layout (fuentes, resize).
  // useEffect (no LayoutEffect) para no advertir en SSR del client component; el
  // subrayado entra con su propio fade, así que el frame extra no se nota.
  useEffect(() => {
    const medir = () => {
      const el = activo >= 0 ? tabsRef.current[activo] : null;
      if (!el) {
        setBarra(null);
        return;
      }
      setBarra({ left: el.offsetLeft + PAD, width: Math.max(0, el.offsetWidth - PAD * 2) });
    };
    medir();
    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(medir);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [activo, cursoId]);

  return (
    <nav ref={navRef} aria-label="Secciones del curso" className="relative mx-auto flex h-[68px] items-stretch gap-0.5">
      {SECCIONES.map(({ seg, etiqueta, icono: Icono }, i) => {
        const href = `/curso/${cursoId}/${seg}`;
        const on = i === activo;
        return (
          <Link
            key={seg}
            ref={(el) => {
              tabsRef.current[i] = el;
            }}
            href={href}
            aria-current={on ? 'page' : undefined}
            className={`relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 text-[13.5px] no-underline transition-colors [transition-duration:var(--dur-rapida)] [transition-timing-function:var(--ease-estandar)] motion-reduce:transition-none ${focusRing} ${
              on ? 'font-bold text-secondary' : 'font-medium text-[color:var(--foreground-soft)] hover:text-foreground'
            }`}
          >
            <Icono aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            {etiqueta}
          </Link>
        );
      })}

      {/* Subrayado único deslizante: base de 1px escalada por scaleX (transform-origin
          izquierda) y posicionada por translateX. Solo transform/opacity transicionan;
          nunca width. Sin borde redondeado para que scaleX no deforme el radio. */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[2.5px] w-px origin-left bg-primary transition-[transform,opacity] [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-estandar)] motion-reduce:transition-none"
        style={{
          transform: barra ? `translateX(${barra.left}px) scaleX(${barra.width})` : 'translateX(0) scaleX(0)',
          opacity: barra ? 1 : 0,
        }}
      />
    </nav>
  );
}
