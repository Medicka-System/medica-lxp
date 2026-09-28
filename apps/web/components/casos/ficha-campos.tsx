'use client';

/**
 * `FichaCasoCampos` — formulario CONTROLADO de la METADATA del caso (§6 · mig 0025 ·
 * rediseño sobre el motor de reportes). Reutilizable: lo usan el uploader de la bitácora
 * (subir caso) y el editor inline del detalle. Captura órgano, patología, dominio I-AIM,
 * técnica, equipo, docente a validar y etiquetas/#hashtags. Los HALLAZGOS ya NO viven aquí
 * (son el CUERPO estructurado del motor de reportes) ni la viñeta/diagnóstico (bloque
 * pedagógico · ver `BloquePedagogicoCampos`). Los campos heredados del módulo (órgano,
 * dominio) llegan prellenados en `value`. Respeta §5A (tokens, geometría); sin hex hardcodeado.
 */

import { useState, type KeyboardEvent } from 'react';
import { ChevronDown, Tag, X } from 'lucide-react';
import { focusRing } from '@/components/tokens';
import {
  DOMINIOS,
  DOMINIO_LABEL,
  type DocenteOpcion,
  type DominioIaim,
  type FichaCaso,
} from '@/lib/campus/bitacora-contrato';

const campo =
  'mt-[7px] h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary disabled:opacity-60';
const etiquetaCampo = 'block text-[11.5px] font-semibold';

/** Editor de etiquetas / #hashtags como chips (Enter o coma para agregar). */
function EtiquetasInput({
  valor,
  onChange,
  disabled,
}: {
  valor: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState('');

  const agregar = () => {
    const t = texto.trim().replace(/^#+/, '');
    if (!t) return;
    if (!valor.includes(t) && valor.length < 12) onChange([...valor, t]);
    setTexto('');
  };
  const tecla = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      agregar();
    } else if (e.key === 'Backspace' && !texto && valor.length) {
      onChange(valor.slice(0, -1));
    }
  };

  return (
    <div className="mt-[7px] flex flex-wrap items-center gap-1.5 rounded-[10px] border border-border bg-card p-2 focus-within:border-secondary">
      {valor.map((t) => (
        <span
          key={t}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[12px] font-semibold text-accent-foreground"
        >
          <Tag aria-hidden className="h-3 w-3" strokeWidth={1.75} />#{t}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(valor.filter((x) => x !== t))}
              aria-label={`Quitar ${t}`}
              className={`grid h-4 w-4 place-items-center rounded-full hover:bg-[color:var(--track)] ${focusRing}`}
            >
              <X className="h-3 w-3" strokeWidth={2.2} />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={tecla}
          onBlur={agregar}
          placeholder={valor.length ? '' : '#litiasis, #jet-ureteral…'}
          className="h-7 min-w-[120px] flex-1 bg-transparent px-1 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}

export function FichaCasoCampos({
  value,
  onChange,
  docentes,
  disabled = false,
}: {
  value: FichaCaso;
  onChange: (v: FichaCaso) => void;
  docentes: DocenteOpcion[];
  disabled?: boolean;
}) {
  const set = <K extends keyof FichaCaso>(k: K, v: FichaCaso[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={etiquetaCampo}>Órgano / región</span>
          <input
            type="text"
            value={value.organo}
            onChange={(e) => set('organo', e.target.value)}
            disabled={disabled}
            placeholder="Riñón, vesícula, útero…"
            className={campo}
          />
        </label>
        <label className="block">
          <span className={etiquetaCampo}>Patología</span>
          <input
            type="text"
            value={value.patologia}
            onChange={(e) => set('patologia', e.target.value)}
            disabled={disabled}
            placeholder="Litiasis, colecistitis…"
            className={campo}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={etiquetaCampo}>Dominio I-AIM</span>
          <span className="mt-[7px] flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 focus-within:border-secondary">
            <select
              value={value.dominio ?? ''}
              onChange={(e) => set('dominio', (e.target.value || null) as DominioIaim | null)}
              disabled={disabled}
              className="w-full appearance-none bg-transparent text-[14px] font-medium text-foreground outline-none disabled:opacity-60"
            >
              <option value="">Sin especificar</option>
              {DOMINIOS.map((d) => (
                <option key={d} value={d}>
                  {DOMINIO_LABEL[d]}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          </span>
        </label>
        <label className="block">
          <span className={etiquetaCampo}>Docente a validar</span>
          <span className="mt-[7px] flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 focus-within:border-secondary">
            <select
              value={value.docenteId ?? ''}
              onChange={(e) => set('docenteId', e.target.value || null)}
              disabled={disabled}
              className="w-full appearance-none bg-transparent text-[14px] font-medium text-foreground outline-none disabled:opacity-60"
            >
              <option value="">Cualquiera de mis docentes</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={etiquetaCampo}>Técnica</span>
          <input
            type="text"
            value={value.tecnica}
            onChange={(e) => set('tecnica', e.target.value)}
            disabled={disabled}
            placeholder="Modo B, Doppler color…"
            className={campo}
          />
        </label>
        <label className="block">
          <span className={etiquetaCampo}>Equipo</span>
          <input
            type="text"
            value={value.equipo}
            onChange={(e) => set('equipo', e.target.value)}
            disabled={disabled}
            placeholder="Convexo 3.5–5 MHz…"
            className={campo}
          />
        </label>
      </div>

      <div>
        <span className={etiquetaCampo}>Etiquetas</span>
        <EtiquetasInput valor={value.etiquetas} onChange={(v) => set('etiquetas', v)} disabled={disabled} />
      </div>
    </div>
  );
}

/** Ficha (metadata) vacía inicial (para el uploader). */
export function fichaVacia(): FichaCaso {
  return {
    organo: '',
    patologia: '',
    dominio: null,
    tecnica: '',
    equipo: '',
    docenteId: null,
    etiquetas: [],
  };
}
