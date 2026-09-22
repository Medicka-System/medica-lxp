'use client';

/**
 * Cáscara inmersiva compartida de una lección (§5A) — la MISMA barra + modo lectura +
 * encabezado que usan teoría y video, para que TODOS los tipos de lección (incl. tarea
 * y foro) se vean consistentes. Provee:
 *   · Barra de lección sticky bajo el header del shell: salir · título · selector de
 *     temas · anterior/siguiente.
 *   · Modo lectura GLOBAL vía ModoLecturaContext (tiñe el shell y colapsa el lateral);
 *     sin forzar sepia (respeta la preferencia del alumno). Fuera del provider (preview)
 *     cae a un tema local.
 *   · Encabezado consistente: overline (programa · módulo) → título 28/32 → descripción
 *     → divisor. El contenido (children) va centrado a medida de lectura.
 */

import { useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Moon, Sun, Type, X } from 'lucide-react';
import { focusRing } from '@/components/tokens';
import { MigasLeccion } from '@/components/campus/migas-leccion';
import {
  ModoLecturaContext,
  esTemaLectura,
  CLAVE_TEMA,
  type TemaLectura,
} from '@/components/campus/modo-lectura';

const TEMAS: { id: TemaLectura; etiqueta: string; icono: typeof Sun }[] = [
  { id: 'claro', etiqueta: 'Claro', icono: Sun },
  { id: 'sepia', etiqueta: 'Sepia', icono: Type },
  { id: 'oscuro', etiqueta: 'Oscuro', icono: Moon },
];

export type VecinaLeccion = { href: string; etiqueta?: string } | null;

export function CascaraLeccion({
  programa,
  modulo,
  titulo,
  descripcion,
  salirHref = '/cursos',
  anterior = null,
  siguiente = null,
  temaInicial = 'claro',
  children,
}: {
  /** Diplomado/programa — primer nivel del breadcrumb y del overline. */
  programa: string;
  /** Módulo — segundo nivel. */
  modulo: string;
  titulo: string;
  descripcion?: string | null;
  salirHref?: string;
  anterior?: VecinaLeccion;
  siguiente?: VecinaLeccion;
  /** Tema de entrada si el alumno no tiene preferencia (no se fuerza · §5A). */
  temaInicial?: TemaLectura;
  children: React.ReactNode;
}) {
  // Modo lectura GLOBAL si hay provider (campus); si no (preview), local.
  const ctx = useContext(ModoLecturaContext);
  const [temaLocal, setTemaLocal] = useState<TemaLectura>('claro');
  const tema = ctx ? ctx.tema : temaLocal;
  const setTema = (t: TemaLectura) => {
    if (ctx) ctx.setTema(t);
    else {
      setTemaLocal(t);
      localStorage.setItem(CLAVE_TEMA, t);
    }
  };

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  useEffect(() => {
    const c = ctxRef.current;
    if (c) {
      c.activar(temaInicial, false);
      return () => ctxRef.current?.desactivar();
    }
    const t = localStorage.getItem(CLAVE_TEMA);
    if (esTemaLectura(t)) setTemaLocal(t);
    return undefined;
    // eslint-disable-next-line
  }, []);

  const cuerpo = (
    <>
      {/* ══ BARRA DE LECCIÓN — bajo el header, adopta el tono del tema ══ */}
      <div className="sticky top-[68px] z-20 border-b border-border bg-card transition-colors duration-[750ms] motion-reduce:transition-none">
        <div className="mx-auto flex h-[52px] w-full max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href={salirHref}
            aria-label="Salir de la lección"
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-[12.5px] font-semibold text-foreground-soft transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <X className="h-[17px] w-[17px]" strokeWidth={1.75} />
            <span className="hidden sm:inline">Salir</span>
          </Link>

          <MigasLeccion segmentos={[programa, modulo, titulo]} />

          <div
            role="radiogroup"
            aria-label="Tema de lectura"
            className="flex items-center gap-0.5 rounded-full border border-border bg-muted p-0.5"
          >
            {TEMAS.map(({ id, etiqueta, icono: Icono }) => {
              const on = tema === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Tema ${etiqueta}`}
                  title={etiqueta}
                  onClick={() => setTema(id)}
                  className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${focusRing} ${
                    on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-card'
                  }`}
                >
                  <Icono className="h-[16px] w-[16px]" strokeWidth={1.75} />
                </button>
              );
            })}
          </div>

          <span aria-hidden className="hidden h-[22px] w-px shrink-0 bg-border sm:block" />

          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {anterior ? (
              <Link
                href={anterior.href}
                aria-label={anterior.etiqueta ? `Anterior: ${anterior.etiqueta}` : 'Anterior'}
                className={`grid h-9 w-9 place-items-center rounded-control border border-border text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <ArrowLeft className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </Link>
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-control border border-border opacity-30">
                <ArrowLeft className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
            )}
            {siguiente ? (
              <Link
                href={siguiente.href}
                aria-label={siguiente.etiqueta ? `Siguiente: ${siguiente.etiqueta}` : 'Siguiente'}
                className={`grid h-9 w-9 place-items-center rounded-control bg-primary text-primary-foreground transition-colors hover:bg-secondary ${focusRing}`}
              >
                <ArrowRight className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </Link>
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-control border border-border opacity-30">
                <ArrowRight className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══ Encabezado consistente + contenido (medida de lectura centrada) ══ */}
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        <div className="mx-auto w-full max-w-[880px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
            {programa} · {modulo}
          </p>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">{titulo}</h1>
          {descripcion && (
            <p className="mt-3 text-[15px] leading-relaxed text-foreground-soft">{descripcion}</p>
          )}

          <div aria-hidden className="mt-7 h-px w-full bg-border" />

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </>
  );

  if (ctx) return <div className="min-h-full">{cuerpo}</div>;
  return (
    <div
      data-tema-lectura={tema}
      className="min-h-dvh bg-background text-foreground transition-colors duration-[750ms] motion-reduce:transition-none"
    >
      {cuerpo}
    </div>
  );
}
