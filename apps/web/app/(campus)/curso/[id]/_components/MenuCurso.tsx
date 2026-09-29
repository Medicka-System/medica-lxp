'use client';

/**
 * Menú del curso · reemplaza al buscador del header del campus cuando el alumno está
 * dentro de un curso. Cinco secciones; la activa en teal con barra inferior de 2.5px.
 * Se registra en el header vía CursoShell (contexto del CampusShell).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardCheck, LayoutGrid, MessagesSquare, Users } from 'lucide-react';
import { focusRing } from './curso';

const SECCIONES = [
  { seg: 'contenido', etiqueta: 'Contenido', icono: LayoutGrid },
  { seg: 'tareas', etiqueta: 'Tareas', icono: ClipboardCheck },
  { seg: 'foros', etiqueta: 'Foros', icono: MessagesSquare },
  { seg: 'calificaciones', etiqueta: 'Calificaciones', icono: BarChart3 },
  { seg: 'alumnos', etiqueta: 'Alumnos', icono: Users },
] as const;

export function MenuCurso({ cursoId }: { cursoId: string }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones del curso" className="mx-auto flex h-[68px] items-stretch gap-0.5">
      {SECCIONES.map(({ seg, etiqueta, icono: Icono }) => {
        const href = `/curso/${cursoId}/${seg}`;
        const on = ruta.startsWith(href);
        return (
          <Link
            key={seg}
            href={href}
            aria-current={on ? 'page' : undefined}
            className={`relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 text-[13.5px] no-underline transition-colors ${focusRing} ${
              on ? 'font-bold text-secondary' : 'font-medium text-[color:var(--foreground-soft)] hover:text-foreground'
            }`}
          >
            <Icono aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            {etiqueta}
            {on && <span aria-hidden className="absolute inset-x-3.5 bottom-0 h-[2.5px] rounded-t-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}
