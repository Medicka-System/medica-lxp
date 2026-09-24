'use client';

/**
 * La clase de HOY: la única urgencia de la pantalla (ámbar). Grupo, tema, hora, tipo
 * (Zoom / MiCo+), contador para el inicio (se recalcula cada minuto) y el botón que la
 * lanza: "Iniciar clase" (Zoom · abre el start_url) o "Abrir sesión" (MiCo+ · deep-link).
 */

import { useEffect, useState } from 'react';
import { Clock, Pencil, Video } from 'lucide-react';
import { mono, focusRing, rayas, SondaIcon, ChipTipo } from './ui';
import type { ClaseProgramada } from './tipos';

export type ClaseHoyProps = {
  onIniciarClase: (id: string) => void;
  onAbrirMiCo: (id: string) => void;
  onEditarClase: (id: string) => void;
  hoy: ClaseProgramada;
};

/** Cuánto falta para `inicioISO`, legible ("2 h 40 min" · "40 min" · "ahora"). */
function faltaPara(inicioISO: string | null): string {
  if (!inicioISO) return '';
  const min = Math.round((new Date(inicioISO).getTime() - Date.now()) / 60000);
  if (min <= 0) return 'ahora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function ClaseHoy({ onIniciarClase, onAbrirMiCo, onEditarClase, hoy }: ClaseHoyProps) {
  // Contador vivo: arranca del valor del servidor y se recalcula cada minuto en cliente.
  const [empiezaEn, setEmpiezaEn] = useState(hoy.empiezaEn ?? faltaPara(hoy.inicioISO));
  useEffect(() => {
    if (!hoy.inicioISO) return;
    setEmpiezaEn(faltaPara(hoy.inicioISO));
    const t = setInterval(() => setEmpiezaEn(faltaPara(hoy.inicioISO)), 60_000);
    return () => clearInterval(t);
  }, [hoy.inicioISO]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]">
      <div className="flex flex-wrap items-start gap-5 px-6 py-5">
        <div className="min-w-[280px] flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
              <Clock aria-hidden className="h-3 w-3" strokeWidth={2} />
              Hoy
            </span>
            <ChipTipo tipo={hoy.tipo} />
            <span className={`${mono} text-[11.5px] text-[color:var(--warning-foreground)]`}>
              {hoy.duracion}
            </span>
          </div>

          <p
            className="mt-3.5 text-[21px] font-extrabold leading-tight tracking-[-0.02em]"
            style={{ textWrap: 'pretty' }}
          >
            {hoy.tema}
          </p>
          <p className="mt-1.5 text-[13px] text-[color:var(--warning-foreground)]">
            {hoy.grupo} · {hoy.alumnos} alumnos
            {hoy.leccion && (
              <>
                {' '}
                · ligada a <span className={`${mono} font-bold`}>{hoy.leccion}</span>
              </>
            )}
          </p>

          <div className="mt-4 flex items-baseline gap-2.5">
            <span className={`${mono} text-[30px] font-extrabold leading-none tracking-[-0.02em]`}>
              {hoy.hora}
            </span>
            {empiezaEn && (
              <span className="text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">
                empieza en {empiezaEn}
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => (hoy.tipo === 'zoom' ? onIniciarClase(hoy.id) : onAbrirMiCo(hoy.id))}
              className={`inline-flex h-12 items-center gap-2.5 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              {hoy.tipo === 'zoom' ? (
                <Video aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
              ) : (
                <SondaIcon className="h-[18px] w-[18px]" strokeWidth={2} />
              )}
              {hoy.tipo === 'zoom' ? 'Iniciar clase' : 'Abrir sesión'}
            </button>
            <button
              type="button"
              onClick={() => onEditarClase(hoy.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[13px] font-semibold text-[color:var(--warning-foreground)] ${focusRing}`}
            >
              <Pencil aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              Editar
            </button>
          </div>

          {/* lo que pasa fuera de la plataforma, dicho en voz activa */}
          <p className="mt-3.5 text-[11.5px] leading-relaxed text-[color:var(--warning-foreground)]">
            {hoy.tipo === 'zoom'
              ? 'La clase corre en Zoom; la grabación cae en la lección del grupo al terminar, sin que usted la suba.'
              : 'La sesión se transmite desde el equipo Mindray; la grabación queda ahí y se sube cuando el técnico la libera.'}
          </p>
        </div>

        <div
          aria-hidden
          className="relative grid w-[300px] shrink-0 place-items-center overflow-hidden rounded-xl"
          style={{ aspectRatio: '16 / 9', background: 'var(--sidebar)' }}
        >
          <span className="absolute inset-0" style={{ background: rayas }} />
          <span className="relative grid h-[52px] w-[52px] place-items-center rounded-full bg-white/[0.14] text-white">
            {hoy.tipo === 'zoom' ? (
              <Video className="h-6 w-6" strokeWidth={1.75} />
            ) : (
              <SondaIcon className="h-6 w-6" />
            )}
          </span>
          <span
            className={`${mono} absolute bottom-2.5 left-2.5 text-[9.5px] uppercase tracking-[0.14em]`}
            style={{ color: 'var(--hero-ink-muted)' }}
          >
            {hoy.tipo === 'zoom' ? 'sala de Zoom · lista' : 'equipo Mindray · enlazado'}
          </span>
        </div>
      </div>
    </section>
  );
}
