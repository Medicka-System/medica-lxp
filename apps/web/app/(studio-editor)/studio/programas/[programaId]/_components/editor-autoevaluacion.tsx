'use client';

/**
 * Editor de lección tipo `autoevaluacion` (§5C). Constructor de reactivos
 * (opción múltiple, selección múltiple, verdadero/falso, abierta; imagen opcional
 * por pregunta) + Eco PROPONE examen (`/ai/proponer-examen`) + IMPORTAR reactivos de
 * CSV/Excel (`/reactivos/importar`). Todo el examen vive en `lecciones.config`
 * (fuente de verdad · CRUD directo web→Supabase bajo RLS · §2) vía `guardarAutoeval`.
 *
 * Se engancha en `EDITORES_LECCION` con la firma `EditorLeccionProps`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  ImageIcon,
  Info,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { kicker, softText, focusRing } from '@/lib/studio/estilos';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import {
  CLAVES_OPCION,
  comoAutoevalConfig,
  nuevoId,
  REACTIVO_TIPOS,
  ROTULO_REACTIVO,
  type AutoevalConfig,
  type ReactivoConfig,
  type ReactivoTipo,
} from '@/lib/studio/autoeval-contrato';
import {
  guardarAutoeval,
  importarReactivosAutoeval,
  proponerExamenAutoeval,
} from '@/lib/studio/autoeval-acciones';

/** Dominios I-AIM para el selector opcional (== enum `lxp.dominio_iaim`). */
const DOMINIOS: { valor: string; rotulo: string }[] = [
  { valor: '', rotulo: 'Sin dominio' },
  { valor: 'indicacion', rotulo: 'Indicación' },
  { valor: 'adquisicion', rotulo: 'Adquisición' },
  { valor: 'interpretacion', rotulo: 'Interpretación' },
  { valor: 'decision_medica', rotulo: 'Decisión médica' },
];

function reactivoEnBlanco(): ReactivoConfig {
  return {
    id: nuevoId(),
    tipo: 'opcion_multiple',
    enunciado: '',
    opciones: [
      { clave: 'a', texto: '' },
      { clave: 'b', texto: '' },
    ],
    correcta: null,
    puntaje: 1,
    origen: 'manual',
  };
}

export function EditorAutoevaluacion({ programaId, leccionId, config, correr }: EditorLeccionProps) {
  const [estado, setEstado] = useState<AutoevalConfig>(() => comoAutoevalConfig(config));
  const [eco, setEco] = useState(false);
  const [importar, setImportar] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Espejo del estado (siempre al día) para mutar sin efectos dentro del updater.
  const estadoRef = useRef(estado);

  // Reseeding SOLO al cambiar de lección (el estado local manda mientras se edita).
  const leccionRef = useRef(leccionId);
  useEffect(() => {
    if (leccionRef.current !== leccionId) {
      leccionRef.current = leccionId;
      const fresco = comoAutoevalConfig(config);
      estadoRef.current = fresco;
      setEstado(fresco);
    }
  }, [leccionId, config]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const persistir = useCallback(
    (siguiente: AutoevalConfig) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        correr(() => guardarAutoeval(programaId, leccionId, siguiente));
      }, 800);
    },
    [correr, programaId, leccionId],
  );

  /** Actualiza el estado y agenda el guardado con rebote. */
  function aplicar(mut: (prev: AutoevalConfig) => AutoevalConfig) {
    const siguiente = mut(estadoRef.current);
    estadoRef.current = siguiente;
    setEstado(siguiente);
    persistir(siguiente);
  }

  const reactivos = estado.reactivos;

  function mutarReactivo(id: string, cambio: (r: ReactivoConfig) => ReactivoConfig) {
    aplicar((prev) => ({
      ...prev,
      reactivos: prev.reactivos.map((r) => (r.id === id ? cambio(r) : r)),
    }));
  }

  function agregarReactivo() {
    aplicar((prev) => ({ ...prev, reactivos: [...prev.reactivos, reactivoEnBlanco()] }));
  }

  function eliminarReactivo(id: string) {
    aplicar((prev) => ({ ...prev, reactivos: prev.reactivos.filter((r) => r.id !== id) }));
  }

  function moverReactivo(id: string, dir: -1 | 1) {
    aplicar((prev) => {
      const i = prev.reactivos.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.reactivos.length) return prev;
      const copia = [...prev.reactivos];
      [copia[i], copia[j]] = [copia[j]!, copia[i]!];
      return { ...prev, reactivos: copia };
    });
  }

  function agregarLote(nuevos: ReactivoConfig[]) {
    if (nuevos.length === 0) return;
    aplicar((prev) => ({ ...prev, reactivos: [...prev.reactivos, ...nuevos] }));
  }

  const puntajeTotal = reactivos.reduce((s, r) => s + (r.puntaje || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      {/* ── Encabezado + acciones ── */}
      <div className="flex flex-wrap items-start gap-3.5">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
        >
          <CheckCircle2 className="h-[21px] w-[21px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${kicker} text-muted-foreground`}>Lección tipo Autoevaluación</p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.01em]">Banco de reactivos</h2>
          <p className={`mt-1 max-w-[56ch] text-[13px] leading-relaxed ${softText}`}>
            Construye las preguntas, deja que Eco proponga un borrador o importa un archivo. La clave
            correcta la usa el autocalificador de Eco (§7A); nunca se expone al alumno.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEco(true)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 text-[12.5px] font-semibold text-[color:var(--info-foreground)] transition-colors hover:bg-white ${focusRing}`}
          >
            <Sparkles aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Eco propone
          </button>
          <button
            type="button"
            onClick={() => setImportar(true)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <FileUp aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Importar
          </button>
        </div>
      </div>

      {/* ── Ajustes del examen ── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Settings2 aria-hidden className="h-4 w-4 text-secondary" strokeWidth={1.75} />
          <h3 className="text-[13.5px] font-bold">Ajustes del examen</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className={`text-[12px] font-semibold ${softText}`}>Instrucciones para el alumno</span>
            <textarea
              value={estado.descripcion ?? ''}
              onChange={(e) => aplicar((prev) => ({ ...prev, descripcion: e.target.value }))}
              rows={2}
              placeholder="Ej.: Responde con base en lo revisado en la lección. Puedes reintentar."
              className={`resize-y rounded-[9px] border border-border bg-muted px-3 py-2 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className={`text-[12px] font-semibold ${softText}`}>
              Promesa (2º párrafo del inicio · qué verá al terminar)
            </span>
            <textarea
              value={estado.promesa ?? ''}
              onChange={(e) => aplicar((prev) => ({ ...prev, promesa: e.target.value }))}
              rows={2}
              placeholder="Ej.: Al terminar verá qué acertó, qué falló y por qué, con la retroalimentación de cada pregunta."
              className={`resize-y rounded-[9px] border border-border bg-muted px-3 py-2 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`text-[12px] font-semibold ${softText}`}>Intentos permitidos (0 = ilimitados)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={estado.intentos ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                aplicar((prev) => ({ ...prev, intentos: Number.isFinite(v) && v >= 0 ? v : 0 }));
              }}
              className={`h-9 w-28 rounded-[9px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`text-[12px] font-semibold ${softText}`}>Límite de tiempo (minutos · 0 = sin límite)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={estado.minutos ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                aplicar((prev) => ({ ...prev, minutos: Number.isFinite(v) && v >= 0 ? v : 0 }));
              }}
              className={`h-9 w-28 rounded-[9px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`text-[12px] font-semibold ${softText}`}>Umbral para aprobar (% · 0 = sin umbral)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={estado.umbral ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                aplicar((prev) => ({ ...prev, umbral: Number.isFinite(v) && v >= 0 ? Math.min(100, v) : 0 }));
              }}
              className={`h-9 w-28 rounded-[9px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`text-[12px] font-semibold ${softText}`}>Abre el</span>
            <input
              type="date"
              value={estado.fechaApertura ?? ''}
              onChange={(e) => aplicar((prev) => ({ ...prev, fechaApertura: e.target.value }))}
              className={`h-9 rounded-[9px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`text-[12px] font-semibold ${softText}`}>Cierra el</span>
            <input
              type="date"
              value={estado.fechaCierre ?? ''}
              onChange={(e) => aplicar((prev) => ({ ...prev, fechaCierre: e.target.value }))}
              className={`h-9 rounded-[9px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <div className="flex flex-col justify-center gap-2 md:col-span-2">
            <Toggle
              activo={estado.barajar === true}
              onCambiar={(v) => aplicar((prev) => ({ ...prev, barajar: v }))}
              etiqueta="Barajar el orden de las opciones en cada intento"
            />
            <Toggle
              activo={estado.mostrarRetro !== false}
              onCambiar={(v) => aplicar((prev) => ({ ...prev, mostrarRetro: v }))}
              etiqueta="Mostrar retroalimentación al responder"
            />
            <Toggle
              activo={estado.cuentaParaCalificacion === true}
              onCambiar={(v) => aplicar((prev) => ({ ...prev, cuentaParaCalificacion: v }))}
              etiqueta="Cuenta para la calificación del diplomado"
            />
          </div>
        </div>
      </section>

      {/* ── Lista de reactivos ── */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <h3 className="text-[13.5px] font-bold">
            Reactivos <span className="text-muted-foreground">({reactivos.length})</span>
          </h3>
          {reactivos.length > 0 && (
            <span className={`text-[11.5px] ${softText}`}>· {puntajeTotal} punto(s) en total</span>
          )}
        </div>

        {reactivos.length === 0 ? (
          <div className="rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card p-8 text-center">
            <p className="text-[13.5px] font-bold">Sin reactivos aún</p>
            <p className={`mx-auto mt-1 max-w-[42ch] text-[12.5px] leading-relaxed ${softText}`}>
              Agrega tu primera pregunta, pide un borrador a Eco o importa un CSV/Excel.
            </p>
            <button
              type="button"
              onClick={agregarReactivo}
              className={`mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              Agregar reactivo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {reactivos.map((r, i) => (
              <TarjetaReactivo
                key={r.id}
                reactivo={r}
                indice={i}
                total={reactivos.length}
                onCambiar={(cambio) => mutarReactivo(r.id, cambio)}
                onEliminar={() => eliminarReactivo(r.id)}
                onMover={(dir) => moverReactivo(r.id, dir)}
              />
            ))}
            <button
              type="button"
              onClick={agregarReactivo}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card text-[13px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
            >
              <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              Agregar reactivo
            </button>
          </div>
        )}
      </section>

      {eco && (
        <ModalEco
          onCerrar={() => setEco(false)}
          onAgregar={(nuevos) => {
            agregarLote(nuevos);
            setEco(false);
          }}
        />
      )}
      {importar && (
        <ModalImportar
          programaId={programaId}
          leccionId={leccionId}
          onCerrar={() => setImportar(false)}
          onAgregar={(nuevos) => {
            agregarLote(nuevos);
            setImportar(false);
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Tarjeta de un reactivo ─────────────────────────── */

function TarjetaReactivo({
  reactivo,
  indice,
  total,
  onCambiar,
  onEliminar,
  onMover,
}: {
  reactivo: ReactivoConfig;
  indice: number;
  total: number;
  onCambiar: (cambio: (r: ReactivoConfig) => ReactivoConfig) => void;
  onEliminar: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  const r = reactivo;
  const conOpciones = r.tipo !== 'abierta';

  function cambiarTipo(tipo: ReactivoTipo) {
    onCambiar((prev) => adaptarATipo(prev, tipo));
  }

  function marcarCorrecta(clave: string) {
    onCambiar((prev) => {
      if (prev.tipo === 'multi') {
        const set = new Set(Array.isArray(prev.correcta) ? prev.correcta : prev.correcta ? [prev.correcta] : []);
        if (set.has(clave)) set.delete(clave);
        else set.add(clave);
        return { ...prev, correcta: [...set] };
      }
      return { ...prev, correcta: clave };
    });
  }

  function esCorrecta(clave: string): boolean {
    if (Array.isArray(r.correcta)) return r.correcta.includes(clave);
    return r.correcta === clave;
  }

  function cambiarOpcion(clave: string, texto: string) {
    onCambiar((prev) => ({
      ...prev,
      opciones: prev.opciones.map((o) => (o.clave === clave ? { ...o, texto } : o)),
    }));
  }

  function agregarOpcion() {
    onCambiar((prev) => {
      const clave = CLAVES_OPCION[prev.opciones.length] ?? String(prev.opciones.length + 1);
      return { ...prev, opciones: [...prev.opciones, { clave, texto: '' }] };
    });
  }

  function quitarOpcion(clave: string) {
    onCambiar((prev) => {
      const opciones = prev.opciones.filter((o) => o.clave !== clave);
      const correcta = Array.isArray(prev.correcta)
        ? prev.correcta.filter((c) => c !== clave)
        : prev.correcta === clave
          ? null
          : prev.correcta;
      return { ...prev, opciones, correcta };
    });
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      {/* Cabecera de la tarjeta */}
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-bold text-accent-foreground"
        >
          {indice + 1}
        </span>
        <select
          value={r.tipo}
          onChange={(e) => cambiarTipo(e.target.value as ReactivoTipo)}
          aria-label={`Tipo del reactivo ${indice + 1}`}
          className={`h-8 rounded-[8px] border border-border bg-muted px-2 text-[12px] font-semibold text-foreground outline-none focus:border-secondary ${focusRing}`}
        >
          {REACTIVO_TIPOS.map((t) => (
            <option key={t} value={t}>
              {ROTULO_REACTIVO[t]}
            </option>
          ))}
        </select>
        {r.origen && r.origen !== 'manual' && (
          <span className="inline-flex h-6 items-center rounded-full bg-muted px-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {r.origen === 'eco' ? 'Eco' : 'Import'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Subir reactivo"
            disabled={indice === 0}
            onClick={() => onMover(-1)}
            className={`grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 ${focusRing}`}
          >
            <ChevronUp aria-hidden className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Bajar reactivo"
            disabled={indice === total - 1}
            onClick={() => onMover(1)}
            className={`grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 ${focusRing}`}
          >
            <ChevronDown aria-hidden className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={`Eliminar reactivo ${indice + 1}`}
            onClick={onEliminar}
            className={`grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
          >
            <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Enunciado */}
      <textarea
        value={r.enunciado}
        onChange={(e) => onCambiar((prev) => ({ ...prev, enunciado: e.target.value }))}
        rows={2}
        placeholder="Escribe la pregunta…"
        aria-label={`Enunciado del reactivo ${indice + 1}`}
        className={`mt-3 w-full resize-y rounded-[9px] border border-border bg-muted px-3 py-2 text-[13.5px] text-foreground outline-none focus:border-secondary ${focusRing}`}
      />

      {/* Ayuda opcional bajo el enunciado */}
      <input
        type="text"
        value={r.ayuda ?? ''}
        onChange={(e) => onCambiar((prev) => ({ ...prev, ayuda: e.target.value.trim() || undefined }))}
        placeholder="Ayuda opcional (ej.: Puede marcar más de una · Grado, lado, causa…)"
        aria-label={`Ayuda del reactivo ${indice + 1}`}
        className={`mt-2 h-8 w-full rounded-[8px] border border-border bg-muted px-2.5 text-[12px] text-foreground outline-none focus:border-secondary ${focusRing}`}
      />

      {/* Imagen opcional de la pregunta */}
      <div className="mt-2 flex items-center gap-2">
        <ImageIcon aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <input
          type="url"
          value={r.imagen ?? ''}
          onChange={(e) =>
            onCambiar((prev) => ({ ...prev, imagen: e.target.value.trim() || undefined }))
          }
          placeholder="URL de imagen de apoyo (opcional)"
          aria-label={`Imagen del reactivo ${indice + 1}`}
          className={`h-8 w-full rounded-[8px] border border-border bg-muted px-2.5 text-[12px] text-foreground outline-none focus:border-secondary ${focusRing}`}
        />
      </div>
      {r.imagen && (
        // Previa de una URL externa arbitraria (imagen de apoyo del reactivo): se usa
        // <img> a propósito, no next/image (dominios remotos no configurables aquí).
        <img
          src={r.imagen}
          alt=""
          className="mt-2 max-h-40 rounded-[9px] border border-border object-contain"
        />
      )}

      {/* Opciones (no aplica a abierta) */}
      {conOpciones ? (
        <div className="mt-3">
          <p className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wide ${softText}`}>
            {r.tipo === 'multi' ? 'Opciones — marca las correctas' : 'Opciones — marca la correcta'}
          </p>
          <div className="flex flex-col gap-1.5">
            {r.opciones.map((o) => {
              const correcta = esCorrecta(o.clave);
              return (
                <div key={o.clave} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => marcarCorrecta(o.clave)}
                    aria-pressed={correcta}
                    aria-label={`Marcar opción ${o.clave.toUpperCase()} como correcta`}
                    title="Marcar como correcta"
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border transition-colors ${
                      correcta
                        ? 'border-primary bg-primary text-[color:var(--primary-foreground)]'
                        : 'border-border bg-card text-muted-foreground hover:border-primary'
                    } ${r.tipo === 'multi' ? 'rounded-[8px]' : 'rounded-full'} ${focusRing}`}
                  >
                    {correcta ? (
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <span className="text-[11px] font-bold uppercase">{o.clave}</span>
                    )}
                  </button>
                  <input
                    value={o.texto}
                    onChange={(e) => cambiarOpcion(o.clave, e.target.value)}
                    placeholder={`Opción ${o.clave.toUpperCase()}`}
                    aria-label={`Texto de la opción ${o.clave.toUpperCase()}`}
                    className={`h-8 w-full rounded-[8px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
                  />
                  {r.tipo !== 'verdadero_falso' && r.opciones.length > 2 && (
                    <button
                      type="button"
                      aria-label={`Quitar opción ${o.clave.toUpperCase()}`}
                      onClick={() => quitarOpcion(o.clave)}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive ${focusRing}`}
                    >
                      <X aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {r.tipo !== 'verdadero_falso' && (
            <button
              type="button"
              onClick={agregarOpcion}
              className={`mt-2 inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-semibold text-secondary hover:bg-accent ${focusRing}`}
            >
              <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
              Agregar opción
            </button>
          )}
        </div>
      ) : (
        <p className={`mt-3 flex items-start gap-1.5 rounded-[9px] bg-muted px-3 py-2 text-[11.5px] leading-relaxed ${softText}`}>
          <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Respuesta abierta: no se autocalifica. La juzga Eco (Sonnet) contra la rúbrica/verdad y la
          confirma el docente (§7A).
        </p>
      )}

      {/* Meta: puntaje, dominio, retro */}
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            Puntaje
            <input
              type="number"
              min={0}
              step={0.5}
              value={r.puntaje}
              onChange={(e) => {
                const v = Number(e.target.value);
                onCambiar((prev) => ({ ...prev, puntaje: Number.isFinite(v) && v >= 0 ? v : 1 }));
              }}
              className={`h-8 w-16 rounded-[8px] border border-border bg-muted px-2 text-[12px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            Dominio
            <select
              value={r.dominio ?? ''}
              onChange={(e) =>
                onCambiar((prev) => ({ ...prev, dominio: e.target.value || undefined }))
              }
              className={`h-8 rounded-[8px] border border-border bg-muted px-2 text-[12px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            >
              {DOMINIOS.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          value={r.retro ?? ''}
          onChange={(e) => onCambiar((prev) => ({ ...prev, retro: e.target.value || undefined }))}
          placeholder="Retroalimentación (opcional)"
          aria-label={`Retroalimentación del reactivo ${indice + 1}`}
          className={`h-8 w-full rounded-[8px] border border-border bg-muted px-2.5 text-[12px] text-foreground outline-none focus:border-secondary ${focusRing}`}
        />
      </div>
    </article>
  );
}

/** Adapta un reactivo al cambiar de tipo (ajusta opciones y correcta con sentido). */
function adaptarATipo(r: ReactivoConfig, tipo: ReactivoTipo): ReactivoConfig {
  if (tipo === r.tipo) return r;
  if (tipo === 'abierta') return { ...r, tipo, opciones: [], correcta: null };
  if (tipo === 'verdadero_falso') {
    return {
      ...r,
      tipo,
      opciones: [
        { clave: 'v', texto: 'Verdadero' },
        { clave: 'f', texto: 'Falso' },
      ],
      correcta: typeof r.correcta === 'string' && (r.correcta === 'v' || r.correcta === 'f') ? r.correcta : 'v',
    };
  }
  // opcion_multiple | multi → asegura al menos 2 opciones
  const opciones =
    r.opciones.length >= 2
      ? r.opciones
      : [
          { clave: 'a', texto: '' },
          { clave: 'b', texto: '' },
        ];
  if (tipo === 'multi') {
    const correcta = Array.isArray(r.correcta) ? r.correcta : r.correcta ? [r.correcta] : [];
    return { ...r, tipo, opciones, correcta };
  }
  // opcion_multiple: una sola correcta
  const correcta = Array.isArray(r.correcta) ? (r.correcta[0] ?? null) : r.correcta;
  return { ...r, tipo, opciones, correcta };
}

/* ─────────────────────────── Toggle simple ─────────────────────────── */

function Toggle({
  activo,
  onCambiar,
  etiqueta,
}: {
  activo: boolean;
  onCambiar: (v: boolean) => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambiar(!activo)}
      className={`flex items-center gap-2.5 text-left text-[12.5px] ${focusRing} rounded-[8px]`}
    >
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          activo ? 'bg-primary' : 'bg-[color:var(--track)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            activo ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
      <span className={softText}>{etiqueta}</span>
    </button>
  );
}

/* ─────────────────────────── Modal: Eco propone ─────────────────────────── */

function ModalEco({
  onCerrar,
  onAgregar,
}: {
  onCerrar: () => void;
  onAgregar: (reactivos: ReactivoConfig[]) => void;
}) {
  const [tema, setTema] = useState('');
  const [cantidad, setCantidad] = useState(5);
  const [dominio, setDominio] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !cargando && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar, cargando]);

  async function proponer() {
    setError(null);
    setAviso(null);
    if (!tema.trim()) {
      setError('Escribe un tema para que Eco proponga el examen.');
      return;
    }
    setCargando(true);
    try {
      const r = await proponerExamenAutoeval({ tema, cantidad, dominio: dominio || undefined });
      if (r.error) {
        setError(r.error);
        return;
      }
      if (r.reactivos.length > 0) {
        onAgregar(r.reactivos);
      } else {
        setAviso(r.aviso ?? 'Eco no devolvió reactivos utilizables (¿MOCK?). Cablea un modelo real (§3).');
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <Cascaron etiqueta="Eco propone un examen" onCerrar={() => !cargando && onCerrar()}>
      <div className="flex items-start gap-3 border-b border-border px-6 pb-4 pt-6">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
        >
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${kicker} text-secondary`}>Asistente Eco · §7A</p>
          <h2 className="mt-1.5 text-[19px] font-extrabold leading-snug tracking-[-0.02em]">
            Propuesta de reactivos
          </h2>
          <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
            Eco redacta un borrador. Tú lo revisas y ajustas — nada se asienta sin ti.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 px-6 py-5">
        <label className="flex flex-col gap-1.5">
          <span className={`text-[12px] font-semibold ${softText}`}>Tema</span>
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ej.: Valoración FAST en trauma abdominal"
            className={`h-10 rounded-[9px] border border-border bg-muted px-3 text-[13.5px] text-foreground outline-none focus:border-secondary ${focusRing}`}
          />
        </label>
        <div className="grid grid-cols-2 gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className={`text-[12px] font-semibold ${softText}`}>Cantidad</span>
            <input
              type="number"
              min={1}
              max={30}
              value={cantidad}
              onChange={(e) => setCantidad(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
              className={`h-10 rounded-[9px] border border-border bg-muted px-3 text-[13.5px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`text-[12px] font-semibold ${softText}`}>Dominio I-AIM</span>
            <select
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
              className={`h-10 rounded-[9px] border border-border bg-muted px-3 text-[13.5px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            >
              {DOMINIOS.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">
            {error}
          </p>
        )}
        {aviso && (
          <p className="rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2 text-[12px] leading-relaxed text-[color:var(--warning-foreground)]">
            {aviso}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-border bg-muted px-6 py-4">
        <button
          type="button"
          onClick={onCerrar}
          disabled={cargando}
          className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50 ${focusRing}`}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={proponer}
          disabled={cargando}
          className={`inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          {cargando ? (
            <>
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
              Pensando…
            </>
          ) : (
            <>
              <Sparkles aria-hidden className="h-4 w-4" strokeWidth={2} />
              Proponer
            </>
          )}
        </button>
      </div>
    </Cascaron>
  );
}

/* ─────────────────────────── Modal: Importar ─────────────────────────── */

function ModalImportar({
  programaId,
  leccionId,
  onCerrar,
  onAgregar,
}: {
  programaId: string;
  leccionId: string;
  onCerrar: () => void;
  onAgregar: (reactivos: ReactivoConfig[]) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !cargando && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar, cargando]);

  async function subir() {
    setError(null);
    setErrores([]);
    if (!archivo) {
      setError('Adjunta un archivo CSV o Excel.');
      return;
    }
    setCargando(true);
    try {
      const form = new FormData();
      form.append('archivo', archivo, archivo.name);
      const r = await importarReactivosAutoeval(programaId, leccionId, form);
      if (r.error) {
        setError(r.error);
        setErrores(r.errores);
        return;
      }
      if (r.reactivos.length > 0) {
        onAgregar(r.reactivos);
      } else {
        setError('No se importó ningún reactivo. Revisa el formato del archivo.');
        setErrores(r.errores);
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <Cascaron etiqueta="Importar reactivos" onCerrar={() => !cargando && onCerrar()}>
      <div className="flex items-start gap-3 border-b border-border px-6 pb-4 pt-6">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-accent text-accent-foreground">
          <FileUp className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${kicker} text-secondary`}>Course builder · §5C</p>
          <h2 className="mt-1.5 text-[19px] font-extrabold leading-snug tracking-[-0.02em]">
            Importar reactivos de archivo
          </h2>
          <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
            CSV o Excel. El `api` lo parsea y valida; los reactivos se agregan al banco de esta lección.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 px-6 py-5">
        <div className="rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-3.5">
          <p className="text-[11.5px] font-bold text-[color:var(--info-foreground)]">Columnas esperadas</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
            <span className="font-mono">enunciado · tipo · opciones · correcta · puntaje · dominio · retro</span>.
            Opciones separadas por <span className="font-mono">|</span>; la correcta por clave o texto.
          </p>
        </div>

        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-dashed px-4 py-6 text-center transition-colors ${
            archivo ? 'border-primary bg-accent' : 'border-[color:var(--track)] bg-muted hover:border-primary'
          } ${focusRing}`}
        >
          <FileUp aria-hidden className="h-6 w-6 text-secondary" strokeWidth={1.75} />
          <span className="text-[13px] font-semibold text-foreground">
            {archivo ? archivo.name : 'Elegir archivo CSV o Excel'}
          </span>
          <span className={`text-[11.5px] ${softText}`}>.csv · .xlsx</span>
          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              setError(null);
              setErrores([]);
            }}
          />
        </label>

        {error && (
          <p className="rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">
            {error}
          </p>
        )}
        {errores.length > 0 && (
          <ul className="max-h-32 overflow-y-auto rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2 text-[11.5px] leading-relaxed text-[color:var(--warning-foreground)]">
            {errores.map((e, i) => (
              <li key={i}>· {e}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-border bg-muted px-6 py-4">
        <button
          type="button"
          onClick={onCerrar}
          disabled={cargando}
          className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50 ${focusRing}`}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={subir}
          disabled={cargando || !archivo}
          className={`inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          {cargando ? (
            <>
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
              Importando…
            </>
          ) : (
            <>
              <FileUp aria-hidden className="h-4 w-4" strokeWidth={2} />
              Importar
            </>
          )}
        </button>
      </div>
    </Cascaron>
  );
}

/* ─────────────────────────── Cáscara de modal ─────────────────────────── */

function Cascaron({
  etiqueta,
  onCerrar,
  children,
}: {
  etiqueta: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={etiqueta}
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-[540px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className={`absolute right-4 top-5 z-10 grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
