"use client";

/**
 * Studio · Home del diseñador instruccional — Médica Capacitación
 *
 * Home de colaborador: informa en un barrido y deja el ancho para el trabajo. Cuatro piezas, sin
 * gráficas: dos KPI (Programas · Grupos abiertos) y dos widgets del mismo peso (Noticias del campo
 * y pulso del Ateneo). Vive dentro de app/(studio)/layout.tsx — el Studio NO tiene lateral.
 *
 * El feed de noticias es PLACEHOLDER: la fuente real se define después (chip "Fuente por definir").
 * El Ateneo es la comunidad abierta —todos los grupos y roles—, no un foro de grupo: cada renglón
 * entra al post.
 *
 * Stubs: onAbrirPost · onIrAPrograma · onVerNoticia
 */

import {
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type Kpi = {
  rotulo: string;
  valor: number;
  unidad: string;
  contexto: string;
  desglose: { etiqueta: string; valor: number; tono?: "neutro" | "teal" | "warning" }[];
  cta: string;
  destino: string;
};

export type Noticia = {
  id: string;
  titulo: string;
  fuente: string;
  tag: string;
  cuando: string;
  url: string;
};

export type TipoPost = "caso" | "encuesta" | "anuncio";

export type PostAteneo = {
  id: string;
  autor: string;
  iniciales: string;
  rol: string;
  tipo: TipoPost;
  titulo: string;
  actividad: string;
  cuando: string;
};

export type StudioHomeData = {
  saludo: { nombre: string; fecha: string; ultimoAcceso: string };
  kpis: [Kpi, Kpi];
  noticias: Noticia[];
  /** Mientras no se conecte la fuente real del feed. */
  fuentePendiente?: boolean;
  posts: PostAteneo[];
  activosHoy?: number;
};

const MOCK: StudioHomeData = {
  saludo: {
    nombre: "Mariana",
    fecha: "lunes 16 de noviembre",
    ultimoAcceso: "viernes 14:32",
  },
  kpis: [
    {
      rotulo: "Programas",
      valor: 11,
      unidad: "programas base",
      contexto: "Los 11 programas de la escuela, con temario en el Studio.",
      desglose: [
        { etiqueta: "publicados", valor: 9 },
        { etiqueta: "en borrador", valor: 2, tono: "warning" },
      ],
      cta: "Ir a Programas",
      destino: "/studio/programas",
    },
    {
      rotulo: "Grupos abiertos",
      valor: 8,
      unidad: "grupos activos",
      contexto: "Cursando ahora mismo, entre síncronos y asíncronos.",
      desglose: [
        { etiqueta: "síncronos", valor: 5 },
        { etiqueta: "asíncronos", valor: 3, tono: "teal" },
      ],
      cta: "Ir a Grupos",
      destino: "/studio/grupos",
    },
  ],
  fuentePendiente: true,
  noticias: [
    {
      id: "n1",
      titulo: "xAPI Profile for clinical simulation reaches public review",
      fuente: "ADL Initiative",
      tag: "Estándares",
      cuando: "hace 2 días",
      url: "#",
    },
    {
      id: "n2",
      titulo: "Cognitive load in procedural video: what the 2026 meta-analysis changes",
      fuente: "Journal of Medical Education",
      tag: "Investigación",
      cuando: "hace 4 días",
      url: "#",
    },
    {
      id: "n3",
      titulo: "LXD in practice: designing for the interrupted learner",
      fuente: "Learning Experience Design Weekly",
      tag: "LXD",
      cuando: "hace 5 días",
      url: "#",
    },
    {
      id: "n4",
      titulo: "SCORM sigue vivo: cómo migrar cursos heredados a xAPI sin perder histórico",
      fuente: "eLearning Industry",
      tag: "Herramientas",
      cuando: "hace 1 semana",
      url: "#",
    },
    {
      id: "n5",
      titulo: "Assessment design for competency-based medical curricula",
      fuente: "AMEE Guide",
      tag: "Evaluación",
      cuando: "hace 1 semana",
      url: "#",
    },
  ],
  activosHoy: 42,
  posts: [
    {
      id: "p1",
      autor: "Dr. Iván Torres",
      iniciales: "IT",
      rol: "Alumno · Grupo 14",
      tipo: "caso",
      titulo: "¿Esta asimetría cortical es crónica o me está ganando el ángulo?",
      actividad: "7 comentarios · 2 diagnósticos",
      cuando: "hace 2 h",
    },
    {
      id: "p2",
      autor: "Dra. Karla Lugo",
      iniciales: "KL",
      rol: "Docente · Urgencias",
      tipo: "anuncio",
      titulo: "Sesión extra de casos renales el jueves 19:00, abierta a todos los grupos",
      actividad: "18 interesados",
      cuando: "hace 5 h",
    },
    {
      id: "p3",
      autor: "Dra. Karla Méndez",
      iniciales: "KM",
      rol: "Alumna · Grupo 12",
      tipo: "encuesta",
      titulo: "¿Qué preset usan de entrada para riñón en portátiles?",
      actividad: "86 votos · 14 comentarios",
      cuando: "hace 6 h",
    },
    {
      id: "p4",
      autor: "Mariana Villanueva",
      iniciales: "MV",
      rol: "Diseño instruccional",
      tipo: "anuncio",
      titulo: "Nueva plantilla de lección con punto de control al cierre",
      actividad: "4 comentarios",
      cuando: "ayer",
    },
    {
      id: "p5",
      autor: "Dr. Hugo Cuevas",
      iniciales: "HC",
      rol: "Alumno · Grupo 11",
      tipo: "caso",
      titulo: "Jet ureteral ausente en dos exploraciones: ¿reporto obstrucción?",
      actividad: "11 comentarios · validado",
      cuando: "ayer",
    },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ETIQUETA_TIPO: Record<TipoPost, { texto: string; clase: string }> = {
  caso: { texto: "Caso clínico", clase: "bg-accent text-accent-foreground" },
  encuesta: {
    texto: "Encuesta",
    clase:
      "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  },
  anuncio: {
    texto: "Anuncio",
    clase:
      "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  },
};

function TarjetaKpi({ kpi, onIr }: { kpi: Kpi; onIr: (destino: string) => void }) {
  return (
    <article className={`${card} flex flex-col p-5`}>
      <div className="flex items-center gap-2.5">
        <p className={`${kicker} text-muted-foreground`}>{kpi.rotulo}</p>
        <button
          type="button"
          onClick={() => onIr(kpi.destino)}
          className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
        >
          {kpi.cta}
          <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className={`${mono} text-[52px] font-extrabold leading-none tracking-[-0.03em]`}>
          {kpi.valor}
        </span>
        <span className={`text-[13.5px] font-semibold ${softText}`}>{kpi.unidad}</span>
      </div>
      <p className={`mt-2.5 text-[13px] leading-relaxed ${softText}`}>{kpi.contexto}</p>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        {kpi.desglose.map((d) => (
          <span
            key={d.etiqueta}
            className={`inline-flex h-[30px] items-center gap-[7px] rounded-full px-3 text-[12px] font-semibold ${
              d.tono === "warning"
                ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
                : d.tono === "teal"
                  ? "bg-accent text-accent-foreground"
                  : `bg-muted ${softText}`
            }`}
          >
            <span className={`${mono} font-bold`}>{d.valor}</span>
            {d.etiqueta}
          </span>
        ))}
      </div>
    </article>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function StudioHome({ data = MOCK }: { data?: StudioHomeData }) {
  const { saludo, kpis, noticias, fuentePendiente, posts, activosHoy } = data;
  const inicial = noticias.length === 0 && posts.length === 0 && kpis[0].valor === 0;

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirPost = (_id: string) => {};
  const onIrAPrograma = (_destino: string) => {};
  const onVerNoticia = (_url: string) => {};
  /* ──────────────────────────────────────────────────────── */

  /* ── Estado inicial discreto: los KPI en cero traen su acción ── */
  if (inicial) {
    return (
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-8 pt-6">
        <div>
          <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em]">
            Bienvenida al Studio, {saludo.nombre}
          </h1>
          <p className={`mt-1.5 text-[13.5px] ${softText}`}>
            Aquí construye los programas del campus. Empiece por el primero.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {[
            {
              rotulo: "Programas",
              unidad: "programas",
              texto: "Cree el primer programa y su temario para que el campus tenga contenido.",
              cta: "Crear un programa",
            },
            {
              rotulo: "Grupos abiertos",
              unidad: "grupos",
              texto: "Los grupos se abren cuando un programa ya tiene módulos publicados.",
              cta: "Ver cómo abrir un grupo",
            },
          ].map((k) => (
            <article
              key={k.rotulo}
              className="flex flex-col rounded-xl border border-dashed border-[color:var(--track)] bg-card p-5"
            >
              <p className={`${kicker} text-muted-foreground`}>{k.rotulo}</p>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span
                  className={`${mono} text-[52px] font-extrabold leading-none tracking-[-0.03em] text-muted-foreground`}
                >
                  0
                </span>
                <span className="text-[13.5px] font-semibold text-muted-foreground">
                  {k.unidad}
                </span>
              </div>
              <p className={`mt-2.5 text-[13px] leading-relaxed ${softText}`}>{k.texto}</p>
              <button
                type="button"
                className={`mt-4 h-10 self-start rounded-[9px] bg-primary px-3.5 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                {k.cta}
              </button>
            </article>
          ))}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          {[
            {
              titulo: "Noticias y actualidad",
              texto:
                "Conectaremos aquí el feed de diseño instruccional, e-learning y estándares. La fuente se define en la configuración del Studio.",
              cta: "Elegir fuentes",
            },
            {
              titulo: "Ateneo · últimos posts",
              texto:
                "Cuando la comunidad empiece a publicar casos, encuestas y anuncios, los verá aquí y podrá entrar directo al post.",
              cta: "Abrir el Ateneo",
            },
          ].map((w) => (
            <section key={w.titulo} className={`${card} px-6 py-8 text-center`}>
              <p className="text-[15px] font-bold">{w.titulo}</p>
              <p className={`mx-auto mt-2 max-w-[42ch] text-[13px] leading-relaxed ${softText}`}>
                {w.texto}
              </p>
              <button
                type="button"
                className={`mt-4 h-10 rounded-[9px] border border-border bg-card px-4 text-[13px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
              >
                {w.cta}
              </button>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-8 pb-8 pt-6">
      {/* ───── Saludo compacto ───── */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em]">
            Buen día, {saludo.nombre}
          </h1>
          <p className={`mt-1.5 text-[13.5px] ${softText}`}>
            Su banco de trabajo del Studio · {saludo.fecha}
          </p>
        </div>
        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          último acceso: {saludo.ultimoAcceso}
        </span>
      </div>

      {/* ───── KPIs ───── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {kpis.map((k) => (
          <TarjetaKpi key={k.rotulo} kpi={k} onIr={onIrAPrograma} />
        ))}
      </div>

      {/* ───── Widgets: noticias + pulso del Ateneo ───── */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* noticias del campo */}
        <section className={`${card} flex flex-col overflow-hidden`}>
          <div className="flex items-center gap-2.5 border-b border-border p-5">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold tracking-[-0.01em]">Noticias y actualidad</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Diseño instruccional, e-learning y estándares · fuentes mixtas
              </p>
            </div>
            <span className="ml-auto flex items-center gap-1.5">
              {fuentePendiente && (
                <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[10.5px] font-semibold text-[color:var(--info-foreground)]">
                  Fuente por definir
                </span>
              )}
              <button
                type="button"
                aria-label="Actualizar el feed"
                className={`grid h-9 w-9 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <RefreshCw aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </span>
          </div>

          <ul className="flex-1 p-1.5">
            {noticias.map((n, i) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onVerNoticia(n.url)}
                  className={`flex w-full gap-3 rounded-[10px] px-3.5 ${
                    i === 0 ? "py-3.5" : "py-3"
                  } text-left transition-colors hover:bg-muted ${focusRing}`}
                >
                  <span
                    aria-hidden
                    className={`w-1 shrink-0 self-stretch rounded-full ${
                      i === 0 ? "bg-primary" : "bg-transparent"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block leading-snug ${
                        i === 0 ? "text-[14.5px] font-bold" : "text-[13.5px] font-semibold"
                      }`}
                      style={{ textWrap: "pretty" }}
                    >
                      {n.titulo}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-[22px] items-center rounded-full bg-accent px-2 text-[10.5px] font-semibold text-accent-foreground">
                        {n.tag}
                      </span>
                      <span className={`text-[11.5px] ${softText}`}>{n.fuente}</span>
                      <span className={`${mono} text-[11px] text-muted-foreground`}>{n.cuando}</span>
                    </span>
                  </span>
                  <ExternalLink
                    aria-hidden
                    className="mt-0.5 h-[15px] w-[15px] shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-border bg-muted px-5 py-3">
            <button
              type="button"
              className={`text-[12.5px] font-semibold text-secondary ${focusRing}`}
            >
              Ver todas las noticias
            </button>
          </div>
        </section>

        {/* pulso del Ateneo */}
        <section className={`${card} flex flex-col overflow-hidden`}>
          <div className="flex items-center gap-2.5 border-b border-border p-5">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold tracking-[-0.01em]">Ateneo · últimos posts</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Comunidad abierta: todos los grupos y roles
              </p>
            </div>
            {activosHoy !== undefined && (
              <span className="ml-auto inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
                <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-primary" />
                {activosHoy} activos hoy
              </span>
            )}
          </div>

          <ul className="flex-1 p-1.5">
            {posts.map((p, i) => {
              const t = ETIQUETA_TIPO[p.tipo];
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onAbrirPost(p.id)}
                    className={`flex w-full gap-3 rounded-[10px] px-3.5 ${
                      i === 0 ? "py-3.5" : "py-3"
                    } text-left transition-colors hover:bg-muted ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-sidebar text-[11.5px] font-bold text-sidebar-foreground"
                    >
                      {p.iniciales}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[12.5px] font-bold">{p.autor}</span>
                        <span className="text-[11px] text-muted-foreground">{p.rol}</span>
                        <span
                          className={`inline-flex h-[21px] items-center rounded-full px-2 text-[10.5px] font-semibold ${t.clase}`}
                        >
                          {t.texto}
                        </span>
                      </span>
                      <span
                        className={`mt-1 block leading-snug ${
                          i === 0 ? "text-[14px] font-bold" : "text-[13px] font-semibold"
                        }`}
                        style={{ textWrap: "pretty" }}
                      >
                        {p.titulo}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className={`${mono} text-[11px] text-muted-foreground`}>
                          {p.actividad}
                        </span>
                        <span className={`${mono} text-[11px] text-muted-foreground`}>
                          · {p.cuando}
                        </span>
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="mt-2 h-[15px] w-[15px] shrink-0 text-muted-foreground"
                      strokeWidth={2}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border bg-muted px-5 py-3">
            <button
              type="button"
              className={`text-[12.5px] font-semibold text-secondary ${focusRing}`}
            >
              Abrir el Ateneo
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
