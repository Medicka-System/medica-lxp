'use client';

/**
 * Programar clase: grupo, tipo (Zoom / MiCo+), tema o lección, fecha, hora y duración.
 * Formulario funcional en diálogo modal → llama a `programarClase` (api · Zoom stub /
 * MiCo+ enlace). Mueve el foco al primer campo al abrir y lo devuelve al cerrar; Esc
 * cierra. Si es Zoom, el api crea la reunión; en ambos casos se avisará a los alumnos.
 */

import { useEffect, useMemo, useState } from 'react';
import { Check, Video, X } from 'lucide-react';
import { mono, kicker, softText, focusRing, SondaIcon } from './ui';
import { Select } from '@/components/ui/select';
import type { GrupoOpcion, LeccionOpcion, TipoSesion } from './tipos';
import type { ProgramarClaseInput } from '../_lib/acciones';
import type { ResultadoAccion } from '../../../_lib/acciones';

export type DialogoProgramarProps = {
  setProgramando: (v: boolean) => void;
  tipoNueva: TipoSesion;
  setTipoNueva: (t: TipoSesion) => void;
  gruposDocente: GrupoOpcion[];
  leccionesPorGrupo: Record<string, LeccionOpcion[]>;
  onProgramar: (input: ProgramarClaseInput) => Promise<ResultadoAccion>;
};

const DURACIONES = [45, 60, 75, 90, 120];
const campo =
  'mt-1.5 h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] text-foreground outline-none transition-colors focus:border-secondary';
const campoSelect = `mt-1.5 flex h-11 w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`;

export function DialogoProgramar({
  setProgramando,
  tipoNueva,
  setTipoNueva,
  gruposDocente,
  leccionesPorGrupo,
  onProgramar,
}: DialogoProgramarProps) {
  const [grupoId, setGrupoId] = useState(gruposDocente[0]?.id ?? '');
  const [tema, setTema] = useState('');
  const [leccionId, setLeccionId] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('19:00');
  const [duracion, setDuracion] = useState(90);
  const [enlace, setEnlace] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const lecciones = useMemo(() => leccionesPorGrupo[grupoId] ?? [], [leccionesPorGrupo, grupoId]);

  const cerrar = () => setProgramando(false);

  // Foco al primer campo al abrir; Esc cierra; devuelve el foco al cerrar (§ mock).
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    document.getElementById('dp-grupo')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProgramando(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previo?.focus?.();
    };
  }, [setProgramando]);

  const submit = async () => {
    setError(null);
    if (!grupoId) return setError('Elige el grupo de la clase.');
    if (!tema.trim()) return setError('Ponle un tema a la clase.');
    if (!fecha || !hora) return setError('Indica la fecha y la hora.');
    const inicio = new Date(`${fecha}T${hora}:00`);
    if (Number.isNaN(inicio.getTime())) return setError('La fecha u hora no son válidas.');

    setEnviando(true);
    const res = await onProgramar({
      grupoId,
      tipo: tipoNueva,
      tema: tema.trim(),
      inicioISO: inicio.toISOString(),
      duracionMin: duracion,
      leccionId: leccionId || null,
      enlace: tipoNueva === 'mico' ? enlace.trim() || null : null,
    });
    setEnviando(false);
    if (res.ok) cerrar();
    else setError(res.error);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Programar clase"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center gap-3 px-6 pb-1 pt-5">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>Programar clase</p>
            <p className="mt-1.5 text-[18px] font-extrabold leading-snug tracking-[-0.02em]">
              Una sesión en vivo con su grupo
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
          >
            <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <span className="block text-[11.5px] font-semibold">Tipo de sesión</span>
          <div className="mt-2 flex gap-2.5">
            {(
              [
                ['zoom', 'Clase en Zoom', 'Usted expone; la grabación cae sola en la lección.'],
                ['mico', 'Ultrasonido en vivo · MiCo+', 'Transmite desde el equipo Mindray. Se graba en el equipo.'],
              ] as const
            ).map(([id, titulo, sub]) => {
              const on = tipoNueva === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTipoNueva(id)}
                  aria-pressed={on}
                  className={`flex min-w-0 flex-1 items-start gap-2.5 rounded-xl border-[1.5px] p-3.5 text-left transition-colors ${focusRing} ${
                    on ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${
                      on ? 'bg-primary text-[color:var(--sidebar)]' : `bg-muted ${softText}`
                    }`}
                  >
                    {id === 'zoom' ? <Video className="h-4 w-4" strokeWidth={1.75} /> : <SondaIcon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold leading-snug">{titulo}</span>
                    <span className={`mt-1 block text-[11.5px] leading-relaxed ${softText}`}>{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <label className="min-w-[220px] flex-1">
              <span className="block text-[11.5px] font-semibold">Grupo</span>
              <Select
                id="dp-grupo"
                aria-label="Grupo"
                value={grupoId}
                onChange={(v) => {
                  setGrupoId(v);
                  setLeccionId('');
                }}
                className={campoSelect}
                options={
                  gruposDocente.length === 0
                    ? [{ value: '', label: 'Sin grupos asignados' }]
                    : gruposDocente.map((g) => ({ value: g.id, label: `${g.nombre} · ${g.alumnos} alumnos` }))
                }
              />
            </label>
            <label className="min-w-[220px] flex-1">
              <span className="block text-[11.5px] font-semibold">Lección ligada (opcional)</span>
              <Select
                aria-label="Lección ligada (opcional)"
                value={leccionId}
                onChange={(v) => setLeccionId(v)}
                className={campoSelect}
                options={[
                  { value: '', label: 'Sin lección ligada' },
                  ...lecciones.map((l) => ({ value: l.id, label: l.label })),
                ]}
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="block text-[11.5px] font-semibold">Tema de la clase</span>
            <input
              type="text"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="p. ej. Doppler renal: cuándo sí aporta"
              className={campo}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <label className="min-w-[220px] flex-[1.7]">
              <span className="block text-[11.5px] font-semibold">Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
            </label>
            <label className="min-w-[110px] flex-1">
              <span className="block text-[11.5px] font-semibold">Hora</span>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={campo} />
            </label>
            <label className="min-w-[110px] flex-1">
              <span className="block text-[11.5px] font-semibold">Duración</span>
              <Select
                aria-label="Duración"
                value={String(duracion)}
                onChange={(v) => setDuracion(Number(v))}
                className={campoSelect}
                options={DURACIONES.map((d) => ({ value: String(d), label: `${d} min` }))}
              />
            </label>
          </div>

          {tipoNueva === 'mico' && (
            <label className="mt-4 block">
              <span className="block text-[11.5px] font-semibold">Enlace de la sesión MiCo+ (opcional)</span>
              <input
                type="url"
                value={enlace}
                onChange={(e) => setEnlace(e.target.value)}
                placeholder="https://…"
                className={campo}
              />
            </label>
          )}

          <div className="mt-4 flex items-center gap-3 rounded-[11px] border border-border bg-muted px-3.5 py-3">
            <Check aria-hidden className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2.4} />
            <p className={`min-w-0 flex-1 text-[12px] leading-relaxed ${softText}`}>
              {tipoNueva === 'zoom'
                ? 'Se avisa a los alumnos y aparece en su calendario del campus. La liga de Zoom se genera al guardar.'
                : 'Se avisa a los alumnos y se reserva el equipo. El enlace de MiCo+ se registra al guardar.'}
            </p>
          </div>

          {error && (
            <p className="mt-3 rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-border bg-muted px-6 py-4">
          <span className={`${mono} min-w-0 flex-1 text-[11.5px] text-muted-foreground`}>
            {tipoNueva === 'zoom' ? 'Zoom · reunión al guardar' : 'MiCo+ · se ejecuta en el equipo'}
          </span>
          <button
            type="button"
            onClick={cerrar}
            className={`h-11 shrink-0 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={enviando}
            className={`h-12 shrink-0 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
          >
            {enviando ? 'Programando…' : 'Programar la clase'}
          </button>
        </div>
      </div>
    </div>
  );
}
