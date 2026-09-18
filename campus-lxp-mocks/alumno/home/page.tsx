"use client";

/**
 * Campus · Inicio del alumno — rediseño
 *
 * Es donde el médico aterriza cada día. El home INFORMA Y LANZA: no se opera aquí (subir casos y
 * Eco viven en sus secciones). Cuatro bloques, en este orden:
 *   1. HERO INTELIGENTE — anuncio vigente o, si no hay, el caso de la semana. Nunca vacío ni frío.
 *   2. ¿DÓNDE ME QUEDÉ? — la acción #1, con un pulso ligero de cómo va (no analítica).
 *   3. COMUNIDAD VIVA — Ateneo a la izquierda, cine-loops de la semana a la derecha.
 *   4. LO QUE VIENE — agenda compacta de la semana.
 *
 * Vive dentro del shell (app/(campus)/layout.tsx): sidebar navy + header ya existen. El hero es
 * full-bleed; el resto se topa a 1240px centrado.
 *
 * Un solo color de atención: ÁMBAR, y solo para la fecha que aprieta y el dominio en repaso.
 *
 * Stubs: onContinuar · onAbrirPost · onAbrirCineLoop · onVerEvento · onVerAnuncio
 */

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  Flame,
  MessageCircle,
  Megaphone,
  Play,
  ScanLine,
  Video,
} from "lucide-react";
import { mono, kicker, softText, cardLg as card, focusRing } from "@/components/tokens";
import { Avatar } from "@/components/Avatar";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type Anuncio = {
  titulo: string;
  cuerpo: string;
  vigencia: string;
  cta: string;
  video?: { duracion: string; etiqueta: string; poster?: string };
};

export type CasoDestacado = {
  titulo: string;
  cuerpo: string;
  autor: { ini: string; nombre: string };
  utiles: number;
  loop: { duracion: string; etiqueta: string; poster?: string };
};

export type CursoEnCurso = {
  curso: string;
  modulo: string;
  leccion: string;
  indice: string;
  avance: number;
  restante: string;
};

export type Pulso = {
  avance: { valor: string; etiqueta: string; detalle: string };
  competencia: { valor: string; etiqueta: string; detalle: string };
  dominios: { nombre: string; valor: number; enRepaso?: boolean }[];
  racha: { dias: number; total: number };
};

export type TipoPost = "caso" | "encuesta" | "pregunta";

export type PostAteneo = {
  id: string;
  ini: string;
  autor: string;
  cuando: string;
  tipo: TipoPost;
  texto: string;
  actividad: string;
  pideInterconsulta?: boolean;
};

export type CineLoop = {
  id: string;
  area: string;
  titulo: string;
  autor: string;
  duracion: string;
  vistas: number;
  destacado?: boolean;
  poster?: string;
};

export type TipoEvento = "clase" | "entrega" | "practica" | "ateneo";

export type DiaAgenda = {
  dd: string;
  mes: string;
  nombre: string;
  hoy?: boolean;
  eventos: { id: string; tipo: TipoEvento; hora: string; titulo: string; detalle: string }[];
};

export type InicioData = {
  alumno: { nombre: string; ini: string };
  contexto: string;
  /** si no hay anuncio vigente, el hero abre con el caso de la semana */
  anuncio?: Anuncio;
  casoSemana: CasoDestacado;
  enCurso: CursoEnCurso;
  pulso: Pulso;
  ateneo: { resumen: string; posts: PostAteneo[]; colegas: string[]; pie: string };
  loops: { resumen: string; items: CineLoop[] };
  agenda: { resumen: string; aviso?: string; dias: DiaAgenda[] };
};

const MOCK: InicioData = {
  alumno: { nombre: "Dra. Ramírez", ini: "SR" },
  contexto: "Le falta media lección para cerrar el módulo 4, y hoy hay clase a las 19:00.",
  anuncio: {
    titulo: "Ya está abierto el módulo de Doppler renal",
    cuerpo:
      "Son 88 horas acreditables y cuatro cine-loops nuevos grabados en la sede. La primera sesión en vivo es el jueves a las 19:00.",
    vigencia: "vigente hasta el 30 de septiembre",
    cta: "Ver el módulo",
    video: { duracion: "1:48", etiqueta: "bienvenida al módulo" },
  },
  casoSemana: {
    titulo: "El jet ureteral que no estaba: obstrucción sin litiasis visible",
    cuerpo:
      "Lo presentó la Dra. Méndez y lo validó la Dra. Lugo. Dos exploraciones separadas por 20 minutos, el mismo hallazgo ausente — y la lectura correcta.",
    autor: { ini: "KM", nombre: "Dra. Karla Méndez" },
    utiles: 38,
    loop: { duracion: "4 s", etiqueta: "vejiga · doppler color" },
  },
  enCurso: {
    curso: "Ultrasonografía Médica",
    modulo: "Módulo 4",
    leccion: "Hidronefrosis: gradación y trampas del modo B",
    indice: "Lección 3 de 6",
    avance: 48,
    restante: "quedan 9:12",
  },
  pulso: {
    avance: { valor: "48%", etiqueta: "del diplomado", detalle: "480 de 1000 h" },
    competencia: { valor: "68", etiqueta: "competencia", detalle: "sube 4 este mes" },
    dominios: [
      { nombre: "Interpretación", valor: 71 },
      { nombre: "Adquisición", valor: 54, enRepaso: true },
    ],
    racha: { dias: 6, total: 7 },
  },
  ateneo: {
    resumen: "12 casos esta semana · 4 esperan una segunda opinión",
    posts: [
      { id: "p1", ini: "IT", autor: "Dr. Iván Torres", cuando: "hace 2 h", tipo: "caso", texto: "¿Esta asimetría cortical es crónica o me está ganando el ángulo? Mujer de 46 años, dolor lumbar derecho de 3 días.", actividad: "7 comentarios · 2 diagnósticos propuestos", pideInterconsulta: true },
      { id: "p2", ini: "KM", autor: "Dra. Karla Méndez", cuando: "hace 4 h", tipo: "encuesta", texto: "En equipos portátiles, ¿qué preset usan de entrada para riñón?", actividad: "86 votos · cierra en 2 días" },
      { id: "p3", ini: "HC", autor: "Dr. Hugo Cuevas", cuando: "ayer", tipo: "pregunta", texto: "¿El informe estructurado que vimos aplica igual para vía biliar?", actividad: "5 respuestas · una de la Dra. Lugo" },
    ],
    colegas: ["KM", "LA", "HC", "MP", "+9"],
    pie: "13 colegas de su generación publicaron esta semana",
  },
  loops: {
    resumen: "Curados de la Biblioteca · seis minutos bien puestos",
    items: [
      { id: "l1", area: "renal · riñón", titulo: "Hidronefrosis grado III con cortical adelgazada", autor: "Dr. Sandoval", duracion: "0:18", vistas: 214, destacado: true },
      { id: "l2", area: "doppler · vena renal", titulo: "Trombosis de vena renal en color", autor: "Dra. Salas", duracion: "0:22", vistas: 168 },
      { id: "l3", area: "vías urinarias · vejiga", titulo: "Jet ureteral ausente, dos exploraciones", autor: "Dra. Méndez", duracion: "0:14", vistas: 141 },
      { id: "l4", area: "hígado · vesícula", titulo: "Colecistitis aguda con pared engrosada", autor: "Dr. Arreola", duracion: "0:11", vistas: 96 },
    ],
  },
  agenda: {
    resumen: "2 clases en vivo, una entrega y su práctica en sede",
    aviso: "La entrega cierra el viernes",
    dias: [
      { dd: "16", mes: "sep", nombre: "martes", hoy: true, eventos: [{ id: "e1", tipo: "clase", hora: "19:00", titulo: "Hidronefrosis: casos difíciles", detalle: "Grupo B · Zoom · Dr. Sandoval" }] },
      { dd: "17", mes: "sep", nombre: "miércoles", eventos: [] },
      { dd: "18", mes: "sep", nombre: "jueves", eventos: [
        { id: "e2", tipo: "clase", hora: "19:00", titulo: "Doppler renal: cuándo sí aporta", detalle: "Grupo B · Zoom" },
        { id: "e3", tipo: "ateneo", hora: "20:30", titulo: "Ateneo de casos renales", detalle: "sesión abierta · 42 inscritos" },
      ] },
      { dd: "19", mes: "sep", nombre: "viernes", eventos: [{ id: "e4", tipo: "entrega", hora: "23:59", titulo: "Caso propio con gradación argumentada", detalle: "Módulo 4 · se acredita al validarlo" }] },
      { dd: "20", mes: "sep", nombre: "sábado", eventos: [{ id: "e5", tipo: "practica", hora: "09:00", titulo: "Práctica en sede con equipo", detalle: "Guadalajara · 4 h acreditables" }] },
    ],
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const trama =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

const POST: Record<TipoPost, { etiqueta: string; clase: string; icono: typeof ScanLine }> = {
  caso: { etiqueta: "Caso", clase: "bg-accent text-accent-foreground", icono: ScanLine },
  encuesta: {
    etiqueta: "Encuesta",
    clase: "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
    icono: BarChart3,
  },
  pregunta: { etiqueta: "Pregunta", clase: `bg-muted ${softText}`, icono: MessageCircle },
};

const EVENTO: Record<TipoEvento, { etiqueta: string; icono: typeof Video; alerta?: boolean }> = {
  clase: { etiqueta: "Clase en vivo", icono: Video },
  entrega: { etiqueta: "Entrega", icono: Clock, alerta: true },
  practica: { etiqueta: "Práctica", icono: Compass },
  ateneo: { etiqueta: "Ateneo", icono: ScanLine },
};


/** Marco de cine-loop: el visor real es Cornerstone3D; aquí es el gancho visual. */
function Loop({
  ratio = "16 / 10",
  poster,
  etiqueta,
  duracion,
  tamano = 46,
  claro = false,
  esquina,
}: {
  ratio?: string;
  poster?: string;
  etiqueta?: string;
  duracion?: string;
  tamano?: number;
  claro?: boolean;
  esquina?: string;
}) {
  return (
    <>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="absolute inset-0" style={{ background: trama }} />
      )}
      <span
        aria-hidden
        style={{ width: tamano, height: tamano }}
        className={`relative grid place-items-center rounded-full ${
          claro ? "bg-white/[0.92]" : "bg-primary"
        } text-[color:var(--sidebar)]`}
      >
        <Play style={{ width: tamano * 0.42, height: tamano * 0.42 }} strokeWidth={2} />
      </span>
      {etiqueta && (
        <span
          className={`${mono} absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.14em]`}
          style={{ color: "var(--hero-ink-muted)" }}
        >
          {etiqueta}
        </span>
      )}
      {duracion && (
        <span
          className={`${mono} absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white`}
          style={{ background: "rgba(15,45,82,.85)" }}
        >
          {duracion}
        </span>
      )}
      {esquina && (
        <span
          className="absolute left-3 top-3 inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-bold text-white"
          style={{ background: "rgba(15,45,82,.85)" }}
        >
          <Video aria-hidden className="h-3 w-3" strokeWidth={1.75} />
          {esquina}
        </span>
      )}
    </>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function InicioCampus({ data = MOCK }: { data?: InicioData }) {
  const { alumno, contexto, anuncio, casoSemana, enCurso, pulso, ateneo, loops, agenda } = data;

  /* ── Stubs ─────────────────────────────────────────────── */
  const onContinuar = () => {};
  const onAbrirPost = (_id: string) => {};
  const onAbrirCineLoop = (_id: string) => {};
  const onVerEvento = (_id: string) => {};
  const onVerAnuncio = () => {};
  /* ──────────────────────────────────────────────────────── */

  return (
    <div className="pb-10">
      {/* ══════════ 1 · HERO INTELIGENTE (full-bleed) ══════════ */}
      {anuncio ? (
        <section
          aria-label="Anuncio de la escuela"
          className="relative overflow-hidden"
          style={{ background: "var(--sidebar)" }}
        >
          <div aria-hidden className="absolute inset-0" style={{ background: trama }} />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 150% at 88% 0%, rgba(26,136,128,.62) 0%, rgba(15,45,82,0) 62%)",
            }}
          />
          <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-10 px-5 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-8">
            <div className="min-w-0">
              <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
                <Megaphone aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                Anuncio de la escuela
              </span>
              <h1
                className="mt-4 text-[26px] font-extrabold leading-[1.18] tracking-[-0.025em] sm:text-[31px]"
                style={{ color: "var(--hero-ink)", textWrap: "pretty" }}
              >
                {anuncio.titulo}
              </h1>
              <p
                className="mt-3 max-w-[58ch] text-[14.5px] leading-relaxed"
                style={{ color: "var(--hero-ink-muted)", textWrap: "pretty" }}
              >
                {anuncio.cuerpo}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onVerAnuncio}
                  className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-card px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary ${focusRing}`}
                >
                  {anuncio.cta}
                  <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={onVerAnuncio}
                  className="inline-flex h-11 items-center whitespace-nowrap rounded-[11px] border border-white/30 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-white/[0.12]"
                >
                  Leer el anuncio
                </button>
                <span
                  className={`${mono} ml-auto whitespace-nowrap text-[11.5px]`}
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  {anuncio.vigencia}
                </span>
              </div>
            </div>

            {anuncio.video && (
              <button
                type="button"
                onClick={onVerAnuncio}
                aria-label="Reproducir el video del anuncio"
                className={`relative grid w-full place-items-center overflow-hidden rounded-2xl border border-white/20 p-0 transition-colors hover:border-primary ${focusRing}`}
                style={{ aspectRatio: "16 / 10", background: "#0a2140" }}
              >
                <Loop
                  poster={anuncio.video.poster}
                  etiqueta={anuncio.video.etiqueta}
                  duracion={anuncio.video.duracion}
                  tamano={62}
                />
              </button>
            )}
          </div>
        </section>
      ) : (
        /* sin anuncio: nunca queda vacío — entra el caso de la semana */
        <section
          aria-label="Caso de la semana"
          className="relative overflow-hidden"
          style={{ background: "var(--sidebar)" }}
        >
          <div aria-hidden className="absolute inset-0" style={{ background: trama }} />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 150% at 12% 100%, rgba(26,136,128,.6) 0%, rgba(15,45,82,0) 58%)",
            }}
          />
          <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-10 px-5 py-9 sm:px-6 lg:grid-cols-[480px_minmax(0,1fr)] lg:px-8">
            <button
              type="button"
              onClick={() => onAbrirCineLoop("caso-semana")}
              aria-label="Abrir el caso de la semana"
              className={`relative grid w-full place-items-center overflow-hidden rounded-2xl border border-white/20 p-0 transition-colors hover:border-primary ${focusRing}`}
              style={{ aspectRatio: "16 / 10", background: "#0a2140" }}
            >
              <Loop
                poster={casoSemana.loop.poster}
                etiqueta={casoSemana.loop.etiqueta}
                esquina={`cine-loop · ${casoSemana.loop.duracion}`}
                tamano={62}
              />
            </button>

            <div className="min-w-0">
              <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
                <Compass aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                Caso de la semana
              </span>
              <h1
                className="mt-4 text-[25px] font-extrabold leading-tight tracking-[-0.025em] sm:text-[29px]"
                style={{ color: "var(--hero-ink)", textWrap: "pretty" }}
              >
                {casoSemana.titulo}
              </h1>
              <p
                className="mt-3 max-w-[56ch] text-[14.5px] leading-relaxed"
                style={{ color: "var(--hero-ink-muted)", textWrap: "pretty" }}
              >
                {casoSemana.cuerpo}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onAbrirCineLoop("caso-semana")}
                  className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-card px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary ${focusRing}`}
                >
                  Ver el caso
                  <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
                <span className="flex items-center gap-2.5">
                  <Avatar ini={casoSemana.autor.ini} size={30} />
                  <span className="text-[12.5px]" style={{ color: "var(--hero-ink-muted)" }}>
                    {casoSemana.autor.nombre} · <span className={mono}>{casoSemana.utiles}</span> lo
                    vieron útil
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* saludo */}
      <div className="mx-auto w-full max-w-[1240px] px-5 pt-7 sm:px-6 lg:px-8">
        <h2 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[23px]">
          Buen día, {alumno.nombre}
        </h2>
        <p className={`mt-1.5 text-[13.5px] ${softText}`}>{contexto}</p>
      </div>

      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-5 pt-6 sm:px-6 lg:px-8">
        {/* ══════════ 2 · ¿DÓNDE ME QUEDÉ? ══════════ */}
        <section aria-label="Dónde se quedó" className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_316px]">
          <article className="relative overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)]" style={{ background: "var(--secondary)" }}>
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 150% at 92% 0%, rgba(83,195,190,.5) 0%, rgba(26,136,128,0) 60%)",
              }}
            />
            <div aria-hidden className="absolute inset-0" style={{ background: trama }} />

            <div className="relative flex flex-wrap items-center gap-6 p-6">
              <button
                type="button"
                onClick={onContinuar}
                aria-label="Continuar la lección"
                className={`relative grid w-[196px] shrink-0 place-items-center overflow-hidden rounded-xl border border-white/20 p-0 transition-colors hover:border-white ${focusRing}`}
                style={{ aspectRatio: "16 / 10", background: "#0a2140" }}
              >
                <Loop duracion={enCurso.restante} tamano={46} claro />
              </button>

              <div className="min-w-[260px] flex-1">
                <span className={`${kicker}`} style={{ color: "#a8e0dc" }}>
                  Siga donde se quedó
                </span>
                <p
                  className="mt-2.5 text-[20px] font-extrabold leading-[1.28] tracking-[-0.015em]"
                  style={{ color: "var(--hero-ink)", textWrap: "pretty" }}
                >
                  {enCurso.leccion}
                </p>
                <p className="mt-1.5 text-[12.5px]" style={{ color: "#d3f1ef" }}>
                  {enCurso.curso} · {enCurso.modulo} · {enCurso.indice}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="h-[7px] flex-1 overflow-hidden rounded-full bg-white/[0.22]"
                    role="progressbar"
                    aria-valuenow={enCurso.avance}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Avance de la lección"
                  >
                    <span
                      aria-hidden
                      className="block h-full rounded-full bg-white"
                      style={{ width: `${enCurso.avance}%` }}
                    />
                  </div>
                  <span className={`${mono} text-[12.5px] font-bold text-white`}>
                    {enCurso.avance}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onContinuar}
                  className={`mt-5 inline-flex h-12 items-center gap-2 rounded-[11px] bg-card px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary ${focusRing}`}
                >
                  Continuar
                  <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </article>

          {/* pulso: se queda en pulso — el detalle vive en Mi dominio */}
          <aside className={`${card} flex flex-col p-5`}>
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Cómo va</p>
              <a href="#" className="whitespace-nowrap text-[11.5px] font-semibold text-secondary no-underline">
                Ver a detalle
              </a>
            </div>

            <div className="mt-4 flex gap-4">
              {[pulso.avance, pulso.competencia].map((p) => (
                <div key={p.etiqueta} className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`${mono} text-[22px] font-extrabold leading-none tracking-[-0.02em]`}>
                      {p.valor}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {p.etiqueta}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{p.detalle}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2.5 border-t border-border pt-4">
              {pulso.dominios.map((d) => (
                <div key={d.nombre}>
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 text-[11.5px] font-semibold">{d.nombre}</span>
                    {d.enRepaso && (
                      <span className="inline-flex h-[19px] items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-[7px] text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
                        en repaso
                      </span>
                    )}
                    <span className={`${mono} shrink-0 text-[11.5px] font-bold`}>{d.valor}</span>
                  </div>
                  <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full bg-[color:var(--track)]">
                    <span
                      aria-hidden
                      className={`block h-full rounded-full ${
                        d.enRepaso ? "bg-[color:var(--warning)]" : "bg-primary"
                      }`}
                      style={{ width: `${d.valor}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center gap-2.5 pt-4">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
              >
                <Flame className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold">
                  Racha de {pulso.racha.dias} días
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  no la rompa hoy
                </span>
              </span>
              <span aria-hidden className="flex shrink-0 gap-1">
                {Array.from({ length: pulso.racha.total }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-[7px] w-[7px] rounded-full ${
                      i < pulso.racha.dias ? "bg-primary" : "bg-[color:var(--track)]"
                    }`}
                  />
                ))}
              </span>
            </div>
          </aside>
        </section>

        {/* ══════════ 3 · COMUNIDAD VIVA ══════════ */}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Ateneo */}
          <section className={`${card} flex min-w-0 flex-col overflow-hidden`}>
            <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-[18px]">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground"
              >
                <MessageCircle className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15.5px] font-bold leading-tight">Lo nuevo en el Ateneo</h3>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{ateneo.resumen}</p>
              </div>
              <a
                href="#"
                className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-semibold text-secondary no-underline transition-colors hover:bg-accent ${focusRing}`}
              >
                Ver todo
                <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </a>
            </div>

            <ul>
              {ateneo.posts.map((p) => {
                const t = POST[p.tipo];
                const Icono = t.icono;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirPost(p.id)}
                      className={`flex w-full gap-3.5 border-t border-border p-[15px] text-left transition-colors hover:bg-muted ${focusRing}`}
                    >
                      <Avatar ini={p.ini} size={38} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-bold">{p.autor}</span>
                          <span
                            className={`inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[10px] font-bold ${t.clase}`}
                          >
                            <Icono aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />
                            {t.etiqueta}
                          </span>
                          {p.pideInterconsulta && (
                            <span className="inline-flex h-5 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                              Pide interconsulta
                            </span>
                          )}
                          <span className={`${mono} ml-auto whitespace-nowrap text-[10.5px] text-muted-foreground`}>
                            {p.cuando}
                          </span>
                        </span>
                        <span
                          className={`mt-1.5 block text-[13.5px] font-medium leading-relaxed ${softText}`}
                          style={{ textWrap: "pretty" }}
                        >
                          {p.texto}
                        </span>
                        <span className={`${mono} mt-2 block text-[11px] text-muted-foreground`}>
                          {p.actividad}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto flex items-center gap-2.5 border-t border-border bg-muted px-[18px] py-3.5">
              <span aria-hidden className="flex pl-1.5">
                {ateneo.colegas.map((i) => (
                  <span
                    key={i}
                    className={`${mono} -ml-2 grid h-6 w-6 place-items-center rounded-full border-2 border-muted bg-card text-[8.5px] font-bold text-muted-foreground`}
                  >
                    {i}
                  </span>
                ))}
              </span>
              <span className={`min-w-0 flex-1 text-[12px] ${softText}`}>{ateneo.pie}</span>
            </div>
          </section>

          {/* cine-loops: gancho visual */}
          <section className={`${card} flex min-w-0 flex-col overflow-hidden`}>
            <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-[18px]">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground"
              >
                <Video className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15.5px] font-bold leading-tight">Cine-loops de la semana</h3>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{loops.resumen}</p>
              </div>
              <a
                href="#"
                className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-semibold text-secondary no-underline transition-colors hover:bg-accent ${focusRing}`}
              >
                Biblioteca
                <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </a>
            </div>

            <ul className="flex flex-col gap-2.5 px-[18px] pb-[18px]">
              {loops.items.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onAbrirCineLoop(l.id)}
                    className={`flex w-full gap-3.5 rounded-xl border p-3 text-left transition-colors hover:border-primary ${focusRing} ${
                      l.destacado ? "border-primary bg-card" : "border-border bg-card"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="relative grid w-[108px] shrink-0 place-items-center overflow-hidden rounded-[9px]"
                      style={{ aspectRatio: "16 / 10", background: "var(--sidebar)" }}
                    >
                      <Loop poster={l.poster} duracion={l.duracion} tamano={30} claro />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`${mono} block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground`}
                      >
                        {l.area}
                      </span>
                      <span
                        className="mt-1 block text-[12.5px] font-bold leading-snug"
                        style={{ textWrap: "pretty" }}
                      >
                        {l.titulo}
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="truncate text-[10.5px] text-muted-foreground">{l.autor}</span>
                        <span
                          className={`${mono} ml-auto inline-flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground`}
                        >
                          <Eye aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />
                          {l.vistas}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ══════════ 4 · LO QUE VIENE ══════════ */}
        <section aria-label="Lo que viene esta semana" className={`${card} px-5 pb-5 pt-5 sm:px-[22px]`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground"
            >
              <CalendarDays className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15.5px] font-bold leading-tight">Lo que viene esta semana</h3>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">{agenda.resumen}</p>
            </div>
            <span className="ml-auto flex items-center gap-2.5">
              {agenda.aviso && (
                <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                  <Clock aria-hidden className="h-3 w-3" strokeWidth={2} />
                  {agenda.aviso}
                </span>
              )}
              <a
                href="#"
                className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-semibold text-secondary no-underline transition-colors hover:bg-accent ${focusRing}`}
              >
                Mi calendario
                <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </a>
            </span>
          </div>

          {/* cinco columnas de día: lo que viene se lee de un barrido */}
          <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {agenda.dias.map((d) => (
              <div key={d.dd} className="flex min-w-0 flex-col gap-2.5">
                <div
                  className={`flex items-center gap-2 border-b-2 pb-2.5 ${
                    d.hoy ? "border-primary" : "border-border"
                  }`}
                >
                  <span
                    className={`${mono} text-[17px] font-extrabold leading-none ${
                      d.hoy ? "text-secondary" : "text-foreground"
                    }`}
                  >
                    {d.dd}
                  </span>
                  <span className="flex flex-col leading-[1.15]">
                    <span
                      className={`text-[10.5px] font-bold ${d.hoy ? "text-secondary" : "text-foreground"}`}
                    >
                      {d.nombre}
                    </span>
                    <span className={`${mono} text-[9.5px] text-muted-foreground`}>{d.mes}</span>
                  </span>
                  {d.hoy && (
                    <span className="ml-auto inline-flex h-[19px] items-center rounded-full bg-primary px-[7px] text-[9.5px] font-bold text-[color:var(--sidebar)]">
                      hoy
                    </span>
                  )}
                </div>

                {d.eventos.length > 0 ? (
                  d.eventos.map((ev) => {
                    const cfg = EVENTO[ev.tipo];
                    const Icono = cfg.icono;
                    const alerta = !!cfg.alerta;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onVerEvento(ev.id)}
                        className={`flex flex-col gap-1.5 rounded-[11px] border p-2.5 text-left transition-colors hover:border-primary ${focusRing} ${
                          alerta
                            ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                            : "border-border bg-card"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] ${
                              alerta
                                ? "bg-card text-[color:var(--warning-foreground)]"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            <Icono className="h-3 w-3" strokeWidth={1.75} />
                          </span>
                          <span
                            className={`whitespace-nowrap text-[9.5px] font-bold uppercase tracking-[0.06em] ${
                              alerta ? "text-[color:var(--warning-foreground)]" : "text-accent-foreground"
                            }`}
                          >
                            {cfg.etiqueta}
                          </span>
                          <span className={`${mono} ml-auto whitespace-nowrap text-[11px] font-bold`}>
                            {ev.hora}
                          </span>
                        </span>
                        <span className="text-[12px] font-semibold leading-snug" style={{ textWrap: "pretty" }}>
                          {ev.titulo}
                        </span>
                        <span className="truncate text-[10.5px] text-muted-foreground">
                          {ev.detalle}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[11px] border-[1.5px] border-dashed border-border px-2.5 py-4 text-center">
                    <span className="text-[11px] text-muted-foreground">Libre</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
