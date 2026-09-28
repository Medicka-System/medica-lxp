'use client';

/**
 * `ContenidoEstructuradoCasoVista` — muestra la VERDAD ESTRUCTURADA de un caso (§7A ·
 * Opción B) COINCIDIBLE con el reporte del que salió: reusa la MISMA pieza `CampoReporte`
 * que el constructor y el reporte del médico, así la TABLA se ve como tabla, la medida con
 * su unidad y el sí/no como botones — nunca aplanado a texto.
 *
 * Un solo componente, dos modos:
 *   · `modo="previa"` (bitácora del alumno): read-only, inputs deshabilitados.
 *   · `modo="llenar"` (curaduría del docente): editable; `onCambioValor`/`onCambioImpresion`
 *     suben los cambios para que el curador ajuste hallazgos/mediciones antes de publicar.
 *
 * Las imágenes NO se renderizan aquí: van al VISOR DICOM anonimizado (transversal). Por eso
 * se saltan los campos `imagen`/`galeria`. El caller cae al texto derivado `hallazgos`
 * cuando el caso es viejo/sin estructura (este componente devuelve null si no hay nada).
 */

import { CampoReporte, claseSpan, type ModoCampo } from '@/components/reportes/campo-reporte';
import { EditorRico, ContenidoRico } from '@/components/editor-rico';
import { card, kickerWide as kicker, softText } from '@/components/tokens';
import { normalizarEstructura, type CampoPlantilla } from '@/lib/reportes/estructura';
import type { ContenidoEstructuradoCaso } from '@campus/shared';

/** Campo RICO (HTML): editor TipTap en `llenar`, visor en `previa`. Reusa EditorRico/ContenidoRico. */
function CampoRico({
  campo,
  valor,
  editable,
  onCambio,
}: {
  campo: CampoPlantilla;
  valor: unknown;
  editable: boolean;
  onCambio?: (html: string) => void;
}) {
  const html = typeof valor === 'string' ? valor : '';
  return (
    <div className="block">
      <span className="text-[11.5px] font-semibold text-foreground">{campo.nombre || 'Hallazgos'}</span>
      <div className="mt-[7px]">
        {editable ? (
          <EditorRico
            contenidoInicial={html}
            editable
            placeholder={campo.guia}
            minAlto={180}
            ariaLabel={campo.nombre || 'Hallazgos'}
            onChange={onCambio}
          />
        ) : (
          <ContenidoRico html={html} />
        )}
      </div>
    </div>
  );
}

/** Grid de la sección (mismas clases que el editor del reporte → mismo look). */
const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

/** Campos que maneja el visor, no el bloque de hallazgos. */
const EN_VISOR = new Set(['imagen', 'galeria']);

const inputBase =
  'w-full rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] leading-[1.7] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary disabled:opacity-70';

export function ContenidoEstructuradoCasoVista({
  contenido,
  modo = 'previa',
  onCambioValor,
  onCambioImpresion,
  className = '',
}: {
  contenido: ContenidoEstructuradoCaso;
  modo?: ModoCampo;
  /** modo `llenar`: el curador editó un campo del estudio. */
  onCambioValor?: (campoId: string, valor: unknown) => void;
  /** modo `llenar`: el curador editó la impresión diagnóstica. */
  onCambioImpresion?: (valor: string) => void;
  className?: string;
}) {
  // La estructura persistida (secciones de plantilla) → forma tipada para CampoReporte.
  const estructura = normalizarEstructura({ secciones: contenido.secciones });
  const valores = contenido.valores ?? {};
  const secciones = estructura.secciones
    .filter((s) => s.tipo !== 'encabezado')
    .map((s) => ({ ...s, campos: s.campos.filter((c) => !EN_VISOR.has(c.tipo)) }))
    .filter((s) => s.campos.length > 0);
  const impresion = contenido.impresion ?? '';
  const editable = modo === 'llenar';

  if (secciones.length === 0 && impresion.trim() === '' && !editable) return null;

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {secciones.map((s) => (
        <section key={s.id} className={`${card} p-5 sm:p-6`}>
          {s.titulo && <p className={`${kicker} text-muted-foreground`}>{s.titulo}</p>}
          <div className={`mt-3.5 grid gap-3.5 ${GRID_COLS[s.columnas] ?? GRID_COLS[1]}`}>
            {s.campos.map((c) => (
              <div key={c.id} className={claseSpan(c, s.columnas)}>
                {c.rico ? (
                  <CampoRico
                    campo={c}
                    valor={valores[c.id]}
                    editable={editable}
                    onCambio={onCambioValor ? (html) => onCambioValor(c.id, html) : undefined}
                  />
                ) : (
                  <CampoReporte
                    campo={c}
                    valor={valores[c.id]}
                    modo={modo}
                    onCambio={onCambioValor ? (v) => onCambioValor(c.id, v) : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {(impresion.trim() !== '' || editable) && (
        <section className={`${card} p-5 sm:p-6`}>
          <p className={`${kicker} text-muted-foreground`}>Impresión diagnóstica</p>
          {editable ? (
            <textarea
              rows={3}
              value={impresion}
              onChange={(e) => onCambioImpresion?.(e.target.value)}
              placeholder="Impresión diagnóstica del estudio."
              className={`${inputBase} mt-3 resize-y`}
            />
          ) : (
            <p className={`mt-3 max-w-[70ch] whitespace-pre-line text-[15px] leading-[1.75] ${softText}`}>
              {impresion}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
