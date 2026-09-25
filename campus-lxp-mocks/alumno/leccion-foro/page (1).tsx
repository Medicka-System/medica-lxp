"use client";

/**
 * Campus · Foro de la lección — experiencia del alumno
 *
 * Discusión CERRADA: es por grupo y por lección. El alumno solo ve lo de su grupo en esta lección,
 * a diferencia del Ateneo, que es la comunidad abierta de todo el campus.
 *
 * Tres estados en una sola pantalla:
 *   "entrada"  → instrucciones del diseñador + rúbrica + composer. Los posts de los compañeros
 *                están BLOQUEADOS: se ven velados, no se leen. Publicar primero es la regla, y se
 *                dice por qué ("así nadie escribe condicionado por lo que ya dijeron los demás").
 *   "listado"  → al publicar se desbloquea. Su post arriba, los del grupo debajo, y el composer
 *                DESAPARECE: cada quien publica una vez; de ahí en adelante participa respondiendo.
 *   "post"     → el post completo con su contenido rico, reacción y el hilo anidado a dos niveles.
 *
 * El composer es rico (formato, imagen, video, cita, HTML) y puede ir a pantalla completa, tanto
 * para el post como para las respuestas.
 *
 * Un solo color de atención: ÁMBAR, y solo para la publicación sin respuestas.
 *
 * Stubs: onPublicar · onGuardarBorrador · onAbrirPost · onResponder · onEditarPost ·
 *        onReaccionar · onExpandirComposer · onReportar
 */

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  Flag,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Lock,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Quote,
  Reply,
  Save,
  Send,
  Target,
  ThumbsUp,
  Users,
  Video,
} from "lucide-react";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoForo = "entrada" | "listado" | "post";

export type Autor = { ini: string; nombre: string; rol?: "Docente" | "Usted"; docente?: boolean };

export type CriterioRubrica = { criterio: string; descripcion: string; puntos: number };

export type Adjunto = { tipo: "imagen" | "loop"; cantidad: number };

export type PostForo = {
  id: string;
  autor: Autor;
  cuando: string;
  editado?: string;
  titulo: string;
  extracto: string;
  respuestas: number;
  vistas: number;
  adjuntos?: Adjunto;
  mio?: boolean;
};

/** El hilo se guarda plano y se anida por parentId: dos niveles, nunca más. */
export type Comentario = {
  id: string;
  parentId?: string;
  autor: Autor;
  cuando: string;
  texto: string;
  utiles: number;
  mio?: boolean;
};

export type BloqueContenido =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "cita"; texto: string; fuente: string }
  | { tipo: "media"; piezas: { etiqueta: string; badge: string; poster?: string }[]; pie: string };

export type PostCompleto = PostForo & {
  contenido: BloqueContenido[];
  utiles: number;
  miReaccion?: boolean;
  guardado?: boolean;
};

export type ForoData = {
  estado: EstadoForo;
  tema: {
    titulo: string;
    modulo: string;
    leccion: string;
    grupo: string;
    alumnos: number;
    cierra: string;
  };
  /** texto libre del diseñador instruccional: puede ser largo */
  instrucciones: string[];
  rubrica: { total: number; criterios: CriterioRubrica[] };
  yaPublico: boolean;
  respuestasPendientes: number;
  miPost?: PostForo;
  posts: PostForo[];
  postAbierto?: PostCompleto;
  hilo: Comentario[];
  yo: Autor;
};

const MOCK: ForoData = {
  estado: "entrada",
  tema: {
    titulo: "¿Qué los hace dudar entre grado II y III?",
    modulo: "Módulo 4",
    leccion: "Lección 3",
    grupo: "Grupo B",
    alumnos: 28,
    cierra: "30 sep",
  },
  instrucciones: [
    "La gradación de la hidronefrosis es el punto donde más se separan dos médicos mirando el mismo estudio. No es falta de conocimiento: es que cada quien fija el umbral en un lugar distinto cuando la imagen queda entre dos grados.",
    "Traiga a este foro un caso propio donde haya dudado entre grado II y III. Cuente qué vio, con qué se quedó y qué le habría hecho cambiar de opinión. Si puede, suba la imagen o el loop —aunque sea el que le salió mal, que es el que más enseña.",
    "Después lea a dos compañeros y respóndales con algo que puedan usar: una medida que no consideraron, una ventana alterna, una pregunta que los haga volver a la imagen. No busco consenso, busco que cada quien pueda defender su lectura.",
  ],
  rubrica: {
    total: 10,
    criterios: [
      { criterio: "Su caso está contado con datos", descripcion: "Edad, motivo, qué midió y con qué grado se quedó. Sin datos del paciente.", puntos: 4 },
      { criterio: "Argumenta la duda, no solo la reporta", descripcion: "Dice qué lo hizo dudar y qué lo habría hecho cambiar de opinión.", puntos: 3 },
      { criterio: "Responde a dos compañeros", descripcion: "Con algo aprovechable: una medida, una ventana, una pregunta.", puntos: 3 },
    ],
  },
  yaPublico: false,
  respuestasPendientes: 2,
  yo: { ini: "SR", nombre: "Dra. Sofía Ramírez", rol: "Usted" },
  miPost: {
    id: "mio",
    autor: { ini: "SR", nombre: "Dra. Sofía Ramírez", rol: "Usted" },
    cuando: "hoy 09:41",
    titulo: "El riñón que reporté como II y el residente leyó como III",
    extracto:
      "Mujer de 46, dolor lumbar de tres días. Los cálices se veían redondeados pero la cortical me dio 9.1 mm, así que me quedé en grado II. El residente que lo revisó conmigo dijo III por la forma de los cálices…",
    respuestas: 4,
    vistas: 18,
    adjuntos: { tipo: "imagen", cantidad: 2 },
    mio: true,
  },
  posts: [
    { id: "p1", autor: { ini: "AS", nombre: "Dr. Alejandro Sandoval", rol: "Docente", docente: true }, cuando: "ayer 18:02", titulo: "Antes de discutir grados: midan la cortical en dos polos", extracto: "Leí los primeros seis casos y en cinco la cortical viene de una sola medida. Ese es el origen de casi todas las dudas entre II y III que están describiendo. Les dejo la ventana que uso cuando el polo inferior no se deja…", respuestas: 9, vistas: 41, adjuntos: { tipo: "loop", cantidad: 1 } },
    { id: "p2", autor: { ini: "KM", nombre: "Dra. Karla Méndez" }, cuando: "ayer 20:15", titulo: "Dudé por el jet ureteral, no por la cortical", extracto: "Mi caso es distinto al de la mayoría: la cortical estaba clara en 8.4 mm, pero el jet del lado derecho no apareció en 20 minutos. ¿Eso mueve el grado o solo la sospecha de obstrucción?", respuestas: 6, vistas: 27, adjuntos: { tipo: "imagen", cantidad: 2 } },
    { id: "p3", autor: { ini: "HC", nombre: "Dr. Hugo Cuevas" }, cuando: "ayer 21:48", titulo: "Reporté III y el ultrasonido de control salió normal", extracto: "Me pasó hace dos semanas y todavía no lo entiendo del todo. Paciente con cólico, cálices redondeados, reporté grado III. Control a los cuatro días: riñón normal. Traigo los dos loops para que me digan qué se me fue.", respuestas: 7, vistas: 33, adjuntos: { tipo: "loop", cantidad: 2 } },
    { id: "p4", autor: { ini: "LA", nombre: "Dr. Luis Arreola" }, cuando: "hoy 07:30", titulo: "La pelvis extrarrenal me confundió dos veces", extracto: "Las dos veces que dudé fue con pelvis extrarrenal. Se ve dilatado, comunica, y uno se va a grado II sin pensar. Lo que me ayudó fue ver si los cálices también estaban redondeados o solo la pelvis.", respuestas: 3, vistas: 19, adjuntos: { tipo: "imagen", cantidad: 1 } },
    { id: "p5", autor: { ini: "PN", nombre: "Dra. P. Navarro" }, cuando: "hoy 08:12", titulo: "¿Alguien mide el diámetro AP de la pelvis?", extracto: "En la residencia nos enseñaron a medir el diámetro anteroposterior de la pelvis renal y decidir con eso. Aquí nadie lo ha mencionado y quiero saber si lo dejaron de usar o si simplemente no se acostumbra.", respuestas: 0, vistas: 11 },
  ],
  postAbierto: {
    id: "p3",
    autor: { ini: "HC", nombre: "Dr. Hugo Cuevas" },
    cuando: "ayer 21:48",
    editado: "hoy 07:05",
    titulo: "Reporté III y el ultrasonido de control salió normal",
    extracto: "",
    respuestas: 7,
    vistas: 33,
    utiles: 14,
    miReaccion: true,
    contenido: [
      { tipo: "parrafo", texto: "Me pasó hace dos semanas y todavía no lo entiendo del todo. Hombre de 52 años, cólico derecho de seis horas, llega a urgencias de madrugada. Cálices redondeados, seno ocupado, cortical que medí en 8.2 mm en el polo medio. Reporté grado III y lo mandé con urología." },
      { tipo: "parrafo", texto: "Control a los cuatro días: riñón normal, sin dilatación, cortical de 14 mm. El paciente había expulsado un lito de 3 mm esa misma noche." },
      {
        tipo: "media",
        piezas: [
          { etiqueta: "Primer estudio · madrugada", badge: "grado III" },
          { etiqueta: "Control · cuatro días después", badge: "normal" },
        ],
        pie: "Los dos loops del mismo riñón, con cuatro días de diferencia. El de la izquierda es el que reporté.",
      },
      { tipo: "parrafo", texto: "Mi duda es si el grado III estuvo mal puesto o si simplemente era una obstrucción aguda que se resolvió sola. ¿La gradación describe el momento o debería anticipar la evolución? Porque si es lo primero, mi reporte estaba bien y el control también." },
      { tipo: "cita", texto: "El grado describe lo que hay en la pantalla en ese momento, no un pronóstico.", fuente: "de la lectura del módulo 4" },
    ],
  },
  hilo: [
    { id: "c1", autor: { ini: "AS", nombre: "Dr. Alejandro Sandoval", rol: "Docente", docente: true }, cuando: "hoy 06:12", texto: "Su reporte estuvo bien puesto. El grado describe lo que hay en la pantalla en ese momento; no es un pronóstico. Lo que sí cambiaría es la medida: 8.2 mm en el polo medio, con obstrucción aguda de seis horas, suele ser edema más que adelgazamiento real. Mida los dos polos y verá que la diferencia no se sostiene.", utiles: 11 },
    { id: "c2", parentId: "c1", autor: { ini: "SR", nombre: "Dra. Sofía Ramírez", rol: "Usted" }, cuando: "hoy 08:20", texto: "¿Entonces en agudo la cortical no sirve para cerrar el grado? Me pasó algo parecido con una paciente de 46 y fue justo lo que me hizo dudar entre II y III.", utiles: 3, mio: true },
    { id: "c3", parentId: "c1", autor: { ini: "AS", nombre: "Dr. Alejandro Sandoval", rol: "Docente", docente: true }, cuando: "hoy 08:44", texto: "Sirve, pero con reserva en las primeras horas. Si el cuadro es agudo, apóyese en los cálices y en el jet; la cortical la valora bien en el control.", utiles: 6 },
    { id: "c4", autor: { ini: "KM", nombre: "Dra. Karla Méndez" }, cuando: "hoy 07:30", texto: "Lo del lito de 3 mm explica todo: expulsó y el sistema se descomprimió. A mí me tocó uno igual y el urólogo me dijo que el reporte le sirvió justamente porque documentó el momento agudo.", utiles: 5 },
    { id: "c5", autor: { ini: "LA", nombre: "Dr. Luis Arreola" }, cuando: "hoy 08:05", texto: "¿Puede subir el loop del control con Doppler? Me interesa ver si quedó alguna asimetría de flujo después de la expulsión.", utiles: 0 },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */

const mono = "font-mono tabular-nums";
const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.14em]";
const softText = "text-[color:var(--foreground-soft)]";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";
const trama =
  "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)";

function Avatar({ autor, size = 38 }: { autor: Autor; size?: number }) {
  return (
    <span className="relative shrink-0 self-start leading-none">
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        className="grid place-items-center rounded-full bg-sidebar font-bold text-sidebar-foreground"
      >
        {autor.ini}
      </span>
      {autor.docente && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-card bg-primary text-[color:var(--sidebar)]"
        >
          <Check className="h-2 w-2" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

function ChipRol({ rol }: { rol: "Docente" | "Usted" }) {
  return (
    <span
      className={`inline-flex h-[19px] items-center whitespace-nowrap rounded-full px-[7px] text-[9.5px] font-bold ${
        rol === "Usted" ? "bg-primary text-[color:var(--sidebar)]" : "bg-sidebar text-sidebar-foreground"
      }`}
    >
      {rol}
    </span>
  );
}

/** Editor rico reutilizable: mismo componente para el post y para las respuestas. */
function BarraEditor({
  compacto = false,
  onExpandir,
}: {
  compacto?: boolean;
  onExpandir: () => void;
}) {
  const alto = compacto ? "h-[30px]" : "h-8";
  const tam = compacto ? "h-3.5 w-3.5" : "h-[15px] w-[15px]";
  return (
    <div
      className={`flex flex-wrap items-center gap-[3px] border-b border-border bg-muted ${
        compacto ? "px-2 py-1.5" : "px-2.5 py-2"
      }`}
    >
      {[
        { label: "Negrita", Icono: Bold },
        { label: "Cursiva", Icono: Italic },
        { label: "Lista", Icono: List },
        { label: "Enlace", Icono: Link2 },
      ].map(({ label, Icono }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          className={`grid ${alto} ${compacto ? "w-[30px]" : "w-8"} place-items-center rounded-md ${softText} transition-colors hover:bg-card ${focusRing}`}
        >
          <Icono aria-hidden className={tam} strokeWidth={1.75} />
        </button>
      ))}

      <span aria-hidden className="mx-1.5 h-[18px] w-px bg-border" />

      {[
        { label: "Imagen", Icono: ImageIcon },
        { label: "Video", Icono: Video },
        { label: "Cita", Icono: Quote },
        { label: "HTML", Icono: Code2 },
      ].map(({ label, Icono }) => (
        <button
          key={label}
          type="button"
          className={`inline-flex ${alto} items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-semibold ${softText} transition-colors hover:bg-card hover:text-secondary ${focusRing}`}
        >
          <Icono aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          {label}
        </button>
      ))}

      <button
        type="button"
        onClick={onExpandir}
        className={`ml-auto inline-flex ${alto} items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
      >
        <Maximize2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
        Pantalla completa
      </button>
    </div>
  );
}

function BotonReportar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-[18px] inline-flex h-9 items-center gap-[7px] text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
    >
      <Flag aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
      Informar de un problema
    </button>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function ForoLeccion({ data = MOCK }: { data?: ForoData }) {
  const { tema, instrucciones, rubrica, respuestasPendientes, miPost, posts, postAbierto, hilo, yo } =
    data;
  const [estado, setEstado] = useState<EstadoForo>(data.estado);
  const [yaPublico, setYaPublico] = useState(data.yaPublico);
  const [orden, setOrden] = useState<"recientes" | "sin-responder" | "docente">("recientes");
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [respuesta, setRespuesta] = useState("");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onPublicar = () => {
    setYaPublico(true);
    setEstado("listado");
  };
  const onGuardarBorrador = () => {};
  const onAbrirPost = (_id: string) => setEstado("post");
  const onResponder = (_postId: string, _texto: string) => setRespuesta("");
  const onEditarPost = (_id: string) => {};
  const onReaccionar = (_id: string) => {};
  const onExpandirComposer = () => {};
  const onReportar = () => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    if (orden === "sin-responder") return posts.filter((p) => p.respuestas === 0);
    if (orden === "docente") return posts.filter((p) => p.autor.docente);
    return posts;
  }, [posts, orden]);

  /* Agregados DERIVADOS: nunca escritos a mano, para que no puedan desincronizarse de `posts`. */
  const totalPublicaciones = posts.length + (miPost ? 1 : 0);
  const totalRespuestas = useMemo(
    () => posts.reduce((s, p) => s + p.respuestas, 0) + (miPost?.respuestas ?? 0),
    [posts, miPost],
  );
  /* En el estado bloqueado, lo oculto es exactamente lo que hay. */
  const ocultos = posts.length;

  const raices = hilo.filter((c) => !c.parentId);
  const hijosDe = (id: string) => hilo.filter((c) => c.parentId === id);

  /* header navy de la card, igual en los tres estados */
  const HeaderCard = ({ extra }: { extra?: React.ReactNode }) => (
    <div className="relative overflow-hidden px-6 py-6 sm:px-[30px]" style={{ background: "var(--sidebar)" }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 150% at 88% 0%, rgba(26,136,128,.6) 0%, rgba(15,45,82,0) 62%)",
        }}
      />
      <div className="relative">
        <p className={`${kicker} inline-flex items-center gap-[7px] text-[11px]`} style={{ color: "#a8e0dc" }}>
          <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          Foro de la lección · {tema.grupo}
        </p>
        <h1
          className="mt-2.5 text-[26px] font-extrabold leading-[1.22] tracking-[-0.02em]"
          style={{ color: "var(--hero-ink)", textWrap: "pretty" }}
        >
          {tema.titulo}
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: "var(--hero-ink-muted)" }}>
          {tema.modulo} · {tema.leccion} · discusión cerrada de su grupo
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-[7px] text-[12.5px]" style={{ color: "var(--hero-ink-muted)" }}>
            <Users aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            {tema.grupo} · {tema.alumnos} alumnos
          </span>
          <span aria-hidden className="h-3.5 w-px bg-white/20" />
          <span className="inline-flex items-center gap-[7px] text-[12.5px]" style={{ color: "var(--hero-ink-muted)" }}>
            Abierto hasta el <span className={mono}>{tema.cierra}</span>
          </span>
          {extra}
        </div>
      </div>
    </div>
  );

  /* ══════════════════════ 3 · INTERIOR DEL POST ══════════════════════ */
  if (estado === "post" && postAbierto) {
    const p = postAbierto;
    /* posición del post dentro del listado completo, derivada: nunca un literal */
    const todos = miPost ? [miPost, ...posts] : posts;
    const indicePost = `${todos.findIndex((x) => x.id === p.id) + 1} de ${todos.length}`;
    return (
      <div className="mx-auto w-full max-w-[880px] px-5 py-7 sm:px-6 lg:px-8">
        <section
          aria-label="Publicación del foro"
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
        >
          {/* miga: volver al foro y moverse entre publicaciones */}
          <div className="flex flex-wrap items-center gap-3.5 border-b border-border px-6 py-4 sm:px-[30px]">
            <button
              type="button"
              onClick={() => setEstado("listado")}
              className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card pl-2.5 pr-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <ArrowLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
              Volver al foro
            </button>
            <span className="flex min-w-0 flex-col leading-[1.25]">
              <span className="truncate text-[12.5px] font-bold">{tema.titulo}</span>
              <span className="text-[11px] text-muted-foreground">
                Foro · {tema.modulo} · {tema.leccion} · {tema.grupo}
              </span>
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Publicación anterior"
                className={`grid h-10 w-10 place-items-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
              >
                <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <span className={`${mono} whitespace-nowrap text-[11.5px] text-muted-foreground`}>
                {indicePost}
              </span>
              <button
                type="button"
                aria-label="Publicación siguiente"
                className={`grid h-10 w-10 place-items-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
              >
                <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
            </span>
          </div>

          {/* el post completo */}
          <article className="px-6 pt-6 sm:px-[30px]">
            <div className="flex items-center gap-3.5">
              <Avatar autor={p.autor} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[14.5px] font-bold">{p.autor.nombre}</span>
                  <span
                    className={`inline-flex h-5 items-center rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold ${softText}`}
                  >
                    {tema.grupo}
                  </span>
                  {p.autor.rol && <ChipRol rol={p.autor.rol} />}
                </div>
                <p className={`${mono} mt-1 text-[11.5px] text-muted-foreground`}>
                  {p.cuando}
                  {p.editado ? ` · editado ${p.editado}` : ""}
                </p>
              </div>
              {p.mio ? (
                <button
                  type="button"
                  onClick={() => onEditarPost(p.id)}
                  className={`inline-flex h-9 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                >
                  <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Editar mi publicación
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Más opciones"
                  className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                >
                  <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              )}
            </div>

            <h2
              className="mt-[18px] text-[22px] font-extrabold leading-snug tracking-[-0.02em]"
              style={{ textWrap: "pretty" }}
            >
              {p.titulo}
            </h2>

            {/* contenido rico a medida de lectura */}
            <div className="mt-3.5 max-w-[66ch]">
              {p.contenido.map((b, i) => {
                if (b.tipo === "parrafo")
                  return (
                    <p
                      key={i}
                      className={`text-[15px] leading-[1.75] ${softText} ${i > 0 ? "mt-4" : ""}`}
                      style={{ textWrap: "pretty" }}
                    >
                      {b.texto}
                    </p>
                  );
                if (b.tipo === "cita")
                  return (
                    <blockquote
                      key={i}
                      className="mt-[18px] rounded-r-[11px] border-l-[3px] border-primary bg-accent px-[18px] py-3.5"
                    >
                      <p className="text-[14px] italic leading-[1.7] text-accent-foreground">
                        «{b.texto}» — {b.fuente}
                      </p>
                    </blockquote>
                  );
                return (
                  <figure key={i} className="mt-5">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {b.piezas.map((pz) => (
                        <button
                          key={pz.etiqueta}
                          type="button"
                          aria-label={`Reproducir ${pz.etiqueta}`}
                          className={`relative grid w-full place-items-center overflow-hidden rounded-[11px] p-0 ${focusRing}`}
                          style={{ aspectRatio: "4 / 3", background: "var(--sidebar)" }}
                        >
                          {pz.poster ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={pz.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          ) : (
                            <span aria-hidden className="absolute inset-0" style={{ background: trama }} />
                          )}
                          <span
                            aria-hidden
                            className="relative grid h-[42px] w-[42px] place-items-center rounded-full bg-white/[0.92] text-[color:var(--sidebar)]"
                          >
                            <Play className="h-[18px] w-[18px]" strokeWidth={2} />
                          </span>
                          <span
                            className={`${mono} absolute bottom-2 left-2 text-[9.5px] uppercase tracking-[0.12em]`}
                            style={{ color: "var(--hero-ink-muted)" }}
                          >
                            {pz.etiqueta}
                          </span>
                          <span
                            className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ background: "rgba(15,45,82,.85)" }}
                          >
                            {pz.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                    <figcaption className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {b.pie}
                    </figcaption>
                  </figure>
                );
              })}
            </div>

            {/* reacción */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-border pt-[18px]">
              <button
                type="button"
                onClick={() => onReaccionar(p.id)}
                aria-pressed={!!p.miReaccion}
                className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] border px-3.5 text-[13.5px] transition-colors ${focusRing} ${
                  p.miReaccion
                    ? "border-transparent bg-accent font-bold text-accent-foreground"
                    : `border-border bg-card font-semibold ${softText} hover:bg-muted`
                }`}
              >
                <ThumbsUp aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                Me es útil
                <span className={mono}>{p.utiles}</span>
              </button>
              <button
                type="button"
                className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] border border-border bg-card px-3.5 text-[13.5px] font-semibold ${softText} transition-colors hover:bg-muted ${focusRing}`}
              >
                <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                Responder
                <span className={`${mono} text-muted-foreground`}>{p.respuestas}</span>
              </button>
              <button
                type="button"
                aria-label="Guardar la publicación"
                aria-pressed={!!p.guardado}
                className={`grid h-11 w-11 place-items-center rounded-[11px] border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Bookmark aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <span className={`${mono} ml-auto whitespace-nowrap text-[11.5px] text-muted-foreground`}>
                {p.vistas} lo vieron
              </span>
            </div>
          </article>

          {/* hilo: dos niveles, la sangría la da un wrapper por rama */}
          <section className="px-6 pt-6 sm:px-[30px]">
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>{p.respuestas} respuestas</p>
              <span aria-hidden className="h-px flex-1 bg-border" />
              <button
                type="button"
                className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold ${softText} ${focusRing}`}
              >
                Más útiles primero
                <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>

            <ul className="mt-1.5">
              {raices.map((c) => {
                const hijos = hijosDe(c.id);
                return (
                  <li key={c.id}>
                    <Comentario c={c} onReaccionar={onReaccionar} />
                    {hijos.length > 0 && (
                      <ul className="ml-[26px] border-l-2 border-border pl-5">
                        {hijos.map((h) => (
                          <li key={h.id}>
                            <Comentario c={h} nivel={1} onReaccionar={onReaccionar} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* composer de respuesta */}
          <section className="px-6 pb-7 pt-5 sm:px-[30px]">
            <div className="flex gap-3.5">
              <Avatar autor={yo} size={36} />
              <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
                <BarraEditor compacto onExpandir={onExpandirComposer} />
                <div className="px-3.5 pb-3.5 pt-3">
                  <label>
                    <span className="sr-only">Su respuesta</span>
                    <textarea
                      rows={3}
                      value={respuesta}
                      onChange={(e) => setRespuesta(e.target.value)}
                      placeholder="Responda con algo que pueda usar: una medida, una ventana alterna, una pregunta que lo haga volver a la imagen."
                      className="w-full resize-none bg-transparent text-[14px] leading-[1.7] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted px-3.5 py-2.5">
                  <span className="text-[11.5px] text-muted-foreground">
                    Le faltan {respuestasPendientes} respuestas para completar la rúbrica
                  </span>
                  <button
                    type="button"
                    onClick={() => onResponder(p.id, respuesta)}
                    className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-[18px] text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                  >
                    <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    Responder
                  </button>
                </div>
              </div>
            </div>
            <BotonReportar onClick={onReportar} />
          </section>
        </section>
      </div>
    );
  }

  /* ══════════════════════ 1 y 2 · ENTRADA / LISTADO ══════════════════════ */
  return (
    <div className="mx-auto w-full max-w-[880px] px-5 py-7 sm:px-6 lg:px-8">
      <section
        aria-label="Foro de la lección"
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
      >
        <HeaderCard
          extra={
            yaPublico ? (
              <>
                <span aria-hidden className="h-3.5 w-px bg-white/20" />
                <span
                  className="inline-flex items-center gap-[7px] text-[12.5px]"
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {totalPublicaciones} publicaciones · {totalRespuestas} respuestas
                </span>
              </>
            ) : (
              <>
                <span aria-hidden className="h-3.5 w-px bg-white/20" />
                <span className="inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full bg-white/[0.14] px-2.5 text-[11.5px] font-bold text-white">
                  <Lock aria-hidden className="h-3 w-3" strokeWidth={2} />
                  {ocultos} posts esperando
                </span>
              </>
            )
          }
        />

        {/* ── ya publicó: el composer se fue y se dice por qué ── */}
        {yaPublico && (
          <div className="mx-6 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-primary bg-accent px-4 py-3.5 sm:mx-[30px]">
            <span
              aria-hidden
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-card text-accent-foreground"
            >
              <Check className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <p className={`min-w-[260px] flex-1 text-[13px] leading-relaxed ${softText}`}>
              <span className="font-bold text-foreground">Ya publicó su caso.</span> Cada quien publica
              una vez: de aquí en adelante participa respondiendo a sus compañeros — le faltan{" "}
              <span className="font-bold text-foreground">{respuestasPendientes} respuestas</span> para
              completar la rúbrica.
            </p>
            <button
              type="button"
              className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] bg-card px-3 text-[12.5px] font-semibold text-accent-foreground ${focusRing}`}
            >
              Ver la rúbrica
            </button>
          </div>
        )}

        {/* ── instrucciones del diseñador: texto libre, medida de lectura ── */}
        {!yaPublico && (
          <section className="px-6 pt-6 sm:px-[30px]">
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} text-muted-foreground`}>Lo que pide el docente</p>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-3.5 max-w-[66ch]">
              {instrucciones.map((t, i) => (
                <p
                  key={i}
                  className={`text-[15px] leading-[1.75] ${softText} ${i > 0 ? "mt-3.5" : ""}`}
                  style={{ textWrap: "pretty" }}
                >
                  {t}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* ── rúbrica: saber cómo se evalúa antes de escribir ── */}
        {!yaPublico && (
          <section className="px-6 pt-5 sm:px-[30px]">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2.5 bg-muted px-3.5 py-3.5">
                <p className="min-w-0 flex-1 text-[12.5px] font-bold">
                  Cómo se evalúa su participación
                </p>
                <span
                  className={`${mono} inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-bold text-muted-foreground`}
                >
                  {rubrica.total} pts
                </span>
              </div>
              <ul>
                {rubrica.criterios.map((c) => (
                  <li key={c.criterio} className="flex items-start gap-3 border-t border-border px-3.5 py-3.5">
                    <span
                      aria-hidden
                      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"
                    >
                      <Target className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold">{c.criterio}</span>
                      <span className={`mt-1 block text-[12.5px] leading-relaxed ${softText}`}>
                        {c.descripcion}
                      </span>
                    </span>
                    <span
                      className={`${mono} shrink-0 whitespace-nowrap text-[12.5px] font-bold text-muted-foreground`}
                    >
                      {c.puntos} pts
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── composer del post: solo antes de publicar ── */}
        {!yaPublico && (
          <section className="px-6 pt-5 sm:px-[30px]">
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} text-secondary`}>Su publicación</p>
              <span aria-hidden className="h-px flex-1 bg-border" />
              <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">
                se publica con su nombre ante el {tema.grupo}
              </span>
            </div>

            <div className="mt-3.5 flex gap-3.5">
              <Avatar autor={yo} size={36} />
              <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
                <BarraEditor onExpandir={onExpandirComposer} />
                <div className="px-4 pb-4 pt-3.5">
                  <label>
                    <span className="sr-only">Título de su caso</span>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Un título para su caso…"
                      className="w-full bg-transparent text-[16px] font-bold text-foreground outline-none placeholder:font-bold placeholder:text-muted-foreground"
                    />
                  </label>
                  <div aria-hidden className="my-3 h-px bg-border" />
                  <label>
                    <span className="sr-only">Cuerpo de su publicación</span>
                    <textarea
                      rows={7}
                      value={cuerpo}
                      onChange={(e) => setCuerpo(e.target.value)}
                      placeholder="Cuente el caso: qué vio, qué midió, con qué grado se quedó y qué lo hizo dudar. Puede pegar imágenes o el loop directamente aquí."
                      className="w-full resize-none bg-transparent text-[14.5px] leading-[1.7] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted px-4 py-3">
                  <span className="inline-flex items-center gap-[7px] text-[11.5px] text-muted-foreground">
                    <BookOpen aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Sin datos que identifiquen al paciente
                  </span>
                  <span className="ml-auto flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={onGuardarBorrador}
                      className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                    >
                      <Save aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      Guardar borrador
                    </button>
                    <button
                      type="button"
                      onClick={onPublicar}
                      className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                    >
                      Publicar y ver el foro
                      <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── el muro bloqueado: se ve que hay algo, no se lee qué ── */}
        {!yaPublico && (
          <section className="px-6 pb-7 pt-6 sm:px-[30px]">
            <div className="relative overflow-hidden rounded-[14px] border-[1.5px] border-dashed border-[color:var(--track)] bg-muted p-[18px]">
              <div aria-hidden className="flex flex-col gap-2.5 opacity-[0.55] blur-[2.5px]">
                {[148, 186, 132].map((w, i) => (
                  <div key={w} className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
                    <span className="h-[34px] w-[34px] shrink-0 rounded-full bg-[color:var(--track)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block h-[11px] rounded-full bg-[color:var(--track)]" style={{ width: w }} />
                      <span className="mt-2.5 block h-[9px] w-full rounded-full bg-[color:var(--track)] opacity-60" />
                      <span
                        className="mt-[7px] block h-[9px] rounded-full bg-[color:var(--track)] opacity-60"
                        style={{ width: `${[72, 54, 84][i]}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="absolute inset-0 grid place-items-center p-5"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(248,249,250,.55) 0%, rgba(248,249,250,.94) 46%)",
                }}
              >
                <div className="max-w-[52ch] text-center">
                  <span
                    aria-hidden
                    className="inline-grid h-[46px] w-[46px] place-items-center rounded-full border border-border bg-card text-accent-foreground"
                  >
                    <Lock className="h-[21px] w-[21px]" strokeWidth={1.75} />
                  </span>
                  <p className="mt-3 text-[16px] font-bold leading-snug">
                    Sus {ocultos} compañeros ya publicaron
                  </p>
                  <p className={`mt-2 text-[13px] leading-relaxed ${softText}`}>
                    Al publicar el suyo se abre el foro y podrá leerlos. Así nadie escribe
                    condicionado por lo que ya dijeron los demás.
                  </p>
                </div>
              </div>
            </div>
            <BotonReportar onClick={onReportar} />
          </section>
        )}

        {/* ── su post publicado ── */}
        {yaPublico && miPost && (
          <section className="px-6 pt-5 sm:px-[30px]">
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} text-secondary`}>Su publicación</p>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>
            <article className="mt-3.5 flex gap-3.5 rounded-xl border-[1.5px] border-primary bg-accent p-4">
              <Avatar autor={miPost.autor} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[13.5px] font-bold">{miPost.autor.nombre}</span>
                  <ChipRol rol="Usted" />
                  <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
                    {miPost.cuando}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onAbrirPost(miPost.id)}
                  className={`mt-2.5 block w-full text-left text-[15px] font-bold leading-snug ${focusRing}`}
                  style={{ textWrap: "pretty" }}
                >
                  {miPost.titulo}
                </button>
                <p className={`mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed ${softText}`}>
                  {miPost.extracto}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3.5">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-foreground">
                    <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {miPost.respuestas} respuestas
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Eye aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {miPost.vistas} lo vieron
                  </span>
                  {miPost.adjuntos && (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      {miPost.adjuntos.tipo === "loop" ? (
                        <Video aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                      ) : (
                        <ImageIcon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                      )}
                      {miPost.adjuntos.cantidad}{" "}
                      {miPost.adjuntos.tipo === "loop" ? "loops" : "imágenes"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onEditarPost(miPost.id)}
                    className={`ml-auto inline-flex h-9 items-center gap-[7px] whitespace-nowrap rounded-[9px] bg-card px-3 text-[12.5px] font-semibold text-accent-foreground ${focusRing}`}
                  >
                    <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Editar
                  </button>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* ── listado del grupo ── */}
        {yaPublico && (
          <section className="px-6 pb-7 pt-6 sm:px-[30px]">
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>Lo que escribió su grupo</p>
              <span className={`${mono} text-[12px] text-muted-foreground`}>
                {posts.length} publicaciones
              </span>
              <div className="ml-auto flex gap-[3px] rounded-full border border-border bg-muted p-[3px]">
                {(
                  [
                    ["recientes", "Recientes"],
                    ["sin-responder", "Sin responder"],
                    ["docente", "Del docente"],
                  ] as const
                ).map(([id, etiqueta]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOrden(id)}
                    aria-pressed={orden === id}
                    className={`h-[30px] whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                      orden === id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-3.5 flex flex-col gap-2.5">
              {visibles.map((p) => {
                const sinResp = p.respuestas === 0;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirPost(p.id)}
                      className={`flex w-full gap-3.5 rounded-xl border p-4 text-left transition-colors hover:border-primary ${focusRing} ${
                        sinResp
                          ? "border-[color:var(--warning-border)] bg-[#fffdf7]"
                          : "border-border bg-card"
                      }`}
                    >
                      <Avatar autor={p.autor} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[13.5px] font-bold">{p.autor.nombre}</span>
                          {p.autor.rol && <ChipRol rol={p.autor.rol} />}
                          {sinResp && (
                            <span className="inline-flex h-5 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                              Sin respuestas
                            </span>
                          )}
                          <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
                            {p.cuando}
                          </span>
                        </span>
                        <span
                          className="mt-2.5 block text-[15px] font-bold leading-snug"
                          style={{ textWrap: "pretty" }}
                        >
                          {p.titulo}
                        </span>
                        <span className={`mt-1.5 line-clamp-2 block text-[13.5px] leading-relaxed ${softText}`}>
                          {p.extracto}
                        </span>
                        <span className="mt-3 flex flex-wrap items-center gap-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${
                              p.respuestas ? "text-secondary" : "text-muted-foreground"
                            }`}
                          >
                            <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {p.respuestas} {p.respuestas === 1 ? "respuesta" : "respuestas"}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <Eye aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {p.vistas} lo vieron
                          </span>
                          {p.adjuntos && (
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                              {p.adjuntos.tipo === "loop" ? (
                                <Video aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                              ) : (
                                <ImageIcon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                              )}
                              {p.adjuntos.cantidad}{" "}
                              {p.adjuntos.tipo === "loop"
                                ? p.adjuntos.cantidad === 1
                                  ? "loop"
                                  : "loops"
                                : p.adjuntos.cantidad === 1
                                  ? "imagen"
                                  : "imágenes"}
                            </span>
                          )}
                          <ChevronRight
                            aria-hidden
                            className="ml-auto h-4 w-4 text-[color:var(--track)]"
                            strokeWidth={2}
                          />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {visibles.length === 0 && (
              <div className="mt-3.5 rounded-xl border border-border bg-card px-6 py-10 text-center">
                <p className="text-[14.5px] font-bold">Nada con ese filtro</p>
                <p className={`mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed ${softText}`}>
                  Vuelva a «Recientes» para ver las {posts.length} publicaciones del grupo.
                </p>
              </div>
            )}

            <BotonReportar onClick={onReportar} />
          </section>
        )}
      </section>
    </div>
  );
}

/* ───────────────────── Comentario del hilo ───────────────────── */

function Comentario({
  c,
  nivel = 0,
  onReaccionar,
}: {
  c: Comentario;
  nivel?: number;
  onReaccionar: (id: string) => void;
}) {
  return (
    <div className={`flex gap-3 ${nivel ? "pt-3.5" : "pt-4"}`}>
      <Avatar autor={c.autor} size={nivel ? 32 : 36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-bold">{c.autor.nombre}</span>
          {c.autor.rol && <ChipRol rol={c.autor.rol} />}
          <span className={`${mono} ml-auto text-[10.5px] text-muted-foreground`}>{c.cuando}</span>
        </div>
        <p
          className={`mt-1.5 text-[13.5px] leading-[1.65] ${softText}`}
          style={{ textWrap: "pretty" }}
        >
          {c.texto}
        </p>
        <div className="mt-2 flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => onReaccionar(c.id)}
            className={`inline-flex h-8 items-center gap-1.5 text-[12px] font-semibold transition-colors hover:text-secondary ${focusRing} ${
              c.utiles ? "text-secondary" : "text-muted-foreground"
            }`}
          >
            <ThumbsUp aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            Me es útil
            {c.utiles > 0 && <span className={mono}>{c.utiles}</span>}
          </button>
          <button
            type="button"
            className={`inline-flex h-8 items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-secondary ${focusRing}`}
          >
            <Reply aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            Responder
          </button>
          {c.mio && (
            <button
              type="button"
              className={`h-8 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
            >
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
