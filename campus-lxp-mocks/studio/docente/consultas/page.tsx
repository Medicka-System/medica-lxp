"use client";

/**
 * Studio · Consultas — canal directo alumno ↔ docente
 *
 * Distinta del FORO (discusión grupal cerrada de la lección) y del ATENEO (comunidad abierta):
 * aquí es 1:1, el alumno pregunta a SU docente.
 *
 * ECO es el asistente de la plataforma (el mismo en todo el campus). Aquí: redacta un borrador de
 * respuesta, resume hilos largos y detecta cuando varios alumnos preguntan lo mismo.
 * Eco asiste, el docente responde: el alumno recibe el mensaje del docente, nunca de la IA, salvo
 * que el docente apruebe y envíe el borrador.
 *
 * Un solo color de atención: ÁMBAR para lo que no ha respondido. El VIOLETA es la identidad de Eco,
 * no una alerta.
 *
 * Stubs: onAbrirConversacion · onResponder · onUsarSugerenciaEco · onEnlazarRecurso · onFiltrar ·
 *        onPedirBorradorEco · onResponderATodos · onLlevarAlForo
 */

import { useMemo, useState } from "react";
import {
  BookCopy,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Link2,
  MessageCircle,
  Paperclip,
  Pencil,
  Search,
  Send,
  Users,
  Video,
  X,
} from "lucide-react";
import { mono, kicker, softText, focusRing } from "@/components/tokens";
import { EcoMark } from "@/components/EcoMark";
import { Avatar } from "@/components/Avatar";


/* ───────────────────────────── Tipos ───────────────────────────── */

export type EstadoConsulta = "sin-responder" | "respondida";

export type Alumno = {
  id: string;
  ini: string;
  nombre: string;
  grupo: string;
  moduloEnCurso: string;
  horas: number;
};

export type Adjunto = { nombre: string; meta: string; tipo: "loop" | "imagen" | "archivo" };

export type Mensaje = {
  id: string;
  de: "alumno" | "docente";
  texto: string;
  hora: string;
  dia?: string;
  adjunto?: Adjunto;
  leido?: boolean;
};

export type Recurso = { clave: string; titulo: string; meta: string };

export type SugerenciaEco = {
  borrador: string;
  cita: string;
  resumen: string;
  metaHilo: string;
  patron?: {
    cuantos: number;
    inis: string[];
    texto: string;
  };
  recursos: Recurso[];
  ajustes: string[];
};

export type Conversacion = {
  id: string;
  alumno: Alumno;
  estado: EstadoConsulta;
  esperando?: string;
  ultimoMensaje: string;
  hora: string;
  mensajes: Mensaje[];
  eco: SugerenciaEco;
};

export type ConsultasData = {
  docente: { nombre: string };
  grupos: string[];
  conversaciones: Conversacion[];
  sinResponder: number;
};

const MOCK: ConsultasData = {
  docente: { nombre: "Dr. Sandoval" },
  grupos: ["Grupo B · Nov 2026", "Grupo A · Sep 2026", "Grupo POCUS · Oct 2026"],
  sinResponder: 5,
  conversaciones: [
    {
      id: "c1",
      alumno: { id: "u1", ini: "IT", nombre: "Dr. Iván Torres", grupo: "Grupo B · Nov 2026", moduloEnCurso: "M04 · L3", horas: 248 },
      estado: "sin-responder",
      esperando: "2 h",
      hora: "10:24",
      ultimoMensaje:
        "¿La cortical se mide en los dos polos o basta el medio? En mi caso no logro la ventana…",
      mensajes: [
        { id: "m1", de: "alumno", dia: "ayer", texto: "Doctor, buenas tardes. Estoy con el caso del riñón derecho de la lección 3 y no me queda claro dónde medir la cortical.", hora: "18:42" },
        { id: "m2", de: "docente", texto: "Buenas tardes, doctor. Mándeme el loop y lo vemos juntos.", hora: "19:10", leido: true },
        {
          id: "m3",
          de: "alumno",
          dia: "hoy",
          texto:
            "¿La cortical se mide en los dos polos o basta el medio? En mi caso no logro la ventana del polo inferior y me da 7.2 mm en el medio. Le dejo el loop.",
          hora: "10:24",
          adjunto: { nombre: "loop_rinon_der.dcm", meta: "4 s · de su bitácora", tipo: "loop" },
        },
      ],
      eco: {
        resumen:
          "Dónde medir la cortical cuando no hay ventana del polo inferior. Ya trae una medida (7.2 mm en el polo medio) y quiere saber si le basta para cerrar el grado.",
        metaHilo: "4 mensajes · 2 días · adjuntó 1 loop",
        borrador:
          "Doctor: mídala en los dos polos y en el mismo plano. Si la ventana no le da, cambie a un corte coronal por flanco y baje la ganancia — el borde cortical se define mejor. Con una sola medida en el polo medio el ángulo puede engañarlo, y ahí se le va el grado.",
        cita: "cita la lección 3 del módulo 4",
        patron: {
          cuantos: 5,
          inis: ["HC", "JG", "PN", "RS", "MP"],
          texto:
            "Todos del módulo 4 y todos por lo mismo: la medición de cortical. También fue la pregunta que más falló el grupo en la autoevaluación.",
        },
        recursos: [
          { clave: "M04 · L3", titulo: "Hidronefrosis: gradación y trampas", meta: "video · 18:40" },
          { clave: "Biblioteca", titulo: "Riñón poliquístico: conteo y medición", meta: "caso curado" },
          { clave: "M04 · L3", titulo: "Lectura: dónde se mide la cortical", meta: "lectura · 10 min" },
        ],
        ajustes: ["Hazla más breve", "Explícalo con un ejemplo", "¿Qué le contesté antes?"],
      },
    },
    {
      id: "c2",
      alumno: { id: "u2", ini: "HC", nombre: "Dr. Hugo Cuevas", grupo: "Grupo B · Nov 2026", moduloEnCurso: "M04 · L3", horas: 196 },
      estado: "sin-responder",
      hora: "09:58",
      ultimoMensaje: "Doctor, ¿por qué mi caso salió como quiste? Yo veía el cáliz dilatado.",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c3",
      alumno: { id: "u3", ini: "PN", nombre: "Dra. P. Navarro", grupo: "Grupo A · Sep 2026", moduloEnCurso: "M07 · L2", horas: 512 },
      estado: "sin-responder",
      hora: "ayer",
      ultimoMensaje: "¿Puedo entregar la tarea del módulo 7 el lunes? Estoy de guardia el fin.",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c4",
      alumno: { id: "u4", ini: "KM", nombre: "Dra. Karla Méndez", grupo: "Grupo B · Nov 2026", moduloEnCurso: "M04 · L4", horas: 264 },
      estado: "respondida",
      hora: "ayer",
      ultimoMensaje: "Gracias, con eso me queda claro. Subo el caso hoy mismo.",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c5",
      alumno: { id: "u5", ini: "JG", nombre: "Dr. Jorge Guzmán", grupo: "Grupo B · Nov 2026", moduloEnCurso: "M03 · L6", horas: 188 },
      estado: "respondida",
      hora: "lun",
      ultimoMensaje: "¿El informe estructurado que vimos aplica igual para vía biliar?",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c6",
      alumno: { id: "u6", ini: "RS", nombre: "Dra. Renata Salas", grupo: "Grupo POCUS · Oct 2026", moduloEnCurso: "M02 · L1", horas: 84 },
      estado: "sin-responder",
      hora: "lun",
      ultimoMensaje: "Le mandé el loop del Doppler, ¿lo pudo ver?",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c7",
      alumno: { id: "u7", ini: "LA", nombre: "Dr. Luis Arreola", grupo: "Grupo A · Sep 2026", moduloEnCurso: "M07 · L1", horas: 486 },
      estado: "respondida",
      hora: "vie",
      ultimoMensaje: "Listo, ya corregí la medición como me dijo.",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
  ],
};


/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Consultas({ data = MOCK }: { data?: ConsultasData }) {
  const { docente, conversaciones, sinResponder } = data;
  const [activaId, setActivaId] = useState(conversaciones[0].id);
  const [filtro, setFiltro] = useState<"sin-responder" | "todas">("sin-responder");
  const [busca, setBusca] = useState("");
  const [ecoAbierto, setEcoAbierto] = useState(true);
  const [verBorrador, setVerBorrador] = useState(false);
  const [respuesta, setRespuesta] = useState("");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirConversacion = (id: string) => {
    setActivaId(id);
    setVerBorrador(false);
    setRespuesta("");
  };
  const onResponder = (_id: string, _texto: string) => setRespuesta("");
  const onUsarSugerenciaEco = (_id: string, _texto: string) => {};
  const onEnlazarRecurso = (_r: Recurso) => {};
  const onFiltrar = (_f: string) => {};
  const onPedirBorradorEco = () => setVerBorrador(true);
  const onResponderATodos = () => {};
  const onLlevarAlForo = () => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conversaciones.filter(
      (c) =>
        (filtro === "todas" || c.estado === "sin-responder") &&
        (!q ||
          c.alumno.nombre.toLowerCase().includes(q) ||
          c.ultimoMensaje.toLowerCase().includes(q)),
    );
  }, [conversaciones, filtro, busca]);

  const activa = conversaciones.find((c) => c.id === activaId) ?? conversaciones[0];
  const eco = activa.eco;

  return (
    <div className="mx-auto flex h-[calc(100vh-60px)] w-full max-w-[1400px] gap-3.5 px-5 pb-5 pt-5">
      {/* ══════════ 1 · Lista de conversaciones ══════════ */}
      <aside className="flex w-[330px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <div className="shrink-0 border-b border-border p-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className={`${kicker} text-muted-foreground`}>Consultas</h2>
            {sinResponder > 0 && (
              <span className="inline-flex h-5 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-[7px] text-[10px] font-bold text-[color:var(--warning-foreground)]">
                {sinResponder} sin responder
              </span>
            )}
          </div>

          <label className="mt-2.5 flex h-[38px] items-center gap-2 rounded-[9px] border border-border bg-muted px-3 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno o tema</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alumno o tema…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="mt-2.5 flex gap-1.5">
            {(
              [
                ["sin-responder", "Sin responder"],
                ["todas", "Todas"],
              ] as const
            ).map(([id, etiqueta]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFiltro(id);
                  onFiltrar(id);
                }}
                aria-pressed={filtro === id}
                className={`h-8 flex-1 rounded-lg text-[11.5px] font-semibold transition-colors ${focusRing} ${
                  filtro === id
                    ? "bg-sidebar text-sidebar-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {etiqueta}
              </button>
            ))}
            <button
              type="button"
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold ${softText} ${focusRing}`}
            >
              Grupo
              <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibles.map((c) => {
            const on = c.id === activaId;
            const sin = c.estado === "sin-responder";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onAbrirConversacion(c.id)}
                aria-current={on ? "true" : undefined}
                className={`flex w-full gap-3 border-b border-l-[3px] border-b-border px-3.5 py-3.5 text-left transition-colors ${focusRing} ${
                  on
                    ? "border-l-primary bg-accent"
                    : `border-l-transparent hover:bg-muted ${sin ? "bg-[#fffdf7]" : ""}`
                }`}
              >
                <Avatar ini={c.alumno.ini} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold leading-snug">
                      {c.alumno.nombre}
                    </span>
                    <span className={`${mono} shrink-0 text-[10.5px] text-muted-foreground`}>
                      {c.hora}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-flex h-[18px] items-center whitespace-nowrap rounded-full border border-border bg-muted px-1.5 text-[9.5px] font-semibold ${softText}`}
                    >
                      {c.alumno.grupo.split(" · ")[0]}
                    </span>
                    <span className={`${mono} text-[9.5px] text-muted-foreground`}>
                      {c.alumno.moduloEnCurso}
                    </span>
                    {sin ? (
                      <span className="ml-auto inline-flex h-[18px] items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
                        Sin responder
                      </span>
                    ) : (
                      <Check aria-hidden className="ml-auto h-3.5 w-3.5 text-secondary" strokeWidth={2.6} />
                    )}
                  </span>
                  <span
                    className={`mt-1.5 line-clamp-2 block text-[12px] leading-snug ${softText} ${
                      sin ? "font-medium" : ""
                    }`}
                  >
                    {c.ultimoMensaje}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ══════════ 2 · Conversación ══════════ */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        {/* contexto del alumno, siempre visible */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-[18px] py-3.5">
          <Avatar ini={activa.alumno.ini} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-bold leading-tight">{activa.alumno.nombre}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {activa.alumno.grupo} · cursando{" "}
              <span className={`${mono} font-semibold text-[color:var(--foreground-soft)]`}>
                {activa.alumno.moduloEnCurso}
              </span>{" "}
              · {activa.alumno.horas} h acumuladas
            </p>
          </div>
          {activa.estado === "sin-responder" && (
            <span className="inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
              <Clock aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              Sin responder{activa.esperando ? ` · ${activa.esperando}` : ""}
            </span>
          )}
          <button
            type="button"
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Ver su expediente
            <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* hilo */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-[18px]">
          {activa.mensajes.map((m) => (
            <div key={m.id} className="flex shrink-0 flex-col gap-4">
              {m.dia && (
                <div className="flex shrink-0 items-center gap-2.5">
                  <span aria-hidden className="h-px flex-1 bg-border" />
                  <span className={`${mono} text-[10.5px] text-muted-foreground`}>{m.dia}</span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                </div>
              )}

              {m.de === "alumno" ? (
                <div className="flex max-w-[78%] shrink-0 gap-2.5">
                  <Avatar ini={activa.alumno.ini} size={30} />
                  <div className="min-w-0">
                    <p className="rounded-[14px] rounded-bl-[4px] border border-border bg-muted px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[color:var(--foreground-soft)]">
                      {m.texto}
                    </p>
                    {m.adjunto && (
                      <button
                        type="button"
                        className={`mt-1.5 flex items-center gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary ${focusRing}`}
                      >
                        <span
                          aria-hidden
                          className="grid h-[26px] w-[34px] shrink-0 place-items-center rounded-[5px] bg-sidebar"
                          style={{ color: "var(--hero-ink-muted)" }}
                        >
                          <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11.5px] font-semibold">{m.adjunto.nombre}</span>
                          <span className={`${mono} block text-[10px] text-muted-foreground`}>
                            {m.adjunto.meta}
                          </span>
                        </span>
                      </button>
                    )}
                    <span className={`${mono} mt-1 block text-[10.5px] text-muted-foreground`}>
                      {m.hora}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex shrink-0 justify-end">
                  <div className="min-w-0 max-w-[78%]">
                    <p className="rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13.5px] leading-relaxed text-sidebar-foreground">
                      {m.texto}
                    </p>
                    <span className={`${mono} mt-1 block text-right text-[10.5px] text-muted-foreground`}>
                      {m.hora}
                      {m.leido ? " · leído" : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Eco dentro del hilo: aviso o borrador desplegado */}
          {activa.estado === "sin-responder" && eco.borrador && !verBorrador && (
            <button
              type="button"
              onClick={onPedirBorradorEco}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-3 text-left transition-colors hover:bg-card ${focusRing}`}
            >
              <EcoMark size={28} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold text-[color:var(--info-foreground)]">
                  Eco tiene una respuesta lista para esta duda
                </span>
                <span className="mt-0.5 block text-[11.5px] text-[color:var(--info-foreground)]">
                  {eco.cita} · usted decide si se envía
                </span>
              </span>
              <span className="inline-flex h-[34px] shrink-0 items-center whitespace-nowrap rounded-[9px] bg-[color:var(--info-foreground)] px-3 text-[12px] font-bold text-white">
                Verla
              </span>
            </button>
          )}

          {activa.estado === "sin-responder" && eco.borrador && verBorrador && (
            <div className="shrink-0 overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card">
              <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-3.5 py-3">
                <EcoMark size={28} />
                <p className="min-w-0 flex-1 text-[12.5px] font-bold text-[color:var(--info-foreground)]">
                  Eco redactó una respuesta
                </p>
                <span className="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-card px-[7px] text-[9.5px] font-bold text-[color:var(--info-foreground)]">
                  Usted decide si se envía
                </span>
              </div>
              <div className="p-3.5">
                <p className={`text-[13px] leading-[1.7] ${softText}`}>{eco.borrador}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-border pt-3">
                  <span
                    className={`${mono} inline-flex items-center gap-1.5 text-[11px] text-muted-foreground`}
                  >
                    <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {eco.cita}
                  </span>
                  <span className="ml-auto flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUsarSugerenciaEco(activa.id, eco.borrador)}
                      className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-primary px-3.5 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                    >
                      <Check aria-hidden className="h-[15px] w-[15px]" strokeWidth={2.4} />
                      Usar y enviar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRespuesta(eco.borrador)}
                      className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                    >
                      <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Editarla
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerBorrador(false)}
                      className={`h-10 whitespace-nowrap rounded-[10px] px-3 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
                    >
                      Descartar
                    </button>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* responder: la autoría es del docente */}
        <div className="shrink-0 border-t border-border px-[18px] pb-4 pt-3.5">
          <div className="rounded-xl border border-border bg-muted px-3.5 py-3">
            <label>
              <span className="sr-only">Escriba su respuesta</span>
              <textarea
                rows={2}
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                placeholder="Escriba su respuesta…"
                className="w-full resize-none bg-transparent text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onEnlazarRecurso(eco.recursos[0])}
                className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                Enlazar lección o caso
              </button>
              <button
                type="button"
                aria-label="Adjuntar"
                className={`grid h-9 w-9 place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Paperclip aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={onPedirBorradorEco}
                className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[12px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
              >
                <EcoMark size={18} />
                Pedirle a Eco un borrador
              </button>
              <span className="ml-auto flex items-center gap-2.5">
                <span className={`${mono} text-[11px] text-muted-foreground`}>
                  responde como {docente.nombre}
                </span>
                <button
                  type="button"
                  onClick={() => onResponder(activa.id, respuesta)}
                  className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  Responder
                </button>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 3 · Eco ══════════ */}
      {ecoAbierto ? (
        <aside
          aria-label="Eco · asistente de la plataforma"
          className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
        >
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3.5">
            <EcoMark size={34} invertido />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold leading-tight">Eco</p>
              <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
                Asiste · usted responde
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEcoAbierto(false)}
              aria-label="Cerrar Eco"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
            >
              <X aria-hidden className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
            {/* resume el hilo largo */}
            <section className="rounded-xl border border-border bg-card p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--info-foreground)]">
                Qué está preguntando
              </p>
              <p className={`mt-2 text-[12.5px] leading-relaxed ${softText}`}>{eco.resumen}</p>
              <p className={`${mono} mt-2 text-[11px] text-muted-foreground`}>{eco.metaHilo}</p>
            </section>

            {/* detecta el patrón */}
            {eco.patron && (
              <section className="rounded-xl border border-border bg-card p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--info-foreground)]">
                  Lo mismo preguntaron otros
                </p>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <span className="flex pl-1.5" aria-hidden>
                    {eco.patron.inis.map((i) => (
                      <span
                        key={i}
                        className={`${mono} -ml-2 grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground`}
                      >
                        {i}
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 text-[12px] font-semibold">
                    {eco.patron.cuantos} alumnos esta semana
                  </span>
                </div>
                <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>{eco.patron.texto}</p>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={onResponderATodos}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-primary text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                  >
                    <Users aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    Responderles a los {eco.patron.cuantos}
                  </button>
                  <button
                    type="button"
                    onClick={onLlevarAlForo}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                  >
                    <MessageCircle aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    Llevarlo al foro del grupo
                  </button>
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  Si lo lleva al foro, cada uno recibe su respuesta y queda el hilo público para los
                  demás.
                </p>
              </section>
            )}

            {/* material para enlazar */}
            <section className="rounded-xl border border-border bg-card p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--info-foreground)]">
                Material que puede enlazar
              </p>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {eco.recursos.map((r) => (
                  <li key={r.titulo}>
                    <button
                      type="button"
                      onClick={() => onEnlazarRecurso(r)}
                      className={`flex w-full items-start gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2.5 text-left transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                    >
                      <BookCopy
                        aria-hidden
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`${mono} block text-[9.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground`}
                        >
                          {r.clave}
                        </span>
                        <span className="mt-0.5 block text-[12px] font-semibold leading-snug">
                          {r.titulo}
                        </span>
                        <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                          {r.meta}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="shrink-0 border-t border-border px-3.5 pb-3.5 pt-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {eco.ajustes.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`h-[30px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <form
              className="mt-2.5 flex h-[42px] items-center gap-2.5 rounded-full border border-border bg-muted px-3.5"
              onSubmit={(e) => e.preventDefault()}
            >
              <span className="sr-only">Pedirle algo a Eco</span>
              <input
                type="text"
                placeholder="Pídale algo a Eco…"
                className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Enviar"
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
              >
                <Send aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </form>
          </div>
        </aside>
      ) : (
        <aside
          aria-label="Eco"
          className="flex w-14 shrink-0 flex-col items-center gap-3 rounded-[14px] border border-[color:var(--info-border)] bg-card py-3.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
        >
          <button
            type="button"
            onClick={() => setEcoAbierto(true)}
            aria-label="Abrir Eco"
            className={`grid h-9 w-9 place-items-center rounded-[11px] bg-[color:var(--info-foreground)] text-white transition-colors hover:bg-sidebar ${focusRing}`}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
              <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
            </svg>
          </button>
          <span
            aria-hidden
            className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--info-foreground)]"
            style={{ writingMode: "vertical-rl" }}
          >
            Eco
          </span>
        </aside>
      )}
    </div>
  );
}
