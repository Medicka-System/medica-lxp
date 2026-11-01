'use client';

/**
 * Constructor de preguntas de ENCUESTA (§5C) — controlado y REUTILIZABLE: lo usan el
 * editor de lección tipo `encuesta` y el bloque `encuesta` de teoría. Expone su estado
 * por `onCambio`; el contenedor decide cuándo persistir (autosave debounced). SIN nota:
 * una encuesta solo pregunta (opción única, selección múltiple, escala, texto abierto).
 */

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { softText, focusRing } from '@/lib/studio/estilos';
import { Select } from '@/components/ui/select';
import {
  CLAVES_OPCION,
  PREGUNTA_TIPOS,
  ROTULO_PREGUNTA,
  preguntaEnBlanco,
  type EncuestaConfig,
  type PreguntaEncuesta,
  type TipoPregunta,
} from '@/lib/studio/encuesta-contrato';

const campo =
  'w-full rounded-[9px] border border-border bg-muted px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-secondary';

export function ConstructorEncuesta({
  config,
  onCambio,
}: {
  config: EncuestaConfig;
  onCambio: (next: EncuestaConfig) => void;
}) {
  const preguntas = config.preguntas;

  function setPreguntas(next: PreguntaEncuesta[]) {
    onCambio({ ...config, preguntas: next });
  }
  function mutar(id: string, cambio: (p: PreguntaEncuesta) => PreguntaEncuesta) {
    setPreguntas(preguntas.map((p) => (p.id === id ? cambio(p) : p)));
  }
  function agregar() {
    setPreguntas([...preguntas, preguntaEnBlanco()]);
  }
  function eliminar(id: string) {
    setPreguntas(preguntas.filter((p) => p.id !== id));
  }
  function mover(id: string, dir: -1 | 1) {
    const i = preguntas.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= preguntas.length) return;
    const copia = [...preguntas];
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
    setPreguntas(copia);
  }

  return (
    <div className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5">
        <span className={`text-[12px] font-semibold ${softText}`}>Instrucción para el alumno (opcional)</span>
        <input
          type="text"
          value={config.descripcion ?? ''}
          onChange={(e) => onCambio({ ...config, descripcion: e.target.value })}
          placeholder="Ej.: Cuéntanos cómo vas con el módulo. Tus respuestas no se califican."
          className={campo}
        />
      </label>

      {preguntas.length === 0 ? (
        <div className="rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card p-7 text-center">
          <p className="text-[13.5px] font-bold">Sin preguntas aún</p>
          <p className={`mx-auto mt-1 max-w-[42ch] text-[12.5px] leading-relaxed ${softText}`}>
            Agrega preguntas para recoger la opinión o el avance del alumno. La encuesta no se califica.
          </p>
          <button
            type="button"
            onClick={agregar}
            className={`mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            Agregar pregunta
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {preguntas.map((p, i) => (
            <TarjetaPregunta
              key={p.id}
              pregunta={p}
              indice={i}
              total={preguntas.length}
              onCambiar={(cambio) => mutar(p.id, cambio)}
              onEliminar={() => eliminar(p.id)}
              onMover={(dir) => mover(p.id, dir)}
            />
          ))}
          <button
            type="button"
            onClick={agregar}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card text-[13px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            Agregar pregunta
          </button>
        </div>
      )}
    </div>
  );
}

function TarjetaPregunta({
  pregunta,
  indice,
  total,
  onCambiar,
  onEliminar,
  onMover,
}: {
  pregunta: PreguntaEncuesta;
  indice: number;
  total: number;
  onCambiar: (cambio: (p: PreguntaEncuesta) => PreguntaEncuesta) => void;
  onEliminar: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  const p = pregunta;
  const conOpciones = p.tipo === 'opcion_unica' || p.tipo === 'multiple';

  function cambiarTipo(tipo: TipoPregunta) {
    onCambiar((prev) => {
      if (tipo === prev.tipo) return prev;
      const base = { ...prev, tipo };
      if ((tipo === 'opcion_unica' || tipo === 'multiple') && prev.opciones.length < 2) {
        base.opciones = [
          { clave: 'a', texto: '' },
          { clave: 'b', texto: '' },
        ];
      }
      if (tipo === 'escala' && !base.escalaMax) base.escalaMax = 5;
      return base;
    });
  }
  function cambiarOpcion(clave: string, texto: string) {
    onCambiar((prev) => ({ ...prev, opciones: prev.opciones.map((o) => (o.clave === clave ? { ...o, texto } : o)) }));
  }
  function agregarOpcion() {
    onCambiar((prev) => {
      const clave = CLAVES_OPCION[prev.opciones.length] ?? String(prev.opciones.length + 1);
      return { ...prev, opciones: [...prev.opciones, { clave, texto: '' }] };
    });
  }
  function quitarOpcion(clave: string) {
    onCambiar((prev) => ({ ...prev, opciones: prev.opciones.filter((o) => o.clave !== clave) }));
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-bold text-accent-foreground">
          {indice + 1}
        </span>
        <Select
          value={p.tipo}
          onChange={(v) => cambiarTipo(v as TipoPregunta)}
          aria-label={`Tipo de la pregunta ${indice + 1}`}
          className={`flex h-8 w-auto items-center gap-2 rounded-[8px] border border-border bg-muted px-2 text-[12px] font-semibold text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
          options={PREGUNTA_TIPOS.map((t) => ({ value: t, label: ROTULO_PREGUNTA[t] }))}
        />
        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" aria-label="Subir" disabled={indice === 0} onClick={() => onMover(-1)} className={`grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30 ${focusRing}`}>
            <ChevronUp aria-hidden className="h-4 w-4" strokeWidth={2} />
          </button>
          <button type="button" aria-label="Bajar" disabled={indice === total - 1} onClick={() => onMover(1)} className={`grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30 ${focusRing}`}>
            <ChevronDown aria-hidden className="h-4 w-4" strokeWidth={2} />
          </button>
          <button type="button" aria-label={`Eliminar pregunta ${indice + 1}`} onClick={onEliminar} className={`grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-destructive ${focusRing}`}>
            <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <textarea
        value={p.enunciado}
        onChange={(e) => onCambiar((prev) => ({ ...prev, enunciado: e.target.value }))}
        rows={2}
        placeholder="Escribe la pregunta…"
        aria-label={`Enunciado de la pregunta ${indice + 1}`}
        className={`mt-3 resize-y ${campo}`}
      />

      {conOpciones && (
        <div className="mt-3">
          <p className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wide ${softText}`}>Opciones</p>
          <div className="flex flex-col gap-1.5">
            {p.opciones.map((o) => (
              <div key={o.clave} className="flex items-center gap-2">
                <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-border bg-card text-[11px] font-bold uppercase text-muted-foreground">
                  {o.clave}
                </span>
                <input
                  value={o.texto}
                  onChange={(e) => cambiarOpcion(o.clave, e.target.value)}
                  placeholder={`Opción ${o.clave.toUpperCase()}`}
                  aria-label={`Texto de la opción ${o.clave.toUpperCase()}`}
                  className={`h-8 w-full rounded-[8px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
                />
                {p.opciones.length > 2 && (
                  <button type="button" aria-label={`Quitar opción ${o.clave.toUpperCase()}`} onClick={() => quitarOpcion(o.clave)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive ${focusRing}`}>
                    <X aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={agregarOpcion} className={`mt-2 inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-semibold text-secondary hover:bg-accent ${focusRing}`}>
            <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
            Agregar opción
          </button>
        </div>
      )}

      {p.tipo === 'escala' && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className={`text-[11px] ${softText}`}>Máximo de la escala (2–10)</span>
            <input
              type="number"
              min={2}
              max={10}
              value={p.escalaMax ?? 5}
              onChange={(e) => {
                const v = Number(e.target.value);
                onCambiar((prev) => ({ ...prev, escalaMax: Number.isFinite(v) ? Math.min(10, Math.max(2, Math.trunc(v))) : 5 }));
              }}
              className={`h-9 w-24 rounded-[8px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={`text-[11px] ${softText}`}>Etiqueta del 1 (opcional)</span>
            <input value={p.escalaMinEtiqueta ?? ''} onChange={(e) => onCambiar((prev) => ({ ...prev, escalaMinEtiqueta: e.target.value || undefined }))} placeholder="Nada" className={`h-9 ${campo}`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={`text-[11px] ${softText}`}>Etiqueta del máximo (opcional)</span>
            <input value={p.escalaMaxEtiqueta ?? ''} onChange={(e) => onCambiar((prev) => ({ ...prev, escalaMaxEtiqueta: e.target.value || undefined }))} placeholder="Mucho" className={`h-9 ${campo}`} />
          </label>
        </div>
      )}

      {p.tipo === 'texto' && (
        <p className={`mt-3 flex items-start gap-1.5 rounded-[9px] bg-muted px-3 py-2 text-[11.5px] leading-relaxed ${softText}`}>
          <GripVertical aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          El alumno escribe una respuesta libre. No se califica — solo se recoge.
        </p>
      )}

      <label className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
        <input type="checkbox" checked={p.obligatoria === true} onChange={(e) => onCambiar((prev) => ({ ...prev, obligatoria: e.target.checked }))} className="h-4 w-4 accent-[color:var(--primary)]" />
        Obligatoria (el alumno debe responderla para enviar)
      </label>
    </article>
  );
}
