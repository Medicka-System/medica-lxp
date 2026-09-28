'use client';

/**
 * `BloquePedagogicoCampos` — formulario CONTROLADO del bloque pedagógico del caso (§6 ·
 * rediseño sobre el motor de reportes). Lo llena el alumno y es OBLIGATORIO (nunca NULL):
 *   · Viñeta clínica — contexto del caso (edad, motivo, sin PII).
 *   · Diagnóstico presuntivo — su interpretación; es lo que el docente valida.
 *
 * Reutilizable: uploader de la bitácora, editor inline del detalle y modal del puente
 * reporte→caso. Respeta §5A (tokens, geometría); sin hex hardcodeado.
 */

import type { BloquePedagogico } from '@/lib/campus/bitacora-contrato';

const campo =
  'mt-[7px] h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary disabled:opacity-60';
const etiquetaCampo = 'block text-[11.5px] font-semibold';

export function BloquePedagogicoCampos({
  value,
  onChange,
  disabled = false,
}: {
  value: BloquePedagogico;
  onChange: (v: BloquePedagogico) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof BloquePedagogico>(k: K, v: BloquePedagogico[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="flex flex-col gap-4">
      <label className="block">
        <span className={etiquetaCampo}>Viñeta clínica</span>
        <textarea
          rows={3}
          value={value.vineta}
          onChange={(e) => set('vineta', e.target.value)}
          disabled={disabled}
          placeholder="Edad, motivo de consulta y contexto — sin datos que identifiquen al paciente."
          className="mt-[7px] w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary disabled:opacity-60"
        />
      </label>

      <label className="block">
        <span className={etiquetaCampo}>Diagnóstico presuntivo</span>
        <input
          type="text"
          value={value.presuntivo}
          onChange={(e) => set('presuntivo', e.target.value)}
          disabled={disabled}
          placeholder="Su impresión, aunque no esté seguro."
          className={campo}
        />
      </label>
    </div>
  );
}

/** Bloque pedagógico vacío inicial. */
export function bloquePedagogicoVacio(): BloquePedagogico {
  return { vineta: '', presuntivo: '' };
}
