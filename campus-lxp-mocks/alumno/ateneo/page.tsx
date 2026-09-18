"use client";

/**
 * Ateneo · red social clínica — Campus Virtual · Médica Capacitación (LXP)
 * Muro de la comunidad médica: se publica, se reacciona y se sigue a colegas. El caso clínico es
 * el centro, pero no lo único: también hay preguntas, encuestas y logros del programa.
 *
 * Vive DENTRO del shell (app/(campus)/layout.tsx). El detalle de un post está en ateneo/[id].
 *
 * Reacciones clínicas (no genéricas): Útil · Buen ojo · Sugerir diagnóstico.
 * El navy se reserva para la insignia de docente y el sello "Validado".
 *
 * Stubs: onPublicar · onReaccionar · onComentar · onSeguir · onAbrirPost · onVotarEncuesta · onFelicitar
 */

import { useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Bookmark,
  Check,
  Eye,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Stethoscope,
  ThumbsUp,
} from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";
import { Avatar } from "@/components/Avatar";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type Colega = { ini: string; nombre: string; rol: string; sede: string; docente?: boolean };

export type Comentario = {
  id: string;
  autor: Colega;
  texto: string;
  hace: string;
  fijado?: boolean;
};

export type Reacciones = { util: number; ojo: number; diagnostico: number; mia?: "util" | "ojo" };

export type PostBase = {
  id: string;
  autor: Colega;
  publicado: string;
  reacciones: Reacciones;
  comentarios: Comentario[];
  totalComentarios: number;
  guardado?: boolean;
  reaccionaron: string[];
};

export type PostCaso = PostBase & {
  tipo: "caso";
  area: string;
  texto: string;
  piezas: { tipo: "cine-loop" | "imagen"; etiqueta: string }[];
  pideInterconsulta?: boolean;
  validadoPor?: string;
  diagnosticos?: number;
};

export type PostEncuesta = PostBase & {
  tipo: "encuesta";
  texto: string;
  opciones: { texto: string; pct: number; mia?: boolean }[];
  votos: number;
  cierra: string;
};

export type PostLogro = PostBase & {
  tipo: "logro";
  titulo: string;
  detalle: string;
  felicitaciones: number;
};

export type Post = PostCaso | PostEncuesta | PostLogro;

export type AteneoData = {
  yo: Colega & { colegas: number; casos: number; aportes: number };
  enVivo?: { titulo: string; asistentes: number };
  agenda: { fecha: string; titulo: string; ini: string }[];
  posts: Post[];
  sugerencias: (Colega & { motivo: string })[];
  temas: string[];
};

const MOCK: AteneoData = {
  yo: {
    ini: "SR",
    nombre: "Dra. Sofía Ramírez",
    rol: "Ultrasonografía",
    sede: "Guadalajara",
    colegas: 128,
    casos: 3,
    aportes: 18,
  },
  enVivo: { titulo: "Sesión de casos renales", asistentes: 42 },
  agenda: [
    { fecha: "Jueves 19:00", titulo: "Ateneo de urgencias", ini: "KL" },
    { fecha: "Viernes 20:00", titulo: "Obstétrico: dudas frecuentes", ini: "MP" },
    { fecha: "Martes 19:30", titulo: "Doppler paso a paso", ini: "HC" },
  ],
  posts: [
    {
      id: "p1",
      tipo: "caso",
      autor: { ini: "IT", nombre: "Dr. Iván Torres", rol: "Urgencias", sede: "Puebla" },
      publicado: "hace 2 h",
      area: "Renal",
      texto:
        "¿Esta asimetría cortical es crónica o me está ganando el ángulo? Mujer de 46 años, dolor lumbar derecho de 3 días, creatinina normal. Se me hizo raro el jet ureteral.",
      piezas: [
        { tipo: "cine-loop", etiqueta: "riñón derecho · longitudinal" },
        { tipo: "imagen", etiqueta: "riñón izquierdo" },
        { tipo: "imagen", etiqueta: "+2 imágenes" },
      ],
      pideInterconsulta: true,
      diagnosticos: 2,
      reacciones: { util: 24, ojo: 9, diagnostico: 2, mia: "util" },
      reaccionaron: ["KM", "LA", "HC", "MP"],
      totalComentarios: 7,
      comentarios: [
        {
          id: "c1",
          autor: { ini: "KM", nombre: "Karla Méndez", rol: "MI", sede: "Monterrey" },
          texto:
            "¿Midió la cortical en los dos polos? Si solo midió el medio, el ángulo explica la diferencia.",
          hace: "hace 1 h",
        },
        {
          id: "c2",
          autor: {
            ini: "AS",
            nombre: "Alejandro Sandoval",
            rol: "Docente",
            sede: "Renal y abdomen",
            docente: true,
          },
          texto: "Regla práctica: mida en los dos polos y en el mismo plano. Si se sostiene, es real.",
          hace: "hace 20 min",
        },
      ],
    },
    {
      id: "p2",
      tipo: "encuesta",
      autor: { ini: "KM", nombre: "Dra. Karla Méndez", rol: "Medicina interna", sede: "Monterrey" },
      publicado: "hace 4 h",
      texto: "En equipos portátiles, ¿qué preset usan de entrada para riñón?",
      opciones: [
        { texto: "Abdomen general, bajando ganancia", pct: 54, mia: true },
        { texto: "Preset renal del fabricante", pct: 31 },
        { texto: "Uno propio guardado en el equipo", pct: 15 },
      ],
      votos: 86,
      cierra: "cierra en 2 días",
      reacciones: { util: 11, ojo: 0, diagnostico: 0 },
      reaccionaron: ["IT", "LA"],
      totalComentarios: 14,
      comentarios: [],
    },
    {
      id: "p3",
      tipo: "logro",
      autor: { ini: "LA", nombre: "Dr. Luis Arreola", rol: "Medicina familiar", sede: "CDMX" },
      publicado: "ayer",
      titulo: "Acreditó el Módulo 3 · Hígado y vía biliar",
      detalle: "120 h acumuladas en Ultrasonografía Médica",
      felicitaciones: 11,
      reacciones: { util: 11, ojo: 0, diagnostico: 0 },
      reaccionaron: ["IT", "KM", "MP"],
      totalComentarios: 3,
      comentarios: [],
    },
    {
      id: "p4",
      tipo: "caso",
      autor: { ini: "KM", nombre: "Dra. Karla Méndez", rol: "Medicina interna", sede: "Monterrey" },
      publicado: "hace 5 h",
      area: "Vías urinarias",
      texto:
        "¿Vale reportar obstrucción sin ver la litiasis? Jet ureteral ausente del lado derecho en dos exploraciones separadas por 20 minutos.",
      piezas: [
        { tipo: "cine-loop", etiqueta: "vejiga · doppler color" },
        { tipo: "imagen", etiqueta: "unión ureterovesical derecha" },
      ],
      validadoPor: "Dra. Karla Lugo",
      reacciones: { util: 38, ojo: 14, diagnostico: 0 },
      reaccionaron: ["IT", "LA", "HC", "RS"],
      totalComentarios: 11,
      guardado: true,
      comentarios: [
        {
          id: "c3",
          autor: {
            ini: "KL",
            nombre: "Karla Lugo",
            rol: "Docente",
            sede: "Urgencias y POCUS",
            docente: true,
          },
          texto:
            "Sí: la ausencia sostenida de jet más el cólico apoyan obstrucción funcional. Repórtela como hallazgo indirecto y pida control en 48 h.",
          hace: "hace 3 h",
          fijado: true,
        },
      ],
    },
  ],
  sugerencias: [
    {
      ini: "RS",
      nombre: "Dra. Renata Salas",
      rol: "Radiología",
      sede: "Guadalajara",
      motivo: "4 colegas en común",
    },
    { ini: "HC", nombre: "Dr. Hugo Cuevas", rol: "Radiología", sede: "GDL", motivo: "Mismo diplomado" },
    {
      ini: "MP",
      nombre: "Dra. Mariana Peña",
      rol: "Docente",
      sede: "Obstétrico",
      motivo: "Sigue su bitácora",
      docente: true,
    },
  ],
  temas: ["#renal", "#pocus", "#doppler", "#obstétrico", "#litiasis"],
};


function Caritas({ inis }: { inis: string[] }) {
  return (
    <span className="flex pl-1.5" aria-hidden>
      {inis.map((i) => (
        <span
          key={i}
          className={`-ml-2 grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground ${mono}`}
        >
          {i}
        </span>
      ))}
    </span>
  );
}

function Reaccion({
  icono: Icono,
  etiqueta,
  n,
  activa,
  onClick,
}: {
  icono: typeof ThumbsUp;
  etiqueta: string;
  n?: number;
  activa?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!activa}
      className={`inline-flex h-10 items-center gap-[7px] rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${focusRing} ${
        activa
          ? "border-transparent bg-accent text-accent-foreground"
          : "border-border bg-card text-[color:var(--foreground-soft)] hover:bg-muted"
      }`}
    >
      <Icono aria-hidden className="h-4 w-4" strokeWidth={1.75} />
      {etiqueta}
      {n !== undefined && n > 0 && <span className={`${mono} text-muted-foreground`}>{n}</span>}
    </button>
  );
}

function Pieza({ etiqueta, badge, alto = 190 }: { etiqueta: string; badge?: string; alto?: number }) {
  return (
    <div
      aria-hidden
      className="relative grid w-full place-items-center overflow-hidden rounded-[10px]"
      style={{ height: alto, background: "var(--wave-0)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
        }}
      />
      <span
        className={`relative ${mono} px-2 text-center text-[9.5px] uppercase tracking-[0.14em]`}
        style={{ color: "var(--hero-ink-muted)" }}
      >
        {etiqueta}
      </span>
      {badge && (
        <span
          className={`absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${mono}`}
          style={{ background: "rgba(15,45,82,.82)", color: "var(--hero-ink)" }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function Comentarios({
  items,
  total,
  onComentar,
  yo,
}: {
  items: Comentario[];
  total: number;
  onComentar: (t: string) => void;
  yo: Colega;
}) {
  const [texto, setTexto] = useState("");
  return (
    <>
      {items.map((c) => (
        <div key={c.id} className="mt-3 flex gap-2.5">
          <Avatar c={c.autor} size={30} />
          <div className="min-w-0 flex-1 rounded-[12px] bg-muted px-3.5 py-2.5">
            {c.fijado && (
              <p className={`${kicker} mb-1.5 text-accent-foreground`}>Respuesta fijada</p>
            )}
            <p className={`text-[13px] leading-relaxed ${softText}`}>
              <span className="font-bold text-foreground">{c.autor.nombre}</span>{" "}
              {c.autor.docente && (
                <span className="mr-1 inline-flex h-[18px] items-center rounded-full bg-sidebar px-1.5 align-middle text-[10px] font-bold text-sidebar-foreground">
                  Docente
                </span>
              )}
              {c.texto}
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                className={`text-[11.5px] font-semibold text-secondary ${focusRing}`}
              >
                Me es útil
              </button>
              <button
                type="button"
                className={`text-[11.5px] font-semibold text-muted-foreground ${focusRing}`}
              >
                Responder
              </button>
              <span className={`${mono} text-[11px] text-muted-foreground`}>{c.hace}</span>
            </div>
          </div>
        </div>
      ))}

      {total > items.length && (
        <button
          type="button"
          className={`mt-2.5 text-[12.5px] font-semibold text-muted-foreground hover:text-secondary ${focusRing}`}
        >
          Ver los {total} comentarios
        </button>
      )}

      <div className="mt-3.5 flex items-center gap-2.5">
        <Avatar c={yo} size={32} />
        <label className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-border bg-card px-4">
          <span className="sr-only">Escriba un comentario</span>
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escriba un comentario…"
            className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            onComentar(texto);
            setTexto("");
          }}
          disabled={!texto.trim()}
          className={`inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:bg-muted disabled:text-muted-foreground ${focusRing}`}
        >
          Publicar
        </button>
      </div>
    </>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Ateneo({ data = MOCK }: { data?: AteneoData }) {
  const { yo, enVivo, agenda, posts, sugerencias, temas } = data;
  const [pestana, setPestana] = useState<"muro" | "discutido" | "sin-resolver" | "validados" | "colegas">("muro");
  const [borrador, setBorrador] = useState("");
  const [seguidos, setSeguidos] = useState<string[]>([]);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onPublicar = (_texto: string) => setBorrador("");
  const onReaccionar = (_id: string, _tipo: string) => {};
  const onComentar = (_id: string, _texto: string) => {};
  const onAbrirPost = (_id: string) => {};
  const onVotarEncuesta = (_id: string, _i: number) => {};
  const onFelicitar = (_id: string) => {};
  const onSeguir = (ini: string) => setSeguidos((s) => [...s, ini]);
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    if (pestana === "sin-resolver")
      return posts.filter((p) => p.tipo === "caso" && p.pideInterconsulta);
    if (pestana === "validados") return posts.filter((p) => p.tipo === "caso" && p.validadoPor);
    if (pestana === "discutido")
      return [...posts].sort((a, b) => b.totalComentarios - a.totalComentarios);
    return posts;
  }, [posts, pestana]);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* ───── Cabecera + pestañas del muro ───── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="ml-auto flex gap-2 overflow-x-auto">
          {(
            [
              ["muro", "Mi muro"],
              ["discutido", "Lo más discutido"],
              ["sin-resolver", "Sin resolver"],
              ["validados", "Validados"],
              ["colegas", "Mis colegas"],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestana(id)}
              aria-pressed={pestana === id}
              className={`h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-[13.5px] font-semibold transition-colors ${focusRing} ${
                pestana === id
                  ? "border-transparent bg-sidebar text-sidebar-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_316px]">
        {/* ══════════ MURO ══════════ */}
        <div className="min-w-0">
          {/* composer */}
          <section aria-label="Publicar en el Ateneo" className={`${card} p-5`}>
            <div className="flex items-center gap-3">
              <Avatar c={yo} />
              <label className="flex h-[52px] min-w-0 flex-1 items-center rounded-full border border-border bg-muted px-5 transition-colors focus-within:border-secondary focus-within:bg-card">
                <span className="sr-only">Qué quiere publicar</span>
                <input
                  type="text"
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  placeholder="¿Qué vio hoy, Dra. Ramírez? Comparta un caso, una duda o un hallazgo…"
                  className="w-full bg-transparent text-[14.5px] text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => onPublicar(borrador)}
                className={`inline-flex h-11 items-center gap-2 rounded-full bg-accent px-3.5 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
              >
                <ImageIcon aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                Presentar caso
              </button>
              {[
                { icono: MessageCircle, etiqueta: "Preguntar" },
                { icono: ImageIcon, etiqueta: "Imagen o loop" },
                { icono: BarChart3, etiqueta: "Encuesta" },
              ].map(({ icono: Icono, etiqueta }) => (
                <button
                  key={etiqueta}
                  type="button"
                  className={`inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold text-[color:var(--foreground-soft)] transition-colors hover:bg-muted ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                  {etiqueta}
                </button>
              ))}
              <span className="ml-auto text-[12px] text-muted-foreground">
                Sin datos del paciente · su sede es visible
              </span>
            </div>
          </section>

          {/* historias: en vivo + agenda */}
          <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
            {enVivo && (
              <div
                className="relative w-[252px] shrink-0 overflow-hidden rounded-xl p-4"
                style={{ background: "var(--sidebar)" }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(110% 140% at 90% 0%, rgba(26,136,128,.5) 0%, rgba(15,45,82,0) 62%)",
                  }}
                />
                <span className="relative inline-flex h-6 items-center gap-1.5 rounded-full bg-primary px-2.5 text-[11px] font-bold text-[color:var(--sidebar)]">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--sidebar)]" />
                  En vivo
                </span>
                <p
                  className="relative mt-2.5 text-[14.5px] font-bold leading-snug"
                  style={{ color: "var(--hero-ink)" }}
                >
                  {enVivo.titulo}
                </p>
                <p
                  className={`${mono} relative mt-2.5 text-[11.5px]`}
                  style={{ color: "var(--hero-ink-muted)" }}
                >
                  {enVivo.asistentes} aquí
                </p>
              </div>
            )}
            {agenda.map((a) => (
              <div key={a.titulo} className={`${card} w-[236px] shrink-0 p-4`}>
                <p className={`${mono} text-[11.5px] text-muted-foreground`}>{a.fecha}</p>
                <p className="mt-2 text-[14px] font-bold leading-snug">{a.titulo}</p>
                <div className="mt-3 flex items-center gap-2.5">
                  <Avatar c={{ ini: a.ini, nombre: "", rol: "", sede: "" }} size={28} />
                  <button
                    type="button"
                    className={`ml-auto inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                  >
                    Me interesa
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* posts */}
          <ul className="mt-5 flex flex-col gap-5">
            {visibles.map((p) => (
              <li key={p.id} className={`${card} p-5`}>
                {/* cabeza */}
                <div className="flex items-center gap-3">
                  <Avatar c={p.autor} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-bold leading-snug">{p.autor.nombre}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {p.autor.rol} · {p.autor.sede} · {p.publicado}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    {p.tipo === "caso" && (
                      <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
                        Caso · {p.area}
                      </span>
                    )}
                    {p.tipo === "caso" && p.pideInterconsulta && (
                      <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-semibold text-[color:var(--warning-foreground)]">
                        Pide interconsulta
                      </span>
                    )}
                    {p.tipo === "caso" && p.validadoPor && (
                      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-sidebar px-2.5 text-[11.5px] font-bold text-sidebar-foreground">
                        <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                        Validado
                      </span>
                    )}
                    {p.tipo === "encuesta" && (
                      <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11.5px] font-semibold text-[color:var(--info-foreground)]">
                        Encuesta
                      </span>
                    )}
                    {p.tipo === "logro" && (
                      <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
                        Logro
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Más opciones"
                      className={`grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                    >
                      <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                    </button>
                  </span>
                </div>

                {/* cuerpo por tipo */}
                {p.tipo === "caso" && (
                  <>
                    <button
                      type="button"
                      onClick={() => onAbrirPost(p.id)}
                      className={`mt-4 block w-full text-left text-[17px] font-bold leading-relaxed ${focusRing}`}
                      style={{ textWrap: "pretty" }}
                    >
                      {p.texto}
                    </button>
                    <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: "2fr 1fr" }}>
                      <Pieza etiqueta={p.piezas[0].etiqueta} badge="loop" />
                      <div className="grid gap-2">
                        {p.piezas.slice(1, 3).map((q) => (
                          <Pieza key={q.etiqueta} etiqueta={q.etiqueta} alto={91} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {p.tipo === "encuesta" && (
                  <>
                    <p className="mt-4 text-[17px] font-bold leading-relaxed">{p.texto}</p>
                    <ul className="mt-4 flex flex-col gap-2">
                      {p.opciones.map((o, i) => (
                        <li key={o.texto}>
                          <button
                            type="button"
                            onClick={() => onVotarEncuesta(p.id, i)}
                            className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[11px] border px-4 py-3 text-left text-[14px] transition-colors ${focusRing} ${
                              o.mia ? "border-secondary font-bold" : "border-border font-medium"
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`absolute inset-y-0 left-0 ${o.mia ? "bg-accent" : "bg-muted"}`}
                              style={{ width: `${o.pct}%` }}
                            />
                            <span className="relative flex-1">{o.texto}</span>
                            <span
                              className={`${mono} relative text-[13px] font-bold ${
                                o.mia ? "text-accent-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {o.pct}%
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className={`${mono} mt-3 text-[12px] text-muted-foreground`}>
                      {p.votos} votos · {p.cierra} · usted votó
                    </p>
                  </>
                )}

                {p.tipo === "logro" && (
                  <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[12px] bg-accent p-5">
                    <span
                      aria-hidden
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-card text-accent-foreground"
                    >
                      <Award className="h-6 w-6" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1 basis-[200px]">
                      <p className="text-[15.5px] font-bold leading-snug">{p.titulo}</p>
                      <p className={`mt-1 text-[13px] ${softText}`}>{p.detalle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onFelicitar(p.id)}
                      className={`inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                    >
                      Felicitar
                    </button>
                  </div>
                )}

                {/* respuesta fijada del docente */}
                {p.comentarios.some((c) => c.fijado) && (
                  <div className="mt-4 flex gap-3.5 rounded-[12px] bg-accent p-4">
                    <Avatar c={p.comentarios.find((c) => c.fijado)!.autor} size={36} />
                    <div className="min-w-0">
                      <p className={`${kicker} text-accent-foreground`}>
                        Respuesta fijada de la docente
                      </p>
                      <p className={`mt-2 text-[14px] leading-relaxed ${softText}`}>
                        {p.comentarios.find((c) => c.fijado)!.texto}
                      </p>
                    </div>
                  </div>
                )}

                {/* quién reaccionó */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-b border-border pb-3.5">
                  <Caritas inis={p.reaccionaron} />
                  <span className="text-[12.5px] text-muted-foreground">
                    A <span className="font-semibold text-foreground">{p.reaccionaron[0]}</span> y{" "}
                    <span className={mono}>{p.reacciones.util}</span> colegas les parece útil
                  </span>
                  <button
                    type="button"
                    onClick={() => onAbrirPost(p.id)}
                    className={`ml-auto text-[12.5px] font-semibold text-secondary ${focusRing}`}
                  >
                    {p.totalComentarios} comentarios
                    {p.tipo === "caso" && p.diagnosticos ? ` · ${p.diagnosticos} diagnósticos` : ""}
                  </button>
                </div>

                {/* reacciones */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <Reaccion
                    icono={ThumbsUp}
                    etiqueta={p.tipo === "logro" ? "Felicitar" : "Útil"}
                    n={p.reacciones.util}
                    activa={p.reacciones.mia === "util"}
                    onClick={() => onReaccionar(p.id, "util")}
                  />
                  {p.tipo === "caso" && (
                    <>
                      <Reaccion
                        icono={Eye}
                        etiqueta="Buen ojo"
                        n={p.reacciones.ojo}
                        activa={p.reacciones.mia === "ojo"}
                        onClick={() => onReaccionar(p.id, "ojo")}
                      />
                      <Reaccion
                        icono={Stethoscope}
                        etiqueta="Sugerir diagnóstico"
                        n={p.reacciones.diagnostico}
                        onClick={() => onReaccionar(p.id, "diagnostico")}
                      />
                    </>
                  )}
                  <Reaccion
                    icono={MessageCircle}
                    etiqueta="Comentar"
                    n={p.totalComentarios}
                    onClick={() => onComentar(p.id, "")}
                  />
                  <button
                    type="button"
                    aria-label="Guardar"
                    aria-pressed={!!p.guardado}
                    className={`ml-auto grid h-10 w-10 place-items-center rounded-full border transition-colors ${focusRing} ${
                      p.guardado
                        ? "border-transparent bg-accent text-accent-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Bookmark aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>

                {/* comentarios */}
                {p.comentarios.filter((c) => !c.fijado).length > 0 || p.tipo === "caso" ? (
                  <Comentarios
                    items={p.comentarios.filter((c) => !c.fijado)}
                    total={p.totalComentarios}
                    onComentar={(t) => onComentar(p.id, t)}
                    yo={yo}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {/* ══════════ RAIL SOCIAL ══════════ */}
        <aside className="flex min-w-0 flex-col gap-5">
          <section className={`${card} overflow-hidden`}>
            <div className="relative h-16" style={{ background: "var(--sidebar)" }}>
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)",
                }}
              />
            </div>
            <div className="-mt-7 px-5 pb-5">
              <span
                aria-hidden
                className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-card bg-sidebar text-[18px] font-bold text-sidebar-foreground"
              >
                {yo.ini}
              </span>
              <p className="mt-3 text-[15.5px] font-bold">{yo.nombre}</p>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {yo.rol} · {yo.sede}
              </p>
              <div className="mt-3.5 flex items-center gap-5 border-t border-border pt-3.5">
                {[
                  [yo.colegas, "colegas"],
                  [yo.casos, "casos"],
                  [yo.aportes, "aportes"],
                ].map(([v, l]) => (
                  <span key={String(l)}>
                    <span className={`block text-[16px] font-extrabold ${mono}`}>{v}</span>
                    <span className="block text-[11.5px] text-muted-foreground">{l}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className={`${kicker} text-muted-foreground`}>Colegas que quizá conozca</h2>
            <ul className="mt-3.5 flex flex-col gap-3.5">
              {sugerencias.map((s) => (
                <li key={s.ini} className="flex items-center gap-3">
                  <Avatar c={s} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold leading-snug">{s.nombre}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {s.rol} · {s.sede}
                    </p>
                    <p className="truncate text-[11.5px] text-secondary">{s.motivo}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSeguir(s.ini)}
                    className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-bold transition-colors ${focusRing} ${
                      seguidos.includes(s.ini)
                        ? "border-transparent bg-accent text-accent-foreground"
                        : "border-border bg-card text-secondary hover:bg-accent"
                    }`}
                  >
                    {seguidos.includes(s.ini) ? "Siguiendo" : "Seguir"}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} p-5`}>
            <h2 className={`${kicker} text-muted-foreground`}>Temas que sigue</h2>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {temas.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`h-[34px] rounded-full bg-muted px-3 text-[12.5px] font-semibold text-[color:var(--foreground-soft)] transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  {t}
                </button>
              ))}
              <button
                type="button"
                className={`h-[34px] rounded-full border border-dashed border-border px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
              >
                + seguir tema
              </button>
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className={`${kicker} text-muted-foreground`}>Reglas de la comunidad</h2>
            <ul className={`mt-3 flex flex-col gap-2.5 text-[13px] leading-snug ${softText}`}>
              <li>Nunca publique datos que identifiquen al paciente.</li>
              <li>Argumente con el hallazgo, no con la intuición.</li>
              <li>La respuesta fijada del docente es la referencia.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
