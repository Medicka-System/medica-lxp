'use client';

/**
 * Selector de TIPO de bloque de teoría, como MODAL centrado (§5A · molde de SelectorTipoLeccion).
 *
 * Sustituye al dropdown anterior, que se recortaba dentro del lienzo con overflow-y-auto del
 * builder. Al ser `fixed inset-0`, escapa de ese overflow y muestra los 10 tipos en sus 4
 * familias sin cortarse. Compartido por el course builder de Programas (editor-teoria) y por el
 * constructor en Grupos (bloques-leccion-grupo), para no duplicar la lista.
 *
 * Solo elige el tipo: `onElegir(tipo)` lo inserta (la lógica vive en cada consumidor). Cierra con
 * Esc, clic fuera o la X. aria-modal.
 */

import { useEffect } from 'react';
import {
  Code,
  FileText,
  Image as ImageIcon,
  Images,
  Link as LinkIcon,
  Package,
  ScanLine,
  SlidersHorizontal,
  Type,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { kicker, softText, focusRing } from '@/lib/studio/estilos';
import {
  INFO_BLOQUE_TEORIA,
  TIPOS_BLOQUE_TEORIA,
  type FamiliaBloque,
  type TipoBloqueTeoria,
} from './tipos-bloque';

/** Nombre de ícono del registro de tipos → componente Lucide. */
const ICONOS: Record<string, LucideIcon> = {
  Type,
  Image: ImageIcon,
  Images,
  Video,
  Code,
  Link: LinkIcon,
  FileText,
  ScanLine,
  SlidersHorizontal,
  Package,
};

const FAMILIAS: { familia: FamiliaBloque; rotulo: string }[] = [
  { familia: 'contenido', rotulo: 'Contenido' },
  { familia: 'multimedia', rotulo: 'Multimedia' },
  { familia: 'interactivo', rotulo: 'Interactivo' },
  { familia: 'clinico', rotulo: 'Clínico' },
];

export function SelectorTipoBloque({
  onElegir,
  onCerrar,
}: {
  onElegir: (tipo: TipoBloqueTeoria) => void;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elige un tipo de bloque"
      onClick={onCerrar}
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-border px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>Agregar bloque</p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
              ¿Qué tipo de bloque?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          {FAMILIAS.map(({ familia, rotulo }) => {
            const tipos = TIPOS_BLOQUE_TEORIA.filter((t) => INFO_BLOQUE_TEORIA[t].familia === familia);
            if (tipos.length === 0) return null;
            return (
              <div key={familia} className="mb-4 last:mb-0">
                <p className={`${kicker} pb-2 text-muted-foreground`}>{rotulo}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tipos.map((t) => {
                    const info = INFO_BLOQUE_TEORIA[t];
                    const Icono = ICONOS[info.icono] ?? Type;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onElegir(t)}
                        className={`flex items-start gap-3 rounded-[12px] border border-border bg-card p-3.5 text-left transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                      >
                        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
                          <Icono className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-bold leading-snug">{info.rotulo}</span>
                          <span className={`mt-0.5 block text-[11.5px] leading-relaxed ${softText}`}>{info.descripcion}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
