'use client';

/**
 * `CampoReporte` — renderiza UN campo de una plantilla de reporte por su tipo (§6.5).
 *
 * Es la PIEZA COMPARTIDA que garantiza que el constructor del Studio y el reporte del
 * médico se vean IGUAL: los dos montan este mismo componente.
 *   · `modo="llenar"` (médico): inputs activos, escribe valores; el campo `imagen/dicom`
 *     monta el visor Cornerstone3D real o el botón para elegir estudio.
 *   · `modo="previa"` (constructor): misma apariencia, inputs deshabilitados; el
 *     `imagen/dicom` muestra el hueco (no monta el visor pesado).
 *
 * El visor DICOM NO se importa aquí (mantiene el WASM de Cornerstone fuera del bundle
 * del Studio): en modo llenar, el editor del médico lo inyecta por `renderVisorDicom`.
 */

import type { ReactNode } from 'react';
import { Images, ImageOff, X } from 'lucide-react';
import { softText, focusRing } from '@/components/tokens';
import {
  esCampoEstatico,
  leerBool,
  leerRefDicom,
  leerTabla,
  leerTexto,
  type CampoPlantilla,
  type RefDicom,
} from '@/lib/reportes/estructura';

export type ModoCampo = 'llenar' | 'previa';

const inputBase =
  'w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary disabled:opacity-70';

/** Clase de col-span del campo dentro del grid de la sección. */
export function claseSpan(campo: CampoPlantilla, columnas: number): string {
  const bloque = ['multitexto', 'tabla', 'imagen', 'guia', 'titulo'].includes(campo.tipo);
  const span = campo.span ?? 1;
  if (bloque || span >= columnas || span >= 4) return 'col-span-full';
  if (span >= 3) return 'lg:col-span-3';
  if (span >= 2) return 'sm:col-span-2';
  return '';
}

export function CampoReporte({
  campo,
  valor,
  modo,
  onCambio,
  onElegirEstudio,
  onQuitarEstudio,
  renderVisorDicom,
  ocultarEtiqueta = false,
}: {
  campo: CampoPlantilla;
  valor: unknown;
  modo: ModoCampo;
  onCambio?: (valor: unknown) => void;
  /** `imagen/dicom`, modo llenar: abre el selector de estudios del médico. */
  onElegirEstudio?: () => void;
  onQuitarEstudio?: () => void;
  /** `imagen/dicom`, modo llenar: el editor del médico inyecta el visor real. */
  renderVisorDicom?: (ref: RefDicom) => ReactNode;
  /** El constructor pone su propia etiqueta editable en línea → oculta la del control. */
  ocultarEtiqueta?: boolean;
}) {
  const deshabilitado = modo === 'previa';
  const cambia = (v: unknown) => onCambio?.(v);

  /* ── campos de solo presentación ── */
  if (campo.tipo === 'titulo') {
    return (
      <p className="text-[15px] font-bold tracking-[-0.01em] text-foreground">{campo.nombre || 'Subtítulo'}</p>
    );
  }
  if (campo.tipo === 'guia') {
    return (
      <div
        className="rounded-[11px] border-[1.5px] border-dashed p-4"
        style={{
          borderColor: 'color-mix(in oklab, var(--secondary) 35%, white)',
          backgroundImage:
            'repeating-linear-gradient(135deg, color-mix(in oklab, var(--secondary) 7%, transparent) 0 6px, transparent 6px 13px)',
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-secondary">Guía de la plantilla</p>
        <p className={`mt-1.5 text-[12.5px] leading-relaxed ${softText}`}>
          {campo.nombre || 'Sugerencias y recordatorios de esta sección.'}
        </p>
      </div>
    );
  }

  const etiqueta = campo.nombre || '(sin nombre)';
  const ayuda = campo.guia?.trim();

  return (
    <label className="block">
      {!ocultarEtiqueta && (
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[11.5px] font-semibold text-foreground">{etiqueta}</span>
          {campo.tipo === 'medida' && campo.unidad && (
            <span className="text-[10.5px] text-muted-foreground">({campo.unidad})</span>
          )}
        </span>
      )}

      {/* control por tipo */}
      {campo.tipo === 'texto' && (
        <input
          type="text"
          disabled={deshabilitado || campo.bloqueado}
          value={leerTexto(valor)}
          onChange={(e) => cambia(e.target.value)}
          placeholder={campo.bloqueado ? 'Se asigna al crear el reporte' : undefined}
          className={`${inputBase} mt-1.5 h-11 ${campo.bloqueado ? 'bg-muted font-mono tracking-wide text-muted-foreground' : ''}`}
        />
      )}

      {campo.tipo === 'numero' && (
        <input
          type="number"
          disabled={deshabilitado}
          value={leerTexto(valor)}
          onChange={(e) => cambia(e.target.value)}
          className={`${inputBase} mt-1.5 h-11`}
        />
      )}

      {campo.tipo === 'fecha' && (
        <input
          type="date"
          disabled={deshabilitado}
          value={leerTexto(valor)}
          onChange={(e) => cambia(e.target.value)}
          className={`${inputBase} mt-1.5 h-11`}
        />
      )}

      {campo.tipo === 'multitexto' && (
        <textarea
          rows={3}
          disabled={deshabilitado}
          value={leerTexto(valor)}
          onChange={(e) => cambia(e.target.value)}
          placeholder="Redacte los hallazgos."
          className={`${inputBase} mt-1.5 resize-y py-3 leading-[1.7]`}
        />
      )}

      {campo.tipo === 'medida' && (
        <span className="mt-1.5 flex items-stretch">
          <input
            type="number"
            disabled={deshabilitado}
            value={leerTexto(valor)}
            onChange={(e) => cambia(e.target.value)}
            className={`${inputBase} h-11 rounded-r-none`}
          />
          <span className="inline-flex items-center rounded-r-[10px] border border-l-0 border-border bg-muted px-3 text-[12.5px] font-semibold text-muted-foreground">
            {campo.unidad || '—'}
          </span>
        </span>
      )}

      {campo.tipo === 'opcion' && (
        <select
          disabled={deshabilitado}
          value={leerTexto(valor)}
          onChange={(e) => cambia(e.target.value)}
          className={`${inputBase} mt-1.5 h-11 appearance-none`}
        >
          <option value="">Seleccione…</option>
          {(campo.opciones ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}

      {campo.tipo === 'sino' && (
        <span className="mt-1.5 flex gap-2">
          {([['Sí', true], ['No', false]] as const).map(([txt, val]) => {
            const on = leerBool(valor) === val;
            return (
              <button
                key={txt}
                type="button"
                disabled={deshabilitado}
                onClick={() => cambia(on ? null : val)}
                className={`h-10 flex-1 rounded-[10px] border text-[13px] font-bold transition-colors disabled:opacity-70 ${focusRing} ${
                  on
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {txt}
              </button>
            );
          })}
        </span>
      )}

      {campo.tipo === 'tabla' && (
        <TablaCampo campo={campo} valor={valor} deshabilitado={deshabilitado} onCambio={cambia} />
      )}

      {campo.tipo === 'imagen' && (
        <CampoImagen
          campo={campo}
          valor={valor}
          modo={modo}
          onElegirEstudio={onElegirEstudio}
          onQuitarEstudio={onQuitarEstudio}
          renderVisorDicom={renderVisorDicom}
        />
      )}

      {ayuda && !esCampoEstatico(campo.tipo) && (
        <span className="mt-1.5 block text-[11px] leading-snug text-muted-foreground">{ayuda}</span>
      )}
    </label>
  );
}

/* ── tabla (rejilla filas × columnas) ── */
function TablaCampo({
  campo,
  valor,
  deshabilitado,
  onCambio,
}: {
  campo: CampoPlantilla;
  valor: unknown;
  deshabilitado: boolean;
  onCambio: (v: unknown) => void;
}) {
  const cols = campo.columnas ?? [];
  const filas = campo.filas ?? [];
  const datos = leerTabla(valor, filas.length, cols.length);

  function editar(r: number, c: number, v: string) {
    const copia = datos.map((f) => [...f]);
    copia[r][c] = v;
    onCambio(copia);
  }

  return (
    <div className="mt-1.5 overflow-x-auto rounded-[10px] border border-border">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-muted">
            <th className="border-b border-border px-2 py-1.5 text-left text-[11px] font-bold text-muted-foreground" />
            {cols.map((c, i) => (
              <th
                key={i}
                className="border-b border-l border-border px-2 py-1.5 text-left text-[11px] font-bold text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, r) => (
            <tr key={r}>
              <th className="border-t border-border bg-muted/50 px-2 py-1 text-left text-[11.5px] font-semibold">
                {f}
              </th>
              {cols.map((_, c) => (
                <td key={c} className="border-l border-t border-border p-0">
                  <input
                    type="text"
                    disabled={deshabilitado}
                    value={datos[r]?.[c] ?? ''}
                    onChange={(e) => editar(r, c, e.target.value)}
                    className="h-9 w-full min-w-[72px] bg-card px-2 text-[12.5px] text-foreground outline-none focus:bg-accent disabled:opacity-70"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── imagen: referencia fija vs hueco DICOM ── */
function CampoImagen({
  campo,
  valor,
  modo,
  onElegirEstudio,
  onQuitarEstudio,
  renderVisorDicom,
}: {
  campo: CampoPlantilla;
  valor: unknown;
  modo: ModoCampo;
  onElegirEstudio?: () => void;
  onQuitarEstudio?: () => void;
  renderVisorDicom?: (ref: RefDicom) => ReactNode;
}) {
  // Referencia: imagen FIJA de la plantilla (igual en previa y en el reporte).
  if (campo.origen === 'referencia') {
    return campo.refUrl ? (
      <img
        src={campo.refUrl}
        alt={campo.nombre || 'Imagen de referencia'}
        className="mt-1.5 max-h-[320px] w-full rounded-[11px] border border-border object-contain"
      />
    ) : (
      <div className="mt-1.5 grid h-[160px] place-items-center rounded-[11px] border border-dashed border-border bg-muted text-center text-[12px] text-muted-foreground">
        <span>
          <ImageOff className="mx-auto h-5 w-5" strokeWidth={1.5} />
          Imagen de referencia (sin URL)
        </span>
      </div>
    );
  }

  // DICOM: hueco donde el médico inserta imágenes de su estudio.
  const ref: RefDicom | null = leerRefDicom(valor);

  if (modo === 'previa') {
    return (
      <div className="mt-1.5 grid h-[180px] place-items-center rounded-[11px] border-[1.5px] border-dashed border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-center">
        <span className="text-[12px] font-semibold text-[color:var(--info-foreground)]">
          <Images className="mx-auto h-5 w-5" strokeWidth={1.75} />
          Hueco DICOM · el médico inserta aquí su estudio
        </span>
      </div>
    );
  }

  if (ref) {
    return (
      <div className="mt-1.5">
        {renderVisorDicom ? (
          renderVisorDicom(ref)
        ) : (
          <div className="grid h-[280px] place-items-center rounded-xl border border-border bg-muted text-[12px] text-muted-foreground">
            Estudio {ref.casoId.slice(0, 8)} · visor no disponible aquí
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onElegirEstudio}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
          >
            <Images aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Cambiar estudio
          </button>
          <button
            type="button"
            onClick={onQuitarEstudio}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted ${focusRing}`}
          >
            <X aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Quitar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onElegirEstudio}
      className={`mt-1.5 grid h-[180px] w-full place-items-center rounded-[11px] border-[1.5px] border-dashed border-border bg-card text-center transition-colors hover:border-secondary hover:bg-accent ${focusRing}`}
    >
      <span className="text-[12.5px] font-semibold text-secondary">
        <Images className="mx-auto h-6 w-6" strokeWidth={1.75} />
        Insertar imagen del estudio
      </span>
    </button>
  );
}
