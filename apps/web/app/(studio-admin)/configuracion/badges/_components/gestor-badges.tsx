'use client';

/**
 * Studio · Configuración › Badges y reconocimientos (§6/§8). Gestión del CATÁLOGO
 * `lxp.badges`: listar, crear, editar y borrar insignias con su REGLA (la misma que
 * evalúa el motor automático · @campus/shared). NO toca el otorgamiento automático
 * (worker) ni la vista del alumno (Reconocimiento) — solo administra el catálogo.
 */

import { useState, useTransition } from 'react';
import { Award, Lock, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/components/tokens';
import { Select } from '@/components/ui/select';
import {
  crearBadge,
  actualizarBadge,
  eliminarBadge,
  type BadgeAdmin,
  type ReglaUi,
  type TipoReglaUi,
} from '../_acciones';

const TIPOS: { value: TipoReglaUi; label: string }[] = [
  { value: 'manual', label: 'Manual (la otorga el docente)' },
  { value: 'casos', label: 'Automática · por casos validados' },
  { value: 'horas', label: 'Automática · por horas acreditadas' },
  { value: 'competencia', label: 'Automática · por competencia I-AIM' },
  { value: 'racha', label: 'Automática · por racha (días)' },
  { value: 'hito', label: 'Automática · al alcanzar un hito' },
];

const DOMINIOS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos los dominios' },
  { value: 'indicacion', label: 'Indicación' },
  { value: 'adquisicion', label: 'Adquisición' },
  { value: 'interpretacion', label: 'Interpretación' },
  { value: 'decision_medica', label: 'Decisión médica' },
];

const DOM_LABEL: Record<string, string> = Object.fromEntries(DOMINIOS.map((d) => [d.value, d.label]));

/** Texto legible de la regla de un badge para la lista. */
function describeRegla(b: BadgeAdmin): string {
  const r = b.regla;
  if (!r) return 'Manual';
  switch (r.tipo) {
    case 'casos':
      return `Automática · ${r.umbral ?? 1} casos`;
    case 'horas':
      return `Automática · ${r.umbral ?? 0} horas`;
    case 'competencia':
      return `Automática · competencia ≥ ${r.umbral ?? 60}${r.dominio ? ` en ${DOM_LABEL[r.dominio] ?? r.dominio}` : ' (todos)'}`;
    case 'racha':
      return `Automática · racha ${r.umbral ?? 0} días`;
    case 'hito':
      return `Automática · hito ${r.hito ?? '—'}`;
    default:
      return 'Automática';
  }
}

type Borrador = {
  id?: string;
  nombre: string;
  descripcion: string;
  regla: ReglaUi;
};

function borradorDe(b?: BadgeAdmin): Borrador {
  if (!b) return { nombre: '', descripcion: '', regla: { tipo: 'manual' } };
  const r = b.regla;
  return {
    id: b.id,
    nombre: b.nombre,
    descripcion: b.descripcion,
    regla: r
      ? { tipo: r.tipo, umbral: r.umbral, dominio: r.dominio ?? 'todos', hito: r.hito }
      : { tipo: 'manual' },
  };
}

export function GestorBadges({ badges }: { badges: BadgeAdmin[] }) {
  const [editor, setEditor] = useState<Borrador | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 pb-16 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-accent text-accent-foreground">
          <Award className="h-[22px] w-[22px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Badges y reconocimientos</h1>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Insignias con reglas automáticas —casos, horas, competencia, hitos, racha— o entregadas a mano. El motor las otorga solo; aquí defines el catálogo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setAviso(null); setEditor(borradorDe()); }}
          className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-4 w-4" strokeWidth={2.4} />
          Nueva insignia
        </button>
      </div>

      {aviso && (
        <p className="mt-4 rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2 text-[12px] font-semibold text-[color:var(--warning-foreground)]">
          {aviso}
        </p>
      )}

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {badges.map((b) => (
          <li key={b.id} className={`${card} flex items-start gap-3 p-4`}>
            <span
              aria-hidden
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-[10px] ${b.regla ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {b.regla ? <Award className="h-5 w-5" strokeWidth={1.75} /> : <Sparkles className="h-5 w-5" strokeWidth={1.75} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold leading-tight">{b.nombre}</p>
              {b.descripcion && <p className={`mt-0.5 text-[11.5px] ${softText}`}>{b.descripcion}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex h-[20px] items-center rounded-full px-2 text-[10px] font-bold ${b.regla ? 'bg-accent text-accent-foreground' : 'border border-border bg-muted text-muted-foreground'}`}>
                  {describeRegla(b)}
                </span>
                {b.otorgados > 0 && (
                  <span className={`${mono} text-[10.5px] text-muted-foreground`}>· {b.otorgados} otorgada{b.otorgados === 1 ? '' : 's'}</span>
                )}
              </div>
              <p className={`${mono} mt-1 text-[10px] text-muted-foreground`}>{b.clave}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button
                type="button"
                onClick={() => { setAviso(null); setEditor(borradorDe(b)); }}
                aria-label={`Editar ${b.nombre}`}
                className={`grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <BotonBorrar badge={b} onError={setAviso} />
            </div>
          </li>
        ))}
      </ul>

      {badges.length === 0 && (
        <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
          Aún no hay insignias en el catálogo. Crea la primera.
        </p>
      )}

      {editor && (
        <EditorBadge
          inicial={editor}
          onCerrar={() => setEditor(null)}
          onError={setAviso}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Borrar (con confirmación) ─────────────────────────── */
function BotonBorrar({ badge, onError }: { badge: BadgeAdmin; onError: (s: string | null) => void }) {
  const [confirmar, setConfirmar] = useState(false);
  const [pending, iniciar] = useTransition();

  if (!confirmar) {
    return (
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        aria-label={`Borrar ${badge.nombre}`}
        className={`grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-[color:var(--destructive-border)] hover:text-destructive ${focusRing}`}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
      </button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1 rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] p-1.5">
      {badge.otorgados > 0 && (
        <span className="max-w-[150px] text-right text-[10px] font-semibold text-[color:var(--destructive-foreground)]">
          Ya otorgada {badge.otorgados} vez/veces: se quitará también a esos perfiles.
        </span>
      )}
      <div className="flex gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            iniciar(async () => {
              const r = await eliminarBadge(badge.id);
              if (!r.ok) onError(r.error);
              setConfirmar(false);
            })
          }
          className="h-7 rounded-md bg-destructive px-2 text-[11px] font-bold text-white disabled:opacity-60"
        >
          {pending ? 'Borrando…' : 'Confirmar'}
        </button>
        <button type="button" onClick={() => setConfirmar(false)} className="h-7 rounded-md border border-border bg-card px-2 text-[11px] font-semibold">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Editor (crear / editar) ─────────────────────────── */
function EditorBadge({
  inicial,
  onCerrar,
  onError,
}: {
  inicial: Borrador;
  onCerrar: () => void;
  onError: (s: string | null) => void;
}) {
  const [b, setB] = useState<Borrador>(inicial);
  const [pending, iniciar] = useTransition();
  const esEdicion = Boolean(b.id);
  const tipo = b.regla.tipo;
  const pideUmbral = tipo === 'casos' || tipo === 'horas' || tipo === 'competencia' || tipo === 'racha';
  const unidad = tipo === 'horas' ? 'horas' : tipo === 'casos' ? 'casos' : tipo === 'racha' ? 'días' : 'nivel mínimo';

  function guardar() {
    onError(null);
    iniciar(async () => {
      const payload = { nombre: b.nombre, descripcion: b.descripcion, regla: b.regla };
      const r = esEdicion
        ? await actualizarBadge({ id: b.id!, ...payload })
        : await crearBadge(payload);
      if (!r.ok) { onError(r.error); return; }
      onCerrar();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-[color:var(--sidebar)]/40" />
      <div className="relative z-10 w-full max-w-[460px] rounded-xl border border-border bg-card p-5 shadow-rest">
        <div className="flex items-center gap-2.5">
          <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>{esEdicion ? 'Editar insignia' : 'Nueva insignia'}</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className={`grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted ${focusRing}`}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <label className="mt-4 block">
          <span className="block text-[11.5px] font-semibold">Nombre</span>
          <input
            type="text"
            value={b.nombre}
            maxLength={60}
            onChange={(e) => setB({ ...b, nombre: e.target.value })}
            placeholder="50 casos"
            className={`mt-1.5 h-[42px] w-full rounded-[10px] border border-border bg-card px-3 text-[14px] font-bold outline-none transition-colors focus:border-secondary ${focusRing}`}
          />
        </label>

        <label className="mt-3 block">
          <span className="block text-[11.5px] font-semibold">Descripción</span>
          <input
            type="text"
            value={b.descripcion}
            maxLength={140}
            onChange={(e) => setB({ ...b, descripcion: e.target.value })}
            placeholder="Cincuenta casos validados en la bitácora"
            className={`mt-1.5 h-[42px] w-full rounded-[10px] border border-border bg-card px-3 text-[13px] outline-none transition-colors focus:border-secondary ${focusRing}`}
          />
        </label>

        <div className="mt-3">
          <span className="block text-[11.5px] font-semibold">Regla</span>
          <Select
            aria-label="Tipo de regla"
            value={tipo}
            onChange={(v) => setB({ ...b, regla: { ...b.regla, tipo: v as TipoReglaUi } })}
            className={`mt-1.5 flex w-full items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-2 text-[13px] outline-none hover:border-secondary ${focusRing}`}
            options={TIPOS}
          />

          {pideUmbral && (
            <label className="mt-2.5 block">
              <span className="block text-[11px] text-muted-foreground">Umbral ({unidad})</span>
              <input
                type="number"
                min={tipo === 'competencia' ? 0 : 1}
                max={tipo === 'competencia' ? 100 : undefined}
                value={b.regla.umbral ?? ''}
                onChange={(e) => setB({ ...b, regla: { ...b.regla, umbral: e.target.value === '' ? undefined : Number(e.target.value) } })}
                placeholder={tipo === 'competencia' ? '60' : '50'}
                className={`mt-1 h-[40px] w-full rounded-[10px] border border-border bg-card px-3 text-[13px] ${mono} outline-none focus:border-secondary ${focusRing}`}
              />
            </label>
          )}

          {tipo === 'competencia' && (
            <label className="mt-2.5 block">
              <span className="block text-[11px] text-muted-foreground">Dominio I-AIM</span>
              <Select
                aria-label="Dominio I-AIM"
                value={b.regla.dominio ?? 'todos'}
                onChange={(v) => setB({ ...b, regla: { ...b.regla, dominio: v } })}
                className={`mt-1 flex w-full items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-2 text-[13px] outline-none hover:border-secondary ${focusRing}`}
                options={DOMINIOS}
              />
            </label>
          )}

          {tipo === 'hito' && (
            <label className="mt-2.5 block">
              <span className="block text-[11px] text-muted-foreground">Identificador del hito</span>
              <input
                type="text"
                value={b.regla.hito ?? ''}
                onChange={(e) => setB({ ...b, regla: { ...b.regla, hito: e.target.value } })}
                placeholder="horas_100"
                className={`mt-1 h-[40px] w-full rounded-[10px] border border-border bg-card px-3 text-[13px] ${mono} outline-none focus:border-secondary ${focusRing}`}
              />
            </label>
          )}

          {tipo === 'manual' && (
            <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Sin regla automática: el docente la otorga a mano desde el expediente del alumno.
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" onClick={onCerrar} className="h-10 rounded-[10px] border border-border bg-card px-4 text-[13px] font-semibold">
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className={`h-10 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
          >
            {pending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear insignia'}
          </button>
        </div>
      </div>
    </div>
  );
}
