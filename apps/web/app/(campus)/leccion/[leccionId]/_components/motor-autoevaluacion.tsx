'use client';

/**
 * MotorAutoevaluacion — RENDER + MOTOR de respuesta del alumno (§5C/§7A). Lee el
 * examen del MODELO NUEVO (lecciones.config, proyectado sin la clave correcta) y deja
 * que el alumno responda los 4 tipos: opción múltiple, selección múltiple, V/F y
 * abierta. Al enviar, el DOMINIO (api /autoevaluacion/calificar) autocalifica lo
 * objetivo, registra la entrega + xAPI, y devuelve el veredicto por reactivo — que aquí
 * se REVELA (correcto/incorrecto + retroalimentación), igual que el "Punto de control"
 * del mock. Lo ABIERTO queda enviado a revisión del docente (§7A · el humano decide).
 *
 * Hereda el modo lectura (claro/sepia/oscuro) del contenedor: solo usa tokens (§5A).
 */

import { useMemo, useState, useTransition } from 'react';
import {
  Check,
  CheckCircle2,
  CheckSquare,
  Circle,
  ClipboardList,
  Loader2,
  RotateCcw,
  Send,
  Square,
  X,
} from 'lucide-react';
import type { ResultadoReactivo } from '@campus/shared';
import { card, focusRing, kicker, mono } from '@/components/tokens';
import {
  calificarAutoevaluacion,
  type ResultadoAutoevalAlumno,
} from '@/lib/campus/autoeval-acciones';
import type {
  AutoevalAlumno,
  ReactivoAlumno,
  TipoReactivoAlumno,
} from '@/lib/campus/leccion-contrato';

const ROTULO_TIPO: Record<TipoReactivoAlumno, string> = {
  opcion_multiple: 'Opción múltiple',
  multi: 'Selección múltiple',
  verdadero_falso: 'Verdadero / Falso',
  abierta: 'Respuesta abierta',
};

/** Respuesta local por reactivo: clave (single/vf), claves (multi) o texto (abierta). */
type Respuestas = Record<string, string | string[]>;

function incluyeClave(valor: string | string[] | null | undefined, clave: string): boolean {
  if (valor == null) return false;
  const c = clave.trim().toLowerCase();
  return Array.isArray(valor)
    ? valor.some((v) => String(v).trim().toLowerCase() === c)
    : String(valor).trim().toLowerCase() === c;
}

export function MotorAutoevaluacion({
  leccionId,
  autoeval,
  preview = false,
}: {
  leccionId: string;
  autoeval: AutoevalAlumno;
  preview?: boolean;
}) {
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [resultado, setResultado] = useState<ResultadoAutoevalAlumno | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  // Índice veredicto por reactivo (tras calificar), para revelar en cada tarjeta.
  const veredictos = useMemo(() => {
    const m = new Map<string, ResultadoReactivo>();
    for (const r of resultado?.resultados ?? []) m.set(r.reactivoId, r);
    return m;
  }, [resultado]);

  const calificado = resultado !== null;
  const respondidos = Object.keys(respuestas).filter((k) => {
    const v = respuestas[k];
    return Array.isArray(v) ? v.length > 0 : String(v ?? '').trim().length > 0;
  }).length;

  const elegirUnica = (id: string, clave: string) =>
    setRespuestas((r) => ({ ...r, [id]: clave }));

  const alternarMulti = (id: string, clave: string) =>
    setRespuestas((r) => {
      const prev = Array.isArray(r[id]) ? (r[id] as string[]) : [];
      const next = prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave];
      return { ...r, [id]: next };
    });

  const escribir = (id: string, texto: string) =>
    setRespuestas((r) => ({ ...r, [id]: texto }));

  const enviar = () => {
    if (preview) return;
    setError(null);
    iniciar(async () => {
      const res = await calificarAutoevaluacion(leccionId, respuestas);
      if (res.ok) {
        setResultado(res.resultado);
        // Sube al inicio del examen para ver el resultado.
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(res.error);
      }
    });
  };

  const reintentar = () => {
    setResultado(null);
    setRespuestas({});
    setError(null);
  };

  if (autoeval.reactivos.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-4">
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[13px] text-[color:var(--info-foreground)]">
          Esta autoevaluación todavía no tiene preguntas publicadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Intro / instrucciones ── */}
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
          <ClipboardList className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className={`${kicker} text-secondary`}>
            Autoevaluación · {autoeval.reactivos.length}{' '}
            {autoeval.reactivos.length === 1 ? 'pregunta' : 'preguntas'}
          </p>
          {autoeval.descripcion && (
            <p className="mt-1 text-[14px] leading-relaxed text-foreground-soft">
              {autoeval.descripcion}
            </p>
          )}
          {autoeval.yaRespondida && !calificado && (
            <p className="mt-1 text-[12.5px] font-semibold text-muted-foreground">
              Ya registraste un intento. Puedes practicar de nuevo cuando quieras.
            </p>
          )}
        </div>
      </div>

      {/* ── Resumen del resultado (tras calificar) ── */}
      {calificado && <ResumenResultado resultado={resultado} />}

      {/* ── Reactivos ── */}
      <ol className="space-y-5">
        {autoeval.reactivos.map((reactivo, i) => (
          <li key={reactivo.id}>
            <Reactivo
              reactivo={reactivo}
              numero={i + 1}
              respuesta={respuestas[reactivo.id]}
              veredicto={veredictos.get(reactivo.id) ?? null}
              calificado={calificado}
              onUnica={elegirUnica}
              onMulti={alternarMulti}
              onTexto={escribir}
            />
          </li>
        ))}
      </ol>

      {/* ── Acciones ── */}
      {error && (
        <p className="rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[color:var(--destructive-foreground)]">
          {error}
        </p>
      )}

      {preview ? (
        <p className="inline-flex items-center gap-2 rounded-control border border-dashed border-border px-4 py-2.5 text-[12.5px] font-semibold text-muted-foreground">
          Vista previa · las respuestas no se califican ni registran.
        </p>
      ) : calificado ? (
        <button
          type="button"
          onClick={reintentar}
          className={`inline-flex h-11 items-center gap-2 rounded-control border border-border bg-card px-5 text-[13.5px] font-bold text-foreground transition-colors hover:bg-accent ${focusRing}`}
        >
          <RotateCcw className="h-[17px] w-[17px]" strokeWidth={2} />
          Volver a intentar
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className={`inline-flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-secondary disabled:opacity-60 ${focusRing}`}
          >
            {enviando ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
            ) : (
              <Send className="h-[17px] w-[17px]" strokeWidth={2} />
            )}
            Calificar mis respuestas
          </button>
          <span className="text-[12.5px] font-semibold text-muted-foreground">
            {respondidos} de {autoeval.reactivos.length} respondidas
          </span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Resumen ───────────────────────── */

function ResumenResultado({ resultado }: { resultado: ResultadoAutoevalAlumno }) {
  const { objetivas, correctas, abiertas, puntajeObtenido, puntajeMax, aprobado, escalado } =
    resultado;
  const pct = escalado !== null ? Math.round(escalado * 100) : null;

  return (
    <section aria-live="polite" className={`${card} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className={`${kicker} text-secondary`}>Tu resultado</p>
          {objetivas > 0 ? (
            <p className="mt-1.5 text-[15px] font-semibold text-foreground">
              Acertaste{' '}
              <span className={`${mono} font-extrabold`}>
                {correctas}/{objetivas}
              </span>{' '}
              {objetivas === 1 ? 'pregunta objetiva' : 'preguntas objetivas'}
              {pct !== null && (
                <span className="text-foreground-soft"> · {pct}%</span>
              )}
            </p>
          ) : (
            <p className="mt-1.5 text-[15px] font-semibold text-foreground">
              Respuestas enviadas a revisión de tu docente.
            </p>
          )}
          {abiertas > 0 && (
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {abiertas}{' '}
              {abiertas === 1 ? 'respuesta abierta enviada' : 'respuestas abiertas enviadas'} a tu
              docente para retroalimentación.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {objetivas > 0 && (
            <div className="text-right">
              <p className={`${mono} text-[26px] font-extrabold leading-none text-foreground`}>
                {puntajeObtenido}
                <span className="text-[15px] text-muted-foreground">/{puntajeMax}</span>
              </p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                puntos
              </p>
            </div>
          )}
          {objetivas > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${
                aprobado
                  ? 'bg-accent text-accent-foreground'
                  : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
              }`}
            >
              {aprobado ? (
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              ) : (
                <RotateCcw className="h-4 w-4" strokeWidth={2} />
              )}
              {aprobado ? 'Aprobada' : 'Sigue practicando'}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Reactivo ───────────────────────── */

function Reactivo({
  reactivo,
  numero,
  respuesta,
  veredicto,
  calificado,
  onUnica,
  onMulti,
  onTexto,
}: {
  reactivo: ReactivoAlumno;
  numero: number;
  respuesta: string | string[] | undefined;
  veredicto: ResultadoReactivo | null;
  calificado: boolean;
  onUnica: (id: string, clave: string) => void;
  onMulti: (id: string, clave: string) => void;
  onTexto: (id: string, texto: string) => void;
}) {
  const esMulti = reactivo.tipo === 'multi';
  const esAbierta = reactivo.tipo === 'abierta';

  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="flex items-center gap-2">
        <span className={`${mono} text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground`}>
          Pregunta {numero} · {ROTULO_TIPO[reactivo.tipo]}
        </span>
      </div>
      <p className="mt-2 max-w-[60ch] text-[16.5px] font-bold leading-snug text-foreground">
        {reactivo.enunciado}
      </p>

      {reactivo.imagen && (
        // Imagen de apoyo del reactivo (URL en config). <img> directo: no pasa por el
        // optimizador de Next (puede ser URL firmada externa).
        <img
          src={reactivo.imagen}
          alt={`Apoyo visual de la pregunta ${numero}`}
          className="mt-4 max-h-[320px] w-auto rounded-[11px] border border-border"
        />
      )}

      {esAbierta ? (
        <AbiertaCampo
          id={reactivo.id}
          valor={typeof respuesta === 'string' ? respuesta : ''}
          calificado={calificado}
          onTexto={onTexto}
        />
      ) : (
        <ul className="mt-5 flex max-w-[60ch] flex-col gap-2.5">
          {reactivo.opciones.map((op) => (
            <li key={op.clave}>
              <OpcionBoton
                op={op}
                esMulti={esMulti}
                elegida={incluyeClave(respuesta, op.clave)}
                calificado={calificado}
                esCorrecta={incluyeClave(veredicto?.correcta ?? null, op.clave)}
                onClick={() =>
                  esMulti ? onMulti(reactivo.id, op.clave) : onUnica(reactivo.id, op.clave)
                }
              />
            </li>
          ))}
        </ul>
      )}

      {/* Retroalimentación revelada tras calificar. */}
      {calificado && veredicto && (
        <RetroLinea veredicto={veredicto} />
      )}
    </section>
  );
}

function OpcionBoton({
  op,
  esMulti,
  elegida,
  calificado,
  esCorrecta,
  onClick,
}: {
  op: { clave: string; texto: string };
  esMulti: boolean;
  elegida: boolean;
  calificado: boolean;
  esCorrecta: boolean;
  onClick: () => void;
}) {
  // Estilo por estado (§5A · lenguaje del "Punto de control" del mock).
  let estilo: string;
  let Icono = esMulti ? Square : Circle;
  if (calificado) {
    if (esCorrecta) {
      estilo = 'border-transparent bg-accent font-bold text-accent-foreground';
      Icono = Check;
    } else if (elegida) {
      estilo =
        'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] font-semibold text-[color:var(--warning-foreground)]';
      Icono = X;
    } else {
      estilo = 'border-border bg-card font-medium text-foreground-soft';
    }
  } else if (elegida) {
    estilo = 'border-[color:var(--primary)] bg-accent font-semibold text-accent-foreground';
    Icono = esMulti ? CheckSquare : CheckCircle2;
  } else {
    estilo = 'border-border bg-card font-medium hover:bg-muted';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={calificado}
      aria-pressed={elegida}
      className={`flex w-full items-center gap-3 rounded-[11px] border px-4 py-3.5 text-left text-[14.5px] transition-colors ${focusRing} ${estilo} ${calificado ? 'cursor-default' : ''}`}
    >
      <Icono
        aria-hidden
        className={`h-[18px] w-[18px] shrink-0 ${!calificado && !elegida ? 'opacity-60' : ''}`}
        strokeWidth={calificado || elegida ? 2.2 : 1.75}
      />
      {op.texto}
    </button>
  );
}

function AbiertaCampo({
  id,
  valor,
  calificado,
  onTexto,
}: {
  id: string;
  valor: string;
  calificado: boolean;
  onTexto: (id: string, texto: string) => void;
}) {
  return (
    <div className="mt-4">
      <textarea
        value={valor}
        onChange={(e) => onTexto(id, e.target.value)}
        disabled={calificado}
        rows={4}
        placeholder="Escribe tu respuesta…"
        className={`w-full max-w-[60ch] resize-y rounded-[11px] border border-border bg-card p-3.5 text-[14.5px] leading-relaxed text-foreground placeholder:text-muted-foreground disabled:opacity-70 ${focusRing}`}
      />
      {calificado && (
        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--info-foreground)]">
          <Send className="h-3.5 w-3.5" strokeWidth={2} />
          Enviada a revisión de tu docente
        </p>
      )}
    </div>
  );
}

function RetroLinea({ veredicto }: { veredicto: ResultadoReactivo }) {
  const { veredicto: v, retro } = veredicto;
  if (v === 'pendiente') return null;
  const prefijo =
    v === 'correcto'
      ? 'Correcto. '
      : v === 'sin_responder'
        ? 'Sin responder. '
        : 'Revisa de nuevo. ';
  if (!retro && v === 'correcto') {
    return (
      <p aria-live="polite" className="mt-4 max-w-[60ch] text-[13.5px] font-bold text-secondary">
        Correcto.
      </p>
    );
  }
  return (
    <p
      aria-live="polite"
      className="mt-4 max-w-[60ch] text-[13.5px] leading-relaxed text-foreground-soft"
    >
      <span
        className={`font-bold ${v === 'correcto' ? 'text-secondary' : 'text-foreground'}`}
      >
        {prefijo}
      </span>
      {retro}
    </p>
  );
}
