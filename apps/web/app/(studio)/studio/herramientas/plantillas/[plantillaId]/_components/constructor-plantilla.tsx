'use client';

/**
 * Constructor de PLANTILLA DE REPORTE por BLOQUES/CARDS (Studio · §5B/§5C · §6.5).
 *
 * Arma la MISMA estructura que el médico llena, con la MISMA apariencia: monta el reporte
 * en modo "previa" (`<CampoReporte modo="previa">`) — card de "Datos del estudio"
 * (encabezado) + cards de hallazgos por sección, en su grid de columnas. El diseñador
 * agrega/quita/reordena secciones y campos, y ajusta cada campo con su panel de propiedades.
 * Guarda en `plantillas_reporte.estructura` (jsonb) vía `guardarEstructuraPlantilla` (RLS
 * es_autoria). El resultado se ve idéntico en "Mis reportes".
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { CampoReporte, claseSpan } from '@/components/reportes/campo-reporte';
import {
  campoNuevo,
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

/** Tipos que el diseñador coloca dentro de una card de hallazgos. */
const TIPOS_AGREGABLES: TipoCampo[] = TIPOS_CAMPO;

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const inputCls =
  'h-9 w-full rounded-[8px] border border-border bg-card px-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary';

export function ConstructorPlantilla({ plantilla }: { plantilla: PlantillaConstructor }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [tipoEstudio, setTipoEstudio] = useState(plantilla.tipoEstudio);
  const [secciones, setSecciones] = useState<SeccionPlantilla[]>(() => {
    const base = plantilla.estructura.secciones;
    const tieneEnc = base.some((s) => s.tipo === 'encabezado');
    return tieneEnc ? base : [seccionEncabezadoPorDefecto(), ...base];
  });
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const encIndex = secciones.findIndex((s) => s.tipo === 'encabezado');
  const encabezado = secciones[encIndex];
  const hallazgos = secciones.filter((s) => s.tipo === 'hallazgos');
  const totalCampos = useMemo(() => contarCampos({ secciones }), [secciones]);

  function actualizarSeccion(id: string, patch: Partial<SeccionPlantilla>) {
    setSecciones((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function mutarCampos(seccionId: string, fn: (c: CampoPlantilla[]) => CampoPlantilla[]) {
    setSecciones((prev) => prev.map((s) => (s.id === seccionId ? { ...s, campos: fn(s.campos) } : s)));
  }
  function agregarSeccion() {
    setSecciones((prev) => [...prev, seccionHallazgosNueva(`Sección ${prev.filter((s) => s.tipo === 'hallazgos').length + 1}`)]);
  }
  function eliminarSeccion(id: string) {
    setSecciones((prev) => prev.filter((s) => s.id !== id));
  }
  function moverSeccion(id: string, dir: -1 | 1) {
    setSecciones((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      // No se mueve fuera de rango ni por encima del encabezado (índice 0).
      if (i < 0 || j < 1 || j >= prev.length) return prev;
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
      {/* ══ header contextual ══ */}
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

      {/* ══ documento (mismo ancho de lectura que el reporte) ══ */}
      <div className="mx-auto flex max-w-[900px] flex-col gap-5 px-5 py-6">
        <p className={`${kicker} text-muted-foreground`}>Vista de construcción · así se verá en “Mis reportes”</p>

        {/* card de encabezado */}
        {encabezado && (
          <CardEncabezado
            seccion={encabezado}
            onSeccion={(patch) => actualizarSeccion(encabezado.id, patch)}
            onCampos={(fn) => mutarCampos(encabezado.id, fn)}
          />
        )}

        {/* cards de hallazgos */}
        {hallazgos.map((s) => (
          <CardHallazgos
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

        {/* impresión: card fija del reporte */}
        <section className="rounded-xl border border-dashed border-border bg-muted/40 p-5">
          <p className={`${kicker} text-secondary`}>Impresión diagnóstica</p>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Card fija: siempre aparece al final del reporte para la conclusión del médico. No se configura aquí.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ═══════════════ card de encabezado (datos del paciente) ═══════════════ */
function CardEncabezado({
  seccion,
  onSeccion,
  onCampos,
}: {
  seccion: SeccionPlantilla;
  onSeccion: (patch: Partial<SeccionPlantilla>) => void;
  onCampos: (fn: (c: CampoPlantilla[]) => CampoPlantilla[]) => void;
}) {
  const presentes = new Set(seccion.campos.map((c) => c.id));
  const disponibles = CAMPOS_PACIENTE_CATALOGO.filter((p) => !presentes.has(p.id));

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          value={seccion.titulo}
          onChange={(e) => onSeccion({ titulo: e.target.value })}
          aria-label="Título del encabezado"
          className="min-w-0 flex-1 rounded-[7px] bg-transparent text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground outline-none focus:bg-muted focus:px-1"
        />
        <SelectorColumnas columnas={seccion.columnas} onCambio={(n) => onSeccion({ columnas: n })} />
      </div>

      <div className={`mt-4 grid gap-3.5 ${GRID_COLS[seccion.columnas] ?? GRID_COLS[3]}`}>
        {seccion.campos.map((c, i) => (
          <div key={c.id} className={`${claseSpan(c, seccion.columnas)} group relative`}>
            <CampoReporte campo={c} valor="" modo="previa" />
            <div className="mt-1 flex items-center gap-1">
              <span className={`${mono} text-[10px] text-muted-foreground`}>{c.nombre}</span>
              <button
                type="button"
                onClick={() => onCampos((cs) => cs.filter((x) => x.id !== c.id))}
                aria-label={`Quitar ${c.nombre}`}
                className={`ml-auto grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)] ${focusRing}`}
              >
                <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => onCampos((cs) => (i === 0 ? cs : swap(cs, i, i - 1)))}
                disabled={i === 0}
                aria-label="Mover antes"
                className={`grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 ${focusRing}`}
              >
                <ChevronUp aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => onCampos((cs) => (i === cs.length - 1 ? cs : swap(cs, i, i + 1)))}
                disabled={i === seccion.campos.length - 1}
                aria-label="Mover después"
                className={`grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 ${focusRing}`}
              >
                <ChevronDown aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {disponibles.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-[11.5px] font-semibold text-muted-foreground">Agregar dato del paciente:</span>
          {disponibles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                onCampos((cs) => [...cs, { id: p.id, tipo: 'texto', nombre: p.nombre, ...(p.span ? { span: p.span } : {}) }])
              }
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
            >
              <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
              {p.nombre}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* ═══════════════ card de hallazgos ═══════════════ */
function CardHallazgos({
  seccion,
  onSeccion,
  onCampos,
  onEliminar,
  onMover,
}: {
  seccion: SeccionPlantilla;
  onSeccion: (patch: Partial<SeccionPlantilla>) => void;
  onCampos: (fn: (c: CampoPlantilla[]) => CampoPlantilla[]) => void;
  onEliminar: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          value={seccion.titulo}
          onChange={(e) => onSeccion({ titulo: e.target.value })}
          aria-label="Título de la sección"
          placeholder="Título de la sección"
          className="min-w-0 flex-1 rounded-[7px] bg-transparent text-[14.5px] font-bold leading-snug text-foreground outline-none focus:bg-muted focus:px-1"
        />
        <SelectorColumnas columnas={seccion.columnas} onCambio={(n) => onSeccion({ columnas: n })} />
        <button
          type="button"
          onClick={() => onMover(-1)}
          aria-label="Subir sección"
          className={`grid h-8 w-8 place-items-center rounded-[8px] border border-border text-muted-foreground hover:bg-muted ${focusRing}`}
        >
          <ChevronUp aria-hidden className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => onMover(1)}
          aria-label="Bajar sección"
          className={`grid h-8 w-8 place-items-center rounded-[8px] border border-border text-muted-foreground hover:bg-muted ${focusRing}`}
        >
          <ChevronDown aria-hidden className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onEliminar}
          aria-label="Eliminar sección"
          className={`grid h-8 w-8 place-items-center rounded-[8px] border border-border text-muted-foreground transition-colors hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)] ${focusRing}`}
        >
          <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {seccion.campos.length > 0 && (
        <div className={`mt-3.5 grid gap-3.5 ${GRID_COLS[seccion.columnas] ?? GRID_COLS[1]}`}>
          {seccion.campos.map((c, i) => (
            <div
              key={c.id}
              className={`${claseSpan(c, seccion.columnas)} rounded-[11px] border border-dashed border-border p-2.5`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[10px] font-bold text-muted-foreground">
                  {ETIQUETA_TIPO[c.tipo]}
                </span>
                <span className={`${mono} text-[10px] text-muted-foreground`}>{formatoCampo(c)}</span>
                <div className="ml-auto flex items-center gap-0.5">
                  <SelectorSpan
                    span={c.span}
                    columnas={seccion.columnas}
                    onCambio={(n) => onCampos((cs) => cs.map((x) => (x.id === c.id ? { ...x, span: n } : x)))}
                  />
                  <IconBtn label="Editar" activo={editando === c.id} onClick={() => setEditando(editando === c.id ? null : c.id)}>
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </IconBtn>
                  <IconBtn label="Subir" disabled={i === 0} onClick={() => onCampos((cs) => swap(cs, i, i - 1))}>
                    <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                  </IconBtn>
                  <IconBtn label="Bajar" disabled={i === seccion.campos.length - 1} onClick={() => onCampos((cs) => swap(cs, i, i + 1))}>
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                  </IconBtn>
                  <IconBtn label="Eliminar" peligro onClick={() => onCampos((cs) => cs.filter((x) => x.id !== c.id))}>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </IconBtn>
                </div>
              </div>

              {/* PREVIEW idéntico al reporte */}
              <CampoReporte campo={c} valor="" modo="previa" />

              {/* panel de propiedades */}
              {editando === c.id && (
                <PropiedadesCampo campo={c} onCambio={(patch) => onCampos((cs) => cs.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* agregar campo */}
      <div className="mt-3.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-muted/40 p-3.5">
        <p className={`${kicker} text-muted-foreground`}>Agregar campo</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {TIPOS_AGREGABLES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onCampos((cs) => [...cs, campoNuevo(t)])}
              className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
            >
              <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
              {t === 'imagen' ? 'Imagen' : ETIQUETA_TIPO[t]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ panel de propiedades de un campo ═══════════════ */
function PropiedadesCampo({
  campo,
  onCambio,
}: {
  campo: CampoPlantilla;
  onCambio: (patch: Partial<CampoPlantilla>) => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2.5 rounded-[9px] border border-border bg-muted/60 p-3">
      {campo.tipo === 'titulo' || campo.tipo === 'guia' ? (
        <label className="block">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {campo.tipo === 'titulo' ? 'Texto del subtítulo' : 'Texto de la guía'}
          </span>
          <textarea
            value={campo.nombre}
            onChange={(e) => onCambio({ nombre: e.target.value })}
            rows={campo.tipo === 'guia' ? 2 : 1}
            className={`${inputCls} mt-1 h-auto resize-y py-2`}
          />
        </label>
      ) : (
        <label className="block">
          <span className="text-[11px] font-semibold text-muted-foreground">Nombre del campo</span>
          <input value={campo.nombre} onChange={(e) => onCambio({ nombre: e.target.value })} className={`${inputCls} mt-1 font-semibold`} />
        </label>
      )}

      {campo.tipo === 'medida' && (
        <label className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Unidad</span>
          <input value={campo.unidad ?? ''} onChange={(e) => onCambio({ unidad: e.target.value })} placeholder="mm · cm · cc" className={`${inputCls} max-w-[140px]`} />
        </label>
      )}

      {campo.tipo === 'opcion' && (
        <label className="block">
          <span className="text-[11px] font-semibold text-muted-foreground">Opciones (separadas por coma)</span>
          <input
            value={(campo.opciones ?? []).join(', ')}
            onChange={(e) => onCambio({ opciones: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
            placeholder="normal, aumentada, disminuida"
            className={`${inputCls} mt-1`}
          />
        </label>
      )}

      {campo.tipo === 'tabla' && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground">Columnas (coma)</span>
            <input
              value={(campo.columnas ?? []).join(', ')}
              onChange={(e) => onCambio({ columnas: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
              placeholder="Longitudinal, AP, Transverso"
              className={`${inputCls} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground">Filas (coma)</span>
            <input
              value={(campo.filas ?? []).join(', ')}
              onChange={(e) => onCambio({ filas: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
              placeholder="Derecho, Izquierdo"
              className={`${inputCls} mt-1`}
            />
          </label>
        </div>
      )}

      {campo.tipo === 'imagen' && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Origen</span>
            <select
              value={campo.origen ?? 'dicom'}
              onChange={(e) => onCambio({ origen: e.target.value as 'referencia' | 'dicom' })}
              className={`${inputCls} max-w-[240px]`}
            >
              <option value="dicom">Estudio del médico (DICOM)</option>
              <option value="referencia">Referencia fija de la plantilla</option>
            </select>
          </label>
          {campo.origen === 'referencia' && (
            <input
              value={campo.refUrl ?? ''}
              onChange={(e) => onCambio({ refUrl: e.target.value })}
              placeholder="URL de la imagen de referencia (diagrama anatómico)"
              className={inputCls}
            />
          )}
        </div>
      )}

      {campo.tipo !== 'titulo' && campo.tipo !== 'guia' && campo.tipo !== 'imagen' && (
        <label className="block">
          <span className="text-[11px] font-semibold text-muted-foreground">Texto guía (orienta al médico, no sale en el informe)</span>
          <input value={campo.guia ?? ''} onChange={(e) => onCambio({ guia: e.target.value })} className={`${inputCls} mt-1`} />
        </label>
      )}
    </div>
  );
}

/* ═══════════════ auxiliares ═══════════════ */
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

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  peligro,
  activo,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  peligro?: boolean;
  activo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid h-6 w-6 place-items-center rounded text-muted-foreground transition-colors disabled:opacity-30 ${focusRing} ${
        activo ? 'bg-accent text-accent-foreground' : peligro ? 'hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)]' : 'hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
