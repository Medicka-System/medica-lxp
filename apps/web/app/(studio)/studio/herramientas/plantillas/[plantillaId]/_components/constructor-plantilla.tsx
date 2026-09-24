'use client';

/**
 * Constructor de PLANTILLA DE REPORTE por BLOQUES/CARDS (Studio · §5B/§5C · §6.5).
 *
 * INTUITIVO (estilo Notion/Airtable): todo se edita EN LÍNEA — el título de la sección y
 * el nombre de cada campo se escriben directo (click y teclea), la configuración del campo
 * (unidad, opciones, tabla…) está a la vista sin un paso "editar" aparte, y las tablas se
 * arman con botones claros de +columna / +fila.
 *
 * Monta el reporte en modo "previa" (`<CampoReporte modo="previa">`) para que se vea IGUAL
 * a "Mis reportes": card de "Datos del estudio" (encabezado, editable como bloque) + cards
 * de hallazgos. Guarda en `plantillas_reporte.estructura` (jsonb) vía
 * `guardarEstructuraPlantilla` (RLS es_autoria).
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronUp, Plus, Save, Trash2, X } from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { CampoReporte, claseSpan } from '@/components/reportes/campo-reporte';
import {
  campoNuevo,
  campoPacienteDesdeCatalogo,
  CAMPOS_PACIENTE_CATALOGO,
  contarCampos,
  ETIQUETA_TIPO,
  formatoCampo,
  seccionEncabezadoPorDefecto,
  seccionHallazgosNueva,
  TIPOS_CAMPO,
  type CampoPlantilla,
  type EstructuraPlantilla,
  type SeccionPlantilla,
  type TipoCampo,
} from '@/lib/reportes/estructura';
import { guardarEstructuraPlantilla } from '@/lib/studio/acciones';
import type { PlantillaConstructor } from '@/lib/studio/datos';

const TIPOS_ESTUDIO = ['Abdominal', 'Obstétrico', 'Mama', 'Doppler', 'MSK', 'Tiroideo', 'Renal', 'Pélvico'];

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const inputCls =
  'h-9 w-full rounded-[8px] border border-border bg-card px-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary';

/** Input sin caja que se siente como texto plano hasta que lo enfocas (edición inline). */
const inlineCls =
  'w-full rounded-[6px] bg-transparent outline-none transition-colors hover:bg-muted/60 focus:bg-muted focus:px-1';

/* ═══════════════════════════ raíz ═══════════════════════════ */
export function ConstructorPlantilla({ plantilla }: { plantilla: PlantillaConstructor }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [tipoEstudio, setTipoEstudio] = useState(plantilla.tipoEstudio);
  const [secciones, setSecciones] = useState<SeccionPlantilla[]>(() => {
    const base = plantilla.estructura.secciones;
    return base.some((s) => s.tipo === 'encabezado') ? base : [seccionEncabezadoPorDefecto(), ...base];
  });
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const encabezado = secciones.find((s) => s.tipo === 'encabezado');
  const hallazgos = secciones.filter((s) => s.tipo === 'hallazgos');
  const totalCampos = useMemo(() => contarCampos({ secciones }), [secciones]);

  function actualizarSeccion(id: string, patch: Partial<SeccionPlantilla>) {
    setSecciones((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function mutarCampos(seccionId: string, fn: (c: CampoPlantilla[]) => CampoPlantilla[]) {
    setSecciones((prev) => prev.map((s) => (s.id === seccionId ? { ...s, campos: fn(s.campos) } : s)));
  }
  function agregarSeccion() {
    const n = secciones.filter((s) => s.tipo === 'hallazgos').length + 1;
    setSecciones((prev) => [...prev, seccionHallazgosNueva(`Sección ${n}`)]);
  }
  function eliminarSeccion(id: string) {
    setSecciones((prev) => prev.filter((s) => s.id !== id));
  }
  function moverSeccion(id: string, dir: -1 | 1) {
    setSecciones((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 1 || j >= prev.length) return prev; // no pasar por encima del encabezado
      const cp = [...prev];
      [cp[i], cp[j]] = [cp[j], cp[i]];
      return cp;
    });
  }

  function onGuardar() {
    setMensaje(null);
    const estructura: EstructuraPlantilla = { secciones };
    iniciar(async () => {
      const res = await guardarEstructuraPlantilla(plantilla.id, { nombre, tipoEstudio, estructura });
      if (res.ok) {
        setMensaje({ tipo: 'ok', texto: 'Plantilla guardada. Así la verá el médico.' });
        router.refresh();
      } else {
        setMensaje({ tipo: 'error', texto: res.error });
      }
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-card px-6 py-3">
        <button
          type="button"
          onClick={() => router.push('/studio/herramientas/plantillas')}
          aria-label="Volver a plantillas"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </button>
        <div className="min-w-0">
          <p className={`${kicker} text-muted-foreground`}>Plantilla de reporte</p>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            aria-label="Nombre de la plantilla"
            placeholder="Nombre de la plantilla"
            className="mt-0.5 w-[min(46ch,52vw)] max-w-full rounded-[7px] bg-transparent text-[18px] font-extrabold tracking-[-0.02em] text-foreground outline-none focus:bg-muted focus:px-1"
          />
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <label className="hidden items-center gap-2 sm:flex">
            <span className="text-[11.5px] font-semibold text-muted-foreground">Estudio</span>
            <select value={tipoEstudio} onChange={(e) => setTipoEstudio(e.target.value)} className={`${inputCls} w-[140px]`}>
              <option value="">Sin tipo</option>
              {TIPOS_ESTUDIO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <span className={`${mono} hidden text-[11.5px] text-muted-foreground md:block`}>
            {hallazgos.length + 1} cards · {totalCampos} campos
          </span>
          {plantilla.publicado ? (
            <span className="inline-flex h-7 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
              Publicada
            </span>
          ) : (
            <span className="inline-flex h-7 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
              Borrador
            </span>
          )}
          <button
            type="button"
            onClick={onGuardar}
            disabled={pendiente}
            className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={1.9} />
            {pendiente ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </header>

      {mensaje && (
        <div className="mx-auto max-w-[900px] px-5">
          <p
            className={`mt-3 rounded-[10px] px-3.5 py-2 text-[13px] font-medium ${
              mensaje.tipo === 'ok'
                ? 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
                : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
            }`}
          >
            {mensaje.texto}
          </p>
        </div>
      )}

      <div className="mx-auto flex max-w-[900px] flex-col gap-5 px-5 py-6">
        <p className={`${kicker} text-muted-foreground`}>Vista de construcción · así se verá en “Mis reportes”</p>

        {encabezado && (
          <CardSeccion
            seccion={encabezado}
            esEncabezado
            onSeccion={(patch) => actualizarSeccion(encabezado.id, patch)}
            onCampos={(fn) => mutarCampos(encabezado.id, fn)}
          />
        )}

        {hallazgos.map((s) => (
          <CardSeccion
            key={s.id}
            seccion={s}
            onSeccion={(patch) => actualizarSeccion(s.id, patch)}
            onCampos={(fn) => mutarCampos(s.id, fn)}
            onEliminar={() => eliminarSeccion(s.id)}
            onMover={(dir) => moverSeccion(s.id, dir)}
          />
        ))}

        <button
          type="button"
          onClick={agregarSeccion}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card text-[13.5px] font-bold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
        >
          <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
          Agregar sección de hallazgos
        </button>

        <section className="rounded-xl border border-dashed border-border bg-muted/40 p-5">
          <p className={`${kicker} text-secondary`}>Impresión diagnóstica</p>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Card fija: siempre aparece al final del reporte para la conclusión del médico.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ═══════════════════════════ card de sección ═══════════════════════════ */
function CardSeccion({
  seccion,
  esEncabezado = false,
  onSeccion,
  onCampos,
  onEliminar,
  onMover,
}: {
  seccion: SeccionPlantilla;
  esEncabezado?: boolean;
  onSeccion: (patch: Partial<SeccionPlantilla>) => void;
  onCampos: (fn: (c: CampoPlantilla[]) => CampoPlantilla[]) => void;
  onEliminar?: () => void;
  onMover?: (dir: -1 | 1) => void;
}) {
  const presentes = new Set(seccion.campos.map((c) => c.id));
  const pacienteFaltantes = CAMPOS_PACIENTE_CATALOGO.filter((p) => !presentes.has(p.id));

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      {/* barra de la sección */}
      <div className="flex flex-wrap items-center gap-2.5">
        {esEncabezado && (
          <span className={`${kicker} shrink-0 text-muted-foreground`}>Encabezado ·</span>
        )}
        <input
          value={seccion.titulo}
          onChange={(e) => onSeccion({ titulo: e.target.value })}
          aria-label="Título de la sección"
          placeholder="Título de la sección"
          className={`${inlineCls} min-w-0 flex-1 text-[15px] font-bold leading-snug text-foreground`}
        />
        <SelectorColumnas columnas={seccion.columnas} onCambio={(n) => onSeccion({ columnas: n })} />
        {!esEncabezado && (
          <>
            <IconoBorde label="Subir sección" onClick={() => onMover?.(-1)}>
              <ChevronUp className="h-4 w-4" strokeWidth={2} />
            </IconoBorde>
            <IconoBorde label="Bajar sección" onClick={() => onMover?.(1)}>
              <ChevronDown className="h-4 w-4" strokeWidth={2} />
            </IconoBorde>
            <IconoBorde label="Eliminar sección" peligro onClick={onEliminar}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </IconoBorde>
          </>
        )}
      </div>

      {/* grid de campos */}
      {seccion.campos.length > 0 && (
        <div className={`mt-4 grid gap-3.5 ${GRID_COLS[seccion.columnas] ?? GRID_COLS[1]}`}>
          {seccion.campos.map((c, i) => (
            <div key={c.id} className={claseSpan(c, seccion.columnas)}>
              <CampoConstructor
                campo={c}
                primero={i === 0}
                ultimo={i === seccion.campos.length - 1}
                columnas={seccion.columnas}
                onCambio={(patch) => onCampos((cs) => cs.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))}
                onReemplazar={(nuevo) => onCampos((cs) => cs.map((x) => (x.id === c.id ? nuevo : x)))}
                onEliminar={() => onCampos((cs) => cs.filter((x) => x.id !== c.id))}
                onMover={(dir) => onCampos((cs) => swap(cs, i, i + dir))}
              />
            </div>
          ))}
        </div>
      )}

      {/* agregar campos */}
      <div className="mt-3.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-muted/40 p-3.5">
        {esEncabezado && pacienteFaltantes.length > 0 && (
          <div className="mb-3 border-b border-border pb-3">
            <p className={`${kicker} text-muted-foreground`}>Datos del paciente</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pacienteFaltantes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onCampos((cs) => [...cs, campoPacienteDesdeCatalogo(p)])}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                >
                  <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className={`${kicker} text-muted-foreground`}>Agregar campo</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {TIPOS_CAMPO.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onCampos((cs) => [...cs, campoNuevo(t)])}
              className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
            >
              <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
              {ETIQUETA_TIPO[t]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ campo (edición inline) ═══════════════════════════ */
function CampoConstructor({
  campo,
  primero,
  ultimo,
  columnas,
  onCambio,
  onReemplazar,
  onEliminar,
  onMover,
}: {
  campo: CampoPlantilla;
  primero: boolean;
  ultimo: boolean;
  columnas: number;
  onCambio: (patch: Partial<CampoPlantilla>) => void;
  onReemplazar: (nuevo: CampoPlantilla) => void;
  onEliminar: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  function cambiarTipo(tipo: TipoCampo) {
    // Nuevo campo del tipo elegido, conservando id + nombre + guía.
    onReemplazar({ ...campoNuevo(tipo), id: campo.id, nombre: campo.nombre, guia: campo.guia });
  }

  return (
    <div className="rounded-[11px] border border-dashed border-border bg-card p-3">
      {/* toolbar */}
      <div className="mb-2 flex items-center gap-1.5">
        <select
          value={campo.tipo}
          onChange={(e) => cambiarTipo(e.target.value as TipoCampo)}
          aria-label="Tipo de campo"
          className="h-6 rounded-full bg-muted px-2 text-[10.5px] font-bold text-muted-foreground outline-none focus:ring-1 focus:ring-secondary"
        >
          {TIPOS_CAMPO.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO[t]}
            </option>
          ))}
        </select>
        <span className={`${mono} truncate text-[10px] text-muted-foreground`}>{formatoCampo(campo)}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <SelectorSpan span={campo.span} columnas={columnas} onCambio={(n) => onCambio({ span: n })} />
          <IconoMini label="Subir" disabled={primero} onClick={() => onMover(-1)}>
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
          </IconoMini>
          <IconoMini label="Bajar" disabled={ultimo} onClick={() => onMover(1)}>
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </IconoMini>
          <IconoMini label="Eliminar" peligro onClick={onEliminar}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </IconoMini>
        </div>
      </div>

      {/* subtítulo / guía: el nombre ES el contenido */}
      {campo.tipo === 'titulo' ? (
        <input
          value={campo.nombre}
          onChange={(e) => onCambio({ nombre: e.target.value })}
          placeholder="Escribe el subtítulo…"
          className={`${inlineCls} text-[15px] font-bold tracking-[-0.01em] text-foreground`}
        />
      ) : campo.tipo === 'guia' ? (
        <div
          className="rounded-[11px] border-[1.5px] border-dashed p-3"
          style={{ borderColor: 'color-mix(in oklab, var(--secondary) 35%, white)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-secondary">Guía de la plantilla</p>
          <textarea
            value={campo.nombre}
            onChange={(e) => onCambio({ nombre: e.target.value })}
            rows={2}
            placeholder="Escribe la guía / sugerencias de esta sección…"
            className={`${inlineCls} mt-1 resize-y text-[12.5px] leading-relaxed ${softText}`}
          />
        </div>
      ) : (
        <>
          {/* nombre (etiqueta) inline */}
          <input
            value={campo.nombre}
            onChange={(e) => onCambio({ nombre: e.target.value })}
            placeholder="Nombre del campo"
            className={`${inlineCls} text-[11.5px] font-semibold text-foreground`}
          />

          {/* configuración inline por tipo */}
          {campo.tipo === 'medida' && (
            <label className="mt-1.5 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground">Unidad</span>
              <input
                value={campo.unidad ?? ''}
                onChange={(e) => onCambio({ unidad: e.target.value })}
                placeholder="mm · cm · cc"
                className={`${inputCls} max-w-[120px]`}
              />
            </label>
          )}
          {campo.tipo === 'opcion' && (
            <OpcionesEditor opciones={campo.opciones ?? []} onCambio={(op) => onCambio({ opciones: op })} />
          )}
          {campo.tipo === 'imagen' && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <select
                value={campo.origen ?? 'dicom'}
                onChange={(e) => onCambio({ origen: e.target.value as 'referencia' | 'dicom' })}
                className={`${inputCls} max-w-[240px]`}
              >
                <option value="dicom">Estudio del médico (DICOM)</option>
                <option value="referencia">Referencia fija de la plantilla</option>
              </select>
              {campo.origen === 'referencia' && (
                <input
                  value={campo.refUrl ?? ''}
                  onChange={(e) => onCambio({ refUrl: e.target.value })}
                  placeholder="URL de la imagen de referencia"
                  className={`${inputCls} min-w-[180px] flex-1`}
                />
              )}
            </div>
          )}

          {/* preview del control (idéntico al reporte) o constructor de tabla */}
          <div className="mt-2">
            {campo.tipo === 'tabla' ? (
              <TablaBuilder campo={campo} onCambio={onCambio} />
            ) : (
              <CampoReporte campo={campo} valor="" modo="previa" ocultarEtiqueta />
            )}
          </div>

          {/* guía opcional */}
          <input
            value={campo.guia ?? ''}
            onChange={(e) => onCambio({ guia: e.target.value })}
            placeholder="Texto guía opcional (orienta al médico, no sale en el informe)"
            className={`${inlineCls} mt-2 text-[11px] text-muted-foreground`}
          />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════ editor de opciones (chips) ═══════════════════════════ */
function OpcionesEditor({ opciones, onCambio }: { opciones: string[]; onCambio: (op: string[]) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {opciones.map((o, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5">
          <input
            value={o}
            onChange={(e) => onCambio(opciones.map((x, xi) => (xi === i ? e.target.value : x)))}
            placeholder="opción"
            className="w-[9ch] min-w-[6ch] max-w-[16ch] bg-transparent text-[12px] font-semibold text-foreground outline-none"
            style={{ width: `${Math.max(6, o.length + 2)}ch` }}
          />
          <button
            type="button"
            onClick={() => onCambio(opciones.filter((_, xi) => xi !== i))}
            aria-label={`Quitar ${o}`}
            className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)]"
          >
            <X aria-hidden className="h-3 w-3" strokeWidth={2.4} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onCambio([...opciones, ''])}
        className={`inline-flex h-6 items-center gap-1 rounded-full bg-accent px-2 text-[11px] font-bold text-accent-foreground ${focusRing}`}
      >
        <Plus aria-hidden className="h-3 w-3" strokeWidth={2.4} />
        opción
      </button>
    </div>
  );
}

/* ═══════════════════════════ constructor de tabla ═══════════════════════════ */
function TablaBuilder({ campo, onCambio }: { campo: CampoPlantilla; onCambio: (patch: Partial<CampoPlantilla>) => void }) {
  const cols = campo.columnas ?? [];
  const filas = campo.filas ?? [];

  const setCol = (i: number, v: string) => onCambio({ columnas: cols.map((x, xi) => (xi === i ? v : x)) });
  const setFila = (i: number, v: string) => onCambio({ filas: filas.map((x, xi) => (xi === i ? v : x)) });
  const addCol = () => onCambio({ columnas: [...cols, `Columna ${cols.length + 1}`] });
  const delCol = (i: number) => onCambio({ columnas: cols.filter((_, xi) => xi !== i) });
  const addFila = () => onCambio({ filas: [...filas, `Fila ${filas.length + 1}`] });
  const delFila = (i: number) => onCambio({ filas: filas.filter((_, xi) => xi !== i) });

  const cellInput = 'h-8 w-full min-w-[70px] bg-transparent px-1.5 text-[12px] font-semibold text-foreground outline-none focus:bg-accent';

  return (
    <div className="overflow-x-auto rounded-[10px] border border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="w-[130px] border-b border-border px-1.5 py-1 text-left text-[10px] font-bold text-muted-foreground">
              filas ↓ / columnas →
            </th>
            {cols.map((c, ci) => (
              <th key={ci} className="border-b border-l border-border px-0.5 py-0.5">
                <div className="flex items-center">
                  <input value={c} onChange={(e) => setCol(ci, e.target.value)} placeholder={`Columna ${ci + 1}`} className={cellInput} />
                  <button
                    type="button"
                    onClick={() => delCol(ci)}
                    aria-label={`Quitar columna ${c}`}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)]"
                  >
                    <X aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                  </button>
                </div>
              </th>
            ))}
            <th className="border-b border-l border-border px-1 py-0.5">
              <button
                type="button"
                onClick={addCol}
                className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-[7px] bg-accent px-2 text-[11px] font-bold text-accent-foreground ${focusRing}`}
              >
                <Plus aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                col
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, ri) => (
            <tr key={ri}>
              <th className="border-t border-border bg-muted/40 px-0.5 py-0.5">
                <div className="flex items-center">
                  <input value={f} onChange={(e) => setFila(ri, e.target.value)} placeholder={`Fila ${ri + 1}`} className={cellInput} />
                  <button
                    type="button"
                    onClick={() => delFila(ri)}
                    aria-label={`Quitar fila ${f}`}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)]"
                  >
                    <X aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                  </button>
                </div>
              </th>
              {cols.map((_, ci) => (
                <td key={ci} className="border-l border-t border-border p-0">
                  <input disabled placeholder="—" className="h-8 w-full min-w-[70px] bg-card px-1.5 text-[12px] text-muted-foreground outline-none" />
                </td>
              ))}
              <td className="border-l border-t border-border bg-muted/20" />
            </tr>
          ))}
          <tr>
            <td className="border-t border-border px-1 py-1">
              <button
                type="button"
                onClick={addFila}
                className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-[7px] bg-accent px-2 text-[11px] font-bold text-accent-foreground ${focusRing}`}
              >
                <Plus aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                fila
              </button>
            </td>
            <td className="border-t border-border" colSpan={cols.length + 1} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════ auxiliares ═══════════════════════════ */
function swap<T>(arr: T[], i: number, j: number): T[] {
  if (j < 0 || j >= arr.length) return arr;
  const cp = [...arr];
  [cp[i], cp[j]] = [cp[j], cp[i]];
  return cp;
}

function SelectorColumnas({ columnas, onCambio }: { columnas: number; onCambio: (n: number) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[10.5px] font-semibold text-muted-foreground">Columnas</span>
      <select
        value={columnas}
        onChange={(e) => onCambio(Number(e.target.value))}
        aria-label="Columnas de la sección"
        className="h-8 rounded-[8px] border border-border bg-card px-2 text-[12px] font-semibold text-foreground outline-none focus:border-secondary"
      >
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectorSpan({ span, columnas, onCambio }: { span?: number; columnas: number; onCambio: (n: number) => void }) {
  const valor = span && span >= columnas ? 99 : span ?? 1;
  return (
    <select
      value={valor}
      onChange={(e) => onCambio(Number(e.target.value))}
      aria-label="Ancho del campo"
      title="Columnas que ocupa"
      className="h-6 rounded border border-border bg-card px-1 text-[10px] font-semibold text-muted-foreground outline-none focus:border-secondary"
    >
      {Array.from({ length: columnas }, (_, i) => i + 1).map((n) => (
        <option key={n} value={n}>
          {n} col
        </option>
      ))}
      <option value={99}>Todo</option>
    </select>
  );
}

function IconoMini({
  children,
  label,
  onClick,
  disabled,
  peligro,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid h-6 w-6 place-items-center rounded text-muted-foreground transition-colors disabled:opacity-30 ${focusRing} ${
        peligro ? 'hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)]' : 'hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function IconoBorde({
  children,
  label,
  onClick,
  peligro,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-border text-muted-foreground transition-colors ${focusRing} ${
        peligro ? 'hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)]' : 'hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
