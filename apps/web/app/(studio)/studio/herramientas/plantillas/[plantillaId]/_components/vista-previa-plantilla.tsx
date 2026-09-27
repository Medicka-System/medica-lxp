'use client';

/**
 * Vista previa SOLO LECTURA de una plantilla de reporte (§6.5). Reproduce el documento tal como
 * el alumno lo verá en "Mis reportes": card de "Datos del estudio" + cards de hallazgos +
 * "Impresión diagnóstica", con el MISMO render por tipo (`CampoReporte`) que el editor de captura.
 * Mismo criterio que la captura (NO el del PDF): se muestran TODOS los campos, honrando `span`;
 * los valores son los `valorDefecto` de la plantilla (vacío donde no hay). Sin edición, sin
 * reporteId, sin acciones.
 */

import { Eye, X } from 'lucide-react';
import { card, kicker, mono, softText, focusRing } from '@/components/tokens';
import { CampoReporte, claseSpan } from '@/components/reportes/campo-reporte';
import {
  campoPacienteDesdeCatalogo,
  CAMPOS_PACIENTE_CATALOGO,
  inicialesDesde,
  type EstructuraPlantilla,
} from '@/lib/reportes/estructura';

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export function VistaPreviaPlantilla({
  nombre,
  tipoEstudio,
  estructura,
}: {
  nombre: string;
  tipoEstudio: string;
  estructura: EstructuraPlantilla;
}) {
  const encabezado = estructura.secciones.find((s) => s.tipo === 'encabezado');
  const camposPaciente = encabezado?.campos.length
    ? encabezado.campos
    : CAMPOS_PACIENTE_CATALOGO.map(campoPacienteDesdeCatalogo);
  const columnasEnc = encabezado?.columnas ?? 3;
  const secciones = estructura.secciones.filter((s) => s.tipo === 'hallazgos');
  // Mismos valores iniciales que un reporte recién creado (boilerplate de la plantilla).
  const { valores, datosPaciente } = inicialesDesde(estructura);
  const impresion = estructura.impresionDefecto ?? '';

  return (
    <div className="min-h-[calc(100vh-60px)] bg-background">
      {/* barra de la vista previa */}
      <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card px-5">
        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
          <Eye className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className={`${kicker} text-muted-foreground`}>Vista previa · así se verá en “Mis reportes”</p>
          <p className="truncate text-[14px] font-bold">
            {nombre}
            {tipoEstudio ? <span className="text-muted-foreground"> · {tipoEstudio}</span> : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className={`ml-auto inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <X aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Cerrar
        </button>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-5">
          {/* card de encabezado: datos del estudio */}
          <section className={`${card} p-5`}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>{encabezado?.titulo ?? 'Datos del estudio'}</p>
              <span className="ml-auto text-[12px] text-muted-foreground">Documento clínico · sí lleva datos del paciente</span>
            </div>
            <div className={`mt-4 grid gap-3.5 ${GRID_COLS[columnasEnc] ?? GRID_COLS[3]}`}>
              {camposPaciente.map((c) => (
                <div key={c.id} className={claseSpan(c, columnasEnc)}>
                  <CampoReporte campo={c} valor={datosPaciente[c.id] ?? ''} modo="llenar" soloLectura />
                </div>
              ))}
            </div>
          </section>

          {secciones.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>Hallazgos por sección</p>
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {nombre.toLowerCase()} · {secciones.length} {secciones.length === 1 ? 'sección' : 'secciones'}
              </span>
            </div>
          )}

          {secciones.map((s) => (
            <section key={s.id} className={`${card} p-5`}>
              <p className="text-[14.5px] font-bold leading-snug">{s.titulo}</p>
              <div className={`mt-3.5 grid gap-3.5 ${GRID_COLS[s.columnas] ?? GRID_COLS[1]}`}>
                {s.campos.map((c) => (
                  <div key={c.id} className={claseSpan(c, s.columnas)}>
                    <CampoReporte campo={c} valor={valores[c.id]} modo="llenar" soloLectura />
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* impresión diagnóstica — solo si la plantilla la incluye (el diseñador la pudo quitar) */}
          {estructura.incluyeImpresion !== false && (
            <section className={`${card} p-5`}>
              <p className={`${kicker} text-secondary`}>Impresión diagnóstica</p>
              <textarea
                rows={3}
                value={impresion}
                readOnly
                placeholder="Cierre con su conclusión: qué encontró, del lado que corresponda, y qué sugiere."
                className="mt-3 w-full resize-y rounded-[10px] border border-border bg-muted p-3.5 text-[15px] font-medium leading-[1.7] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </section>
          )}

          <p className={`text-center text-[12px] ${softText}`}>
            Vista previa de solo lectura. El alumno llena estos campos en “Mis reportes”.
          </p>
        </div>
      </div>
    </div>
  );
}
