'use client';

/**
 * MotorAutoevaluacion — RENDER + MOTOR de la autoevaluación del alumno (§5C/§7A · mock
 * campus-lxp-mocks/alumno/leccion-autoevaluacion). Tres estados en una pantalla:
 *   · portada    → qué esperar antes de empezar (calma antes del cuestionario).
 *   · activa     → el cuestionario: una TARJETA por reactivo (enunciado + imagen +
 *                  opciones de 52px, la elegida en teal), ANCLA numérica "02/05" y barra
 *                  "N de M contestadas". Código de honor antes de enviar.
 *   · resultado  → puntaje honesto + revisión reactivo por reactivo con FEEDBACK de
 *                  ícono + texto (nunca solo color): Correcta / A repasar, su respuesta,
 *                  la correcta y el "por qué".
 *
 * REUSA el motor: la acción `calificarAutoevaluacion` (api /autoevaluacion/calificar)
 * autocalifica lo objetivo, manda lo ABIERTO al docente y registra entrega + xAPI. Aquí
 * solo se REVELA el veredicto que devuelve. Hereda el modo lectura (claro/sepia/oscuro)
 * del contenedor: solo tokens (§5A).
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Flag,
  ListOrdered,
  Loader2,
  RotateCcw,
  Send,
  Shield,
  Shuffle,
  Target,
  TriangleAlert,
} from 'lucide-react';
import type { ResultadoReactivo } from '@campus/shared';
import { card, focusRing, kicker, mono } from '@/components/tokens';
import { iniciarAutoevaluacion } from '@/lib/campus/autoeval-sesion-acciones';
import {
  calificarAutoevaluacion,
  type ResultadoAutoevalAlumno,
} from '@/lib/campus/autoeval-acciones';
import type { AutoevalAlumno, ReactivoAlumno } from '@/lib/campus/leccion-contrato';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
type Respuestas = Record<string, string | string[]>;
type Estado = 'portada' | 'activa' | 'resultado';

const trama = 'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)';

const MESES =['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Formatea `YYYY-MM-DD` a "28 sep" sin depender de locale (SSR estable). */
function fmtFecha(iso: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1] ?? ''}` : iso;
}

/** Segundos → "MM:SS" (reloj del examen). */
function fmtReloj(segundos: number): string {
  const s = Math.max(0, segundos);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function contestada(v: string | string[] | undefined): boolean {
  return Array.isArray(v) ? v.length > 0 : String(v ?? '').trim().length > 0;
}
function incluye(valor: string | string[] | null | undefined, clave: string): boolean {
  if (valor == null) return false;
  const c = clave.trim().toLowerCase();
  return Array.isArray(valor)
    ? valor.some((v) => String(v).trim().toLowerCase() === c)
    : String(valor).trim().toLowerCase() === c;
}
/** La letra viene de la POSICIÓN de la opción (estable · no de la clave). */
function letraDe(reactivo: ReactivoAlumno, clave: string): string {
  const i = reactivo.opciones.findIndex((o) => o.clave === clave);
  return i >= 0 ? LETRAS[i] : '';
}
/** Cita una respuesta (o la correcta) por letra + texto. */
function citar(reactivo: ReactivoAlumno, claves: string | string[] | null | undefined): string {
  const lista = (Array.isArray(claves) ? claves : claves ? [claves] : []).filter(Boolean) as string[];
  const ops = lista
    .map((c) => reactivo.opciones.find((o) => o.clave === c))
    .filter((o): o is { clave: string; texto: string } => !!o);
  if (ops.length === 0) return 'Sin contestar';
  if (ops.length === 1) return `${letraDe(reactivo, ops[0].clave)} · ${ops[0].texto}`;
  return ops.map((o) => `${letraDe(reactivo, o.clave)} · ${o.texto}`).join('  ·  ');
}

/* ── Ancla numérica "02/05" — el dispositivo de orientación ── */
function Ancla({ n, total, pendiente = false, tam = 34 }: { n: number; total: number; pendiente?: boolean; tam?: number }) {
  return (
    <span className={`${mono} flex shrink-0 items-baseline gap-px leading-none`}>
      <span
        className="font-extrabold tracking-[-0.03em]"
        style={{ fontSize: tam, color: pendiente ? 'var(--warning-foreground)' : 'var(--sidebar-foreground)' }}
      >
        {String(n).padStart(2, '0')}
      </span>
      <span
        aria-hidden
        className="font-bold"
        style={{ fontSize: Math.round(tam * 0.44), color: 'var(--muted-foreground)' }}
      >
        /{String(total).padStart(2, '0')}
      </span>
      <span className="sr-only">
        Pregunta {n} de {total}
      </span>
    </span>
  );
}

/* ── Feedback: ícono + palabra (nunca solo color) ── */
function Veredicto({ correcta }: { correcta: boolean }) {
  return correcta ? (
    <span className="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[10.5px] font-bold text-accent-foreground">
      <Check aria-hidden className="h-3 w-3" strokeWidth={2.8} />
      Correcta
    </span>
  ) : (
    <span className="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[10.5px] font-bold text-[color:var(--warning-foreground)]">
      <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2.2} />
      A repasar
    </span>
  );
}

export function MotorAutoevaluacion({
  leccionId,
  autoeval,
  contexto,
  repasarHref = '/cursos',
  siguienteHref = null,
  alumnoNombre,
  preview = false,
}: {
  leccionId: string;
  autoeval: AutoevalAlumno;
  /** Nombres para el hero ("Módulo · punto de control") + H1 con el título. */
  contexto?: { modulo: string; leccion: string };
  /** Destino de "Repasar la lección" (lección anterior o el curso). */
  repasarHref?: string;
  /** Destino de "Siguiente actividad" en el resultado (null si es la última). */
  siguienteHref?: string | null;
  /** Nombre del alumno para el código de honor. */
  alumnoNombre?: string;
  preview?: boolean;
}) {
  // Si ya hay un intento abierto (timer corriendo · mig 0029), se retoma el examen.
  const [estado, setEstado] = useState<Estado>(autoeval.sesion ? 'activa' : 'portada');
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [resultado, setResultado] = useState<ResultadoAutoevalAlumno | null>(null);
  const [honor, setHonor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [comenzando, startComenzar] = useTransition();
  const [iniciadoEn, setIniciadoEn] = useState<string | null>(autoeval.sesion?.iniciadoEn ?? null);
  const [restante, setRestante] = useState<number | null>(null); // segundos; null hasta montar (evita Date.now en SSR)

  const reactivos = autoeval.reactivos;
  const total = reactivos.length;
  const contestadas = reactivos.filter((r) => contestada(respuestas[r.id])).length;
  // Posición (1..N) del primer reactivo sin contestar — "Falta la 3" (−1 si no falta ninguno).
  const primeraFalta = reactivos.findIndex((r) => !contestada(respuestas[r.id]));

  const veredictos = useMemo(() => {
    const m = new Map<string, ResultadoReactivo>();
    for (const r of resultado?.resultados ?? []) m.set(r.reactivoId, r);
    return m;
  }, [resultado]);

  // Instante límite (ms) del intento en curso: inicio + minutos. null si no hay reloj.
  const deadlineMs = useMemo(() => {
    if (!iniciadoEn || !autoeval.minutos) return null;
    return new Date(iniciadoEn).getTime() + autoeval.minutos * 60_000;
  }, [iniciadoEn, autoeval.minutos]);

  const elegirUnica = (id: string, clave: string) => setRespuestas((r) => ({ ...r, [id]: clave }));
  const alternarMulti = (id: string, clave: string) =>
    setRespuestas((r) => {
      const prev = Array.isArray(r[id]) ? (r[id] as string[]) : [];
      return { ...r, [id]: prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave] };
    });
  const escribir = (id: string, texto: string) => setRespuestas((r) => ({ ...r, [id]: texto }));

  const enviar = () => {
    if (preview) return;
    setError(null);
    iniciar(async () => {
      const res = await calificarAutoevaluacion(leccionId, respuestas);
      if (res.ok) {
        setResultado(res.resultado);
        setIniciadoEn(null); // la sesión ya se cerró en el servidor (finalizarSesionAutoeval).
        setEstado('resultado');
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(res.error);
      }
    });
  };

  // Arranca (o retoma) el examen: fija el `iniciado_en` persistido → estado activa.
  const comenzar = () => {
    setError(null);
    if (preview) {
      setEstado('activa'); // vista previa del staff: sin persistir sesión (no es alumno).
      return;
    }
    startComenzar(async () => {
      const r = await iniciarAutoevaluacion(leccionId);
      if (r.ok) {
        setIniciadoEn(r.iniciadoEn);
        setEstado('activa');
      } else {
        setError(r.error);
      }
    });
  };

  const reintentar = () => {
    setResultado(null);
    setRespuestas({});
    setHonor(false);
    setError(null);
    setIniciadoEn(null); // fuerza abrir una sesión nueva (reloj fresco).
    comenzar();
  };

  // Reloj del examen: recalcula el restante cada segundo contra el instante límite.
  useEffect(() => {
    if (estado !== 'activa' || deadlineMs === null) return;
    const tick = () => setRestante(Math.max(0, Math.round((deadlineMs - Date.now()) / 1000)));
    tick();
    const h = setInterval(tick, 1000);
    return () => clearInterval(h);
  }, [estado, deadlineMs]);

  // Se agotó el tiempo → se envía lo contestado (aunque no haya aceptado el honor).
  useEffect(() => {
    if (estado === 'activa' && deadlineMs !== null && restante === 0 && !preview && !enviando) {
      enviar();
    }
  }, [estado, restante, deadlineMs]); // enviar/preview/enviando estables para este disparo

  if (total === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-4">
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[13px] text-[color:var(--info-foreground)]">
          Esta autoevaluación todavía no tiene preguntas publicadas.
        </p>
      </div>
    );
  }

  /* ═══════════════ PORTADA (inicio) ═══════════════ */
  if (estado === 'portada') {
    // Variante "acreditada": el alumno ya aprobó un intento previo (hero teal + chip).
    const acreditada = autoeval.ultimoIntento?.aprobado === true;
    const pctPrevio = autoeval.ultimoIntento?.porcentaje ?? null;
    const fC = fmtFecha(autoeval.fechaCierre);
    const fA = fmtFecha(autoeval.fechaApertura);
    const fechaTexto = fC ? `Abierta hasta el ${fC}` : fA ? `Abre el ${fA}` : null;
    // Orden del panel (mock): preguntas · minutos · umbral · barajado · fecha · intentos.
    const items: { icono: typeof ListOrdered; texto: string }[] = [
      {
        icono: ListOrdered,
        texto: `${total} ${total === 1 ? 'pregunta' : 'preguntas'} · ${autoeval.puntosTotales} ${autoeval.puntosTotales === 1 ? 'punto' : 'puntos'}`,
      },
      ...(autoeval.minutos ? [{ icono: Clock, texto: `${autoeval.minutos} minutos` }] : []),
      ...(autoeval.umbral ? [{ icono: Target, texto: `${autoeval.umbral}% para aprobar` }] : []),
      ...(autoeval.barajar ? [{ icono: Shuffle, texto: 'Las opciones cambian de orden en cada intento' }] : []),
      ...(fechaTexto ? [{ icono: CalendarDays, texto: fechaTexto }] : []),
      {
        icono: Shuffle,
        texto: autoeval.intentos === 0 ? 'Intentos ilimitados' : `${autoeval.intentos} ${autoeval.intentos === 1 ? 'intento' : 'intentos'}`,
      },
    ];

    return (
      <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_286px]">
          {/* HERO — navy plano + trama diagonal (teal si ya está acreditada) */}
          <section
            className="relative overflow-hidden rounded-2xl p-6 sm:p-7"
            style={{ background: acreditada ? 'var(--secondary)' : 'var(--sidebar)' }}
          >
            <div aria-hidden className="absolute inset-0" style={{ background: trama }} />

            <div className="relative">
              {acreditada ? (
                <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
                  <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.8} />
                  Acreditada{pctPrevio !== null ? ` · ${pctPrevio}%` : ''}
                </span>
              ) : (
                <span className={kicker} style={{ color: 'var(--primary)' }}>
                  Autoevaluación · {autoeval.cuentaParaCalificacion ? 'cuenta para su calificación' : 'no cuenta para su calificación'}
                </span>
              )}

              <h1
                className="mt-3.5 text-[26px] font-extrabold leading-tight tracking-[-0.025em]"
                style={{ color: 'var(--hero-ink)', textWrap: 'pretty' }}
              >
                {contexto?.leccion ?? 'Autoevaluación'}
              </h1>
              {contexto && (
                <p className="mt-2 text-[12.5px]" style={{ color: 'var(--hero-ink-muted)' }}>
                  {contexto.modulo} · {contexto.leccion.split(':')[0]} · punto de control
                </p>
              )}

              <p
                className="mt-4 max-w-[62ch] text-[14px] leading-relaxed"
                style={{ color: 'var(--hero-ink-muted)', textWrap: 'pretty' }}
              >
                {autoeval.descripcion?.trim() ||
                  'Un punto de control para saber si puedes seguir o conviene repasar la lección.'}
              </p>
              <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--hero-ink-muted)' }}>
                {autoeval.promesa?.trim() ||
                  'Al terminar verás qué acertaste, qué falló y por qué — con la retroalimentación de cada pregunta.'}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={comenzar}
                  disabled={comenzando}
                  className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-card px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary disabled:opacity-70 ${focusRing}`}
                >
                  {comenzando ? (
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : null}
                  {acreditada ? 'Volver a intentar' : 'Comenzar'}
                  {!comenzando && <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />}
                </button>
                <a
                  href={repasarHref}
                  className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] border border-white/30 px-4 text-[13.5px] font-semibold text-white no-underline transition-colors hover:bg-white/[0.12] ${focusRing}`}
                >
                  <BookOpen aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  Repasar la lección
                </a>
              </div>
            </div>
          </section>

          {/* QUÉ ESPERAR — datos REALES de la config (números en prosa, sin mono) */}
          <aside className={`${card} p-[18px]`}>
            <p className="text-[12.5px] font-bold">Qué esperar</p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {items.map(({ icono: Icono, texto }) => (
                <li key={texto} className="flex items-start gap-2.5">
                  <Icono aria-hidden className="mt-px h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-foreground-soft">{texto}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 border-t border-border pt-3.5 text-[11.5px] leading-relaxed text-muted-foreground">
              {autoeval.cuentaParaCalificacion
                ? 'Cuenta para la calificación del diplomado.'
                : 'No cuenta para la calificación del diplomado.'}{' '}
              El reloj corre mientras la tenga abierta.
            </p>
          </aside>
        </div>
      </div>
    );
  }

  /* ═══════════════ RESULTADO + REVISIÓN ═══════════════ */
  if (estado === 'resultado' && resultado) {
    const pct = resultado.escalado !== null ? Math.round(resultado.escalado * 100) : null;
    const hayObjetivas = resultado.objetivas > 0;
    return (
      <div className="mx-auto w-full max-w-[1240px] space-y-5 px-5 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl p-6 sm:p-7" style={{ background: 'var(--sidebar)' }}>
          <div aria-hidden className="absolute inset-0" style={{ background: trama }} />
          <div className="relative flex flex-wrap items-center gap-6">
            {hayObjetivas && (
              <span className="flex shrink-0 flex-col items-center">
                <span className={`${mono} text-[54px] font-extrabold leading-none tracking-[-0.03em]`} style={{ color: 'var(--hero-ink)' }}>
                  {pct}%
                </span>
                <span className={`${mono} mt-1.5 text-[12px]`} style={{ color: 'var(--hero-ink-muted)' }}>
                  {resultado.correctas} de {resultado.objetivas}
                </span>
              </span>
            )}
            <div className="min-w-[220px] flex-1">
              <span
                className={`inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-bold ${
                  resultado.aprobado
                    ? 'bg-primary text-[color:var(--sidebar)]'
                    : 'border border-white/30 text-white'
                }`}
              >
                {resultado.aprobado ? <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.8} /> : <RotateCcw aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />}
                {hayObjetivas ? (resultado.aprobado ? 'Aprobado' : 'Conviene repasar') : 'Enviada a revisión'}
              </span>
              <h2 className="mt-3.5 text-[22px] font-extrabold leading-tight tracking-[-0.02em]" style={{ color: 'var(--hero-ink)' }}>
                {hayObjetivas
                  ? resultado.aprobado
                    ? 'Bien: puedes seguir con la lección'
                    : 'Casi: repasa lo que falló abajo'
                  : 'Tus respuestas fueron a revisión de tu docente'}
              </h2>
              <p className="mt-2 max-w-[56ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--hero-ink-muted)' }}>
                {hayObjetivas
                  ? `Acertaste ${resultado.correctas} de ${resultado.objetivas} ${resultado.objetivas === 1 ? 'pregunta objetiva' : 'preguntas objetivas'}${resultado.abiertas > 0 ? `. ${resultado.abiertas} abierta(s) fueron a tu docente.` : '.'}`
                  : 'Las preguntas abiertas las revisa tu docente y te dará retroalimentación.'}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {siguienteHref && (
                  <a
                    href={siguienteHref}
                    className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-card px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] no-underline transition-colors hover:bg-primary ${focusRing}`}
                  >
                    Siguiente actividad
                    <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={reintentar}
                  className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] px-4 text-[13.5px] font-semibold transition-colors ${
                    siguienteHref
                      ? 'border border-white/30 text-white hover:bg-white/[0.12]'
                      : 'bg-card font-bold text-[color:var(--sidebar)] hover:bg-primary'
                  } ${focusRing}`}
                >
                  <RotateCcw aria-hidden className="h-4 w-4" strokeWidth={2} />
                  Volver a intentar
                </button>
                <a
                  href="#revision-autoeval"
                  className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] px-3.5 text-[13.5px] font-semibold no-underline transition-colors hover:text-white"
                  style={{ color: 'var(--hero-ink-muted)' }}
                >
                  <ChevronDown aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                  Revisar respuesta por respuesta
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Revisión: aquí ocurre el aprendizaje */}
        <section id="revision-autoeval" className={`${card} overflow-hidden`} style={{ scrollMarginTop: 88 }}>
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted px-5 py-3.5 sm:px-7">
            <p className={`${kicker} text-muted-foreground`}>Respuesta por respuesta</p>
            {hayObjetivas && (
              <span className="flex items-center gap-2">
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
                  <Check aria-hidden className="h-3 w-3" strokeWidth={2.8} />
                  {resultado.correctas} correctas
                </span>
                {resultado.objetivas - resultado.correctas > 0 && (
                  <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                    <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2.2} />
                    {resultado.objetivas - resultado.correctas} a repasar
                  </span>
                )}
              </span>
            )}
          </div>

          <ul>
            {reactivos.map((reactivo, i) => {
              const v = veredictos.get(reactivo.id) ?? null;
              const pendiente = v?.veredicto === 'pendiente';
              const correcta = v?.veredicto === 'correcto';
              const suRespuesta =
                reactivo.tipo === 'abierta'
                  ? (typeof respuestas[reactivo.id] === 'string' ? (respuestas[reactivo.id] as string) : '') || 'Sin contestar'
                  : citar(reactivo, respuestas[reactivo.id] as string | string[]);
              return (
                <li key={reactivo.id} className={i ? 'border-t border-border' : ''}>
                  <article className="flex gap-4 p-5 sm:gap-5 sm:p-7">
                    <Ancla n={i + 1} total={total} pendiente={!pendiente && !correcta} tam={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {pendiente ? (
                          <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                            <Send aria-hidden className="h-3 w-3" strokeWidth={2} />
                            En revisión del docente
                          </span>
                        ) : (
                          <Veredicto correcta={correcta} />
                        )}
                        {!pendiente && v && (
                          <span className={`${mono} ml-auto text-[11px] font-bold text-muted-foreground`}>
                            {v.obtenido} / {v.puntaje}
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-[15px] font-bold leading-snug" style={{ textWrap: 'pretty' }}>
                        {reactivo.enunciado}
                      </p>

                      <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                        <div
                          className={`rounded-[11px] border p-3.5 ${
                            correcta
                              ? 'border-transparent bg-accent'
                              : pendiente
                                ? 'border-border bg-muted'
                                : 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]'
                          }`}
                        >
                          <p
                            className={`${kicker} ${
                              correcta
                                ? 'text-accent-foreground'
                                : pendiente
                                  ? 'text-muted-foreground'
                                  : 'text-[color:var(--warning-foreground)]'
                            }`}
                          >
                            Tu respuesta
                          </p>
                          <p className="mt-1.5 text-[13px] font-semibold leading-relaxed">{suRespuesta}</p>
                        </div>
                        {!correcta && !pendiente && v?.correcta != null && (
                          <div className="rounded-[11px] border border-transparent bg-accent p-3.5">
                            <p className={`${kicker} text-accent-foreground`}>La correcta</p>
                            <p className="mt-1.5 text-[13px] font-semibold leading-relaxed">{citar(reactivo, v.correcta)}</p>
                          </div>
                        )}
                      </div>

                      {v?.retro && (
                        <div className="mt-3.5">
                          <p className={`${kicker} text-muted-foreground`}>Por qué</p>
                          <p className="mt-1.5 text-[13px] leading-[1.65] text-foreground-soft" style={{ textWrap: 'pretty' }}>
                            {v.retro}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    );
  }

  /* ═══════════════ CUESTIONARIO (activa) — examen AISLADO del shell ═══════════════ */
  const fCierre = fmtFecha(autoeval.fechaCierre);
  const relojTexto =
    restante !== null ? fmtReloj(restante) : autoeval.minutos ? fmtReloj(autoeval.minutos * 60) : null;
  const relojBajo = restante !== null && restante <= 60;
  const subtituloExamen = `Autoevaluación · ${
    autoeval.cuentaParaCalificacion ? 'cuenta para tu calificación' : 'no cuenta para tu calificación'
  } · ${total} ${total === 1 ? 'pregunta' : 'preguntas'}${autoeval.minutos ? ` · ${autoeval.minutos} min` : ''}`;
  return (
    // Toma toda la pantalla (cubre sidebar + barra de lección): el alumno se enfoca.
    <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background">
      {/* Barra propia del examen: única salida + reloj siempre a la vista */}
      <header className="sticky top-0 z-[5] flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-4 sm:gap-5 sm:px-6">
        <button
          type="button"
          onClick={() => setEstado('portada')}
          className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] pl-2 pr-3 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
        >
          <ArrowLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          Volver
        </button>
        <span aria-hidden className="hidden h-[26px] w-px shrink-0 bg-border sm:block" />
        <span className="flex min-w-0 flex-col leading-[1.25]">
          <span className="truncate text-[14.5px] font-bold">{contexto?.leccion ?? 'Autoevaluación'}</span>
          <span className="truncate text-[11.5px] text-muted-foreground">{subtituloExamen}</span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-3 sm:gap-[18px]">
          {relojTexto && (
            <span
              role="timer"
              aria-live="off"
              className={`${mono} inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[14px] font-bold ${
                relojBajo
                  ? 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                  : 'bg-accent text-accent-foreground'
              }`}
            >
              <Clock aria-hidden className="h-4 w-4" strokeWidth={2} />
              {relojTexto}
            </span>
          )}
          {fCierre && (
            <span className="hidden items-center gap-2 whitespace-nowrap sm:flex">
              <CalendarDays aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[12.5px] font-semibold">Fecha límite</span>
              <span className={`${mono} text-[12.5px] text-muted-foreground`}>{fCierre}</span>
            </span>
          )}
        </span>
      </header>

      <div className="mx-auto w-full max-w-[880px] px-5 py-6 sm:px-6">
        <div className={`${card} overflow-hidden`}>
          {/* Fila de utilidades: instrucciones + progreso (sticky bajo el header del examen) */}
          <div className="sticky top-16 z-[3] flex items-center gap-3.5 border-b border-border bg-card px-5 py-3.5 sm:px-7">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-secondary">
              <ClipboardList aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              Cuestionario
            </span>
        <span className="min-w-0 flex-1" />
        <span className="flex shrink-0 items-center gap-2.5">
          <span
            className="hidden h-1.5 w-[132px] overflow-hidden rounded-full bg-[color:var(--track)] sm:block"
            role="progressbar"
            aria-valuenow={contestadas}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Preguntas contestadas"
          >
            <span aria-hidden className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${(contestadas / total) * 100}%` }} />
          </span>
          <span className={`${mono} whitespace-nowrap text-[11.5px] font-bold text-muted-foreground`}>
            {contestadas} de {total} contestadas
          </span>
        </span>
      </div>

      {/* Tarjeta por reactivo */}
      {reactivos.map((reactivo, i) => {
        const esMulti = reactivo.tipo === 'multi';
        const esAbierta = reactivo.tipo === 'abierta';
        const resp = respuestas[reactivo.id];
        const hecha = contestada(resp);
        return (
          <article key={reactivo.id} className="border-t border-border px-5 py-6 sm:px-7">
            <div className="flex items-start gap-3.5">
              <Ancla n={i + 1} total={total} pendiente={!hecha} />
              <div className="min-w-0 flex-1">
                <p id={`${reactivo.id}-enunciado`} className="text-[16px] font-bold leading-[1.45]" style={{ textWrap: 'pretty' }}>
                  {reactivo.enunciado}
                </p>
                {(reactivo.ayuda || esMulti) && (
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    {reactivo.ayuda ?? 'Puedes marcar más de una.'}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-semibold ${
                  hecha
                    ? 'border-border bg-muted text-foreground-soft'
                    : 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                }`}
              >
                {hecha ? `${reactivo.puntaje} ${reactivo.puntaje === 1 ? 'punto' : 'puntos'}` : 'Sin contestar'}
              </span>
            </div>

            {reactivo.imagen && (
              // <img> directo: la URL puede ser firmada/externa (no pasa por next/image).
              <figure className="mt-4">
                <img
                  src={reactivo.imagen}
                  alt=""
                  className="max-h-[360px] w-full rounded-xl border border-border object-contain"
                />
              </figure>
            )}

            {esAbierta ? (
              <label className="mt-4 block">
                <span className="sr-only">{reactivo.enunciado}</span>
                <textarea
                  rows={3}
                  value={typeof resp === 'string' ? resp : ''}
                  onChange={(e) => escribir(reactivo.id, e.target.value)}
                  className={`w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-[14px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary ${focusRing}`}
                />
              </label>
            ) : (
              <div role={esMulti ? 'group' : 'radiogroup'} aria-labelledby={`${reactivo.id}-enunciado`} className="mt-4 flex flex-col gap-2">
                {reactivo.opciones.map((op) => {
                  const on = incluye(resp, op.clave);
                  return (
                    <label
                      key={op.clave}
                      className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border-[1.5px] px-3.5 py-3.5 transition-colors ${
                        on ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-muted'
                      }`}
                    >
                      <input
                        type={esMulti ? 'checkbox' : 'radio'}
                        name={reactivo.id}
                        checked={on}
                        onChange={() => (esMulti ? alternarMulti(reactivo.id, op.clave) : elegirUnica(reactivo.id, op.clave))}
                        className={`mt-0.5 h-[22px] w-[22px] shrink-0 accent-[color:var(--secondary)] ${focusRing}`}
                      />
                      <span className={`min-w-0 flex-1 text-[14px] leading-relaxed ${on ? 'font-semibold' : 'font-normal'}`}>
                        <span className={`mr-2 font-bold ${on ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                          {letraDe(reactivo, op.clave)}
                        </span>
                        {op.texto}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}

      {/* Código de honor + envío */}
      <div className="border-t border-border bg-muted px-5 pb-6 pt-6 sm:px-7">
        <section aria-labelledby="honor-autoeval" className={`${card} px-5 py-[18px]`}>
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
              <Shield className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p id="honor-autoeval" className="min-w-0 flex-1 text-[14px] font-bold">
              Código de honor del Campus
            </p>
          </div>
          <p className="mt-3 max-w-[74ch] text-[13px] leading-[1.65] text-foreground-soft" style={{ textWrap: 'pretty' }}>
            Al enviar confirmas que la resolviste por tu cuenta, con lo que estudiaste en el módulo. En un
            programa clínico esto no es un trámite: la competencia que se acredita aquí se traduce en
            decisiones sobre pacientes. Resolverla con ayuda externa —o con un asistente de IA— desvirtúa el
            diagnóstico de tu propio nivel y puede derivar en la baja del programa, según la{' '}
            <a href="#" className="font-semibold text-secondary">
              política de integridad académica
            </a>
            .
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={honor}
              onChange={(e) => setHonor(e.target.checked)}
              className={`mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--secondary)] ${focusRing}`}
            />
            <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed">
              {alumnoNombre ? (
                <>
                  Yo, <span className="font-bold">{alumnoNombre}</span>, lo entiendo y lo acepto.
                </>
              ) : (
                'Lo entiendo y lo acepto.'
              )}
            </span>
          </label>
          <p className="ml-8 mt-2 text-[11.5px] text-muted-foreground">
            Debes aceptarlo para poder enviar la autoevaluación.
          </p>
        </section>

        {error && (
          <p className="mt-4 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[color:var(--destructive-foreground)]">
            {error}
          </p>
        )}

        <div className="mt-[18px] flex flex-wrap items-center gap-3">
          {preview ? (
            <span className="inline-flex h-12 items-center gap-2 rounded-[11px] border border-dashed border-border px-5 text-[13px] font-semibold text-muted-foreground">
              Vista previa · no se califica ni registra
            </span>
          ) : (
            <button
              type="button"
              onClick={enviar}
              disabled={!honor || enviando}
              className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:bg-muted disabled:text-muted-foreground ${focusRing}`}
            >
              {enviando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Send aria-hidden className="h-4 w-4" strokeWidth={2} />}
              Enviar y ver resultado
              {!enviando && <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />}
            </button>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-2.5">
            {primeraFalta >= 0 && (
              <span className="inline-flex h-[26px] items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                Falta la {primeraFalta + 1}
              </span>
            )}
          </span>
        </div>

        <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
          El reloj corre mientras tienes la evaluación abierta. Si se agota, se envía lo contestado.
          Puedes enviar con preguntas en blanco —cuentan como incorrectas—
          {autoeval.intentos === 0 ? ' y tienes intentos ilimitados.' : '.'}
        </p>

        <div className="mt-4 flex items-center gap-[18px] border-t border-border pt-4">
          <button
            type="button"
            className={`inline-flex h-[34px] items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
          >
            <Flag aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Informar de un problema
          </button>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
