"use client";

/**
 * Ateneo · Composer
 *
 * Como Facebook: en el feed hay una entrada simple («¿Qué quiere compartir?») y al hacer clic
 * se abre el composer completo en un modal. Las cuatro acciones TRANSFORMAN el composer sin
 * salir de él (una sola `modo` en estado):
 *   caso      → selector de Mi Bitácora; el caso elegido se embebe con su distintivo
 *   pregunta  → caja de pregunta + contexto + temas; se publica con tratamiento ámbar
 *   media     → uploader de imágenes/video con progreso; se publica en mosaico/reproductor
 *   encuesta  → pregunta + hasta 4 opciones + cierre; se publica interactiva
 * Pulsar la acción activa otra vez vuelve a modo texto.
 */

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bold,
  Check,
  ChevronDown,
  CircleHelp,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  Italic,
  List,
  ScanLine,
  Search,
  Sticker,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { CasoBitacora, EnlacePreview, GifItem, ModoComposer, PerfilResumen } from "./tipos";
import { Avatar, Chip, Estudio, Modal, focusRing, mono, softText } from "./ui";
import { EstudioCaso } from "./EstudioCaso";
import { firmarSubidaMediaAteneo, gifsBuscar, gifsTrending, unfurlEnlace } from "@/lib/campus/ateneo-social-acciones";

// Límites de subida (Nivel 1): imagen ≤ 10 MB, video ≤ 50 MB.
const MAX_IMAGEN = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;

/** Primera URL http(s) del texto (sin puntuación final), para la tarjeta de enlace. */
function primeraUrl(s: string): string | null {
  const m = s.match(/https?:\/\/[^\s<>"')]+/i);
  return m ? m[0].replace(/[.,;:!?]+$/, "") : null;
}

export const ACCIONES: {
  modo: Exclude<ModoComposer, "texto">;
  etiqueta: string;
  Icono: typeof ScanLine;
  color: string;
  fondo: string;
}[] = [
  { modo: "caso", etiqueta: "Presentar caso", Icono: ScanLine, color: "var(--secondary)", fondo: "var(--accent)" },
  { modo: "pregunta", etiqueta: "Preguntar", Icono: CircleHelp, color: "var(--warning-foreground)", fondo: "var(--warning-surface)" },
  { modo: "media", etiqueta: "Imagen o video", Icono: ImageIcon, color: "var(--foreground-soft)", fondo: "var(--muted)" },
  { modo: "gif", etiqueta: "GIF", Icono: Sticker, color: "var(--secondary)", fondo: "var(--accent)" },
  { modo: "encuesta", etiqueta: "Encuesta", Icono: BarChart3, color: "var(--info-foreground)", fondo: "var(--info-surface)" },
];

/* ───────────── Entrada en el feed ───────────── */

export function EntradaComposer({
  yo,
  onAbrir,
}: {
  yo: PerfilResumen;
  onAbrir: (modo: ModoComposer) => void;
}) {
  return (
    <section className="rounded-[14px] border border-border bg-card px-[18px] py-4 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <div className="flex items-center gap-3">
        <Avatar p={yo} url={yo.avatarUrl} size={42} />
        <button
          type="button"
          onClick={() => onAbrir("texto")}
          className={`h-12 min-w-0 flex-1 rounded-full border border-border bg-muted px-5 text-left text-[14.5px] text-muted-foreground transition-colors hover:bg-accent ${focusRing}`}
        >
          ¿Qué quiere compartir, {yo.nombre.split(" ").slice(0, 2).join(" ")}?
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-border pt-3 sm:grid-cols-5">
        {ACCIONES.map(({ modo, etiqueta, Icono, color, fondo }) => (
          <button
            key={modo}
            type="button"
            onClick={() => onAbrir(modo)}
            className={`inline-flex h-[42px] items-center justify-center gap-2 rounded-[10px] text-[13px] font-semibold ${softText} transition-colors hover:bg-muted ${focusRing}`}
          >
            <span aria-hidden className="grid h-[26px] w-[26px] place-items-center rounded-lg" style={{ background: fondo, color }}>
              <Icono className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </span>
            {etiqueta}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Modal del composer ───────────── */

/** A quién se dirige la publicación: toda la comunidad o solo mis colegas. */
export type Audiencia = "ateneo" | "colegas" | "grupo";

/**
 * Opciones de audiencia (alcance del post). El scope NO es solo UI: la RLS de
 * `posts_ateneo` lo aplica (colegas → conexiones; grupo → comparte grupo CORA · mig 0061).
 * Fuente única para el botón y el menú.
 */
const AUDIENCIAS = [
  ["ateneo", Globe, "Todo el Ateneo", "Toda la comunidad lo ve"],
  ["colegas", Users, "Mis colegas", "Solo sus conexiones"],
  ["grupo", GraduationCap, "Mi grupo", "Solo su cohorte del diplomado"],
] as const;

// `enlace`: snapshot OG del link pegado (ortogonal al modo; null si no hay tarjeta).
type ConAudiencia = { audiencia: Audiencia; enlace?: EnlacePreview | null };
export type BorradorPost = ConAudiencia &
  (
    | { modo: "texto"; texto: string }
    | { modo: "caso"; texto: string; casoId: string }
    | { modo: "pregunta"; pregunta: string; contexto: string; temas: string[] }
    | { modo: "media"; texto: string; media: { tipo: "imagen" | "video"; ref: string }[] }
    | { modo: "gif"; texto: string; gif: { url: string } }
    | { modo: "encuesta"; pregunta: string; opciones: string[]; cierraEnDias: number }
  );

export function ComposerModal({
  yo,
  modoInicial,
  misCasos,
  onCerrar,
  onPublicar,
}: {
  yo: PerfilResumen;
  modoInicial: ModoComposer;
  misCasos: CasoBitacora[];
  onCerrar: () => void;
  onPublicar: (b: BorradorPost) => void;
}) {
  const [modo, setModo] = useState<ModoComposer>(modoInicial);
  const [texto, setTexto] = useState("");
  const [casoId, setCasoId] = useState<string | undefined>(misCasos.find((c) => c.validado)?.id);
  const [pregunta, setPregunta] = useState("");
  const [temas, setTemas] = useState<string[]>([]);
  const [opciones, setOpciones] = useState<string[]>(["", ""]);
  const [cierra, setCierra] = useState(3);
  const [archivos, setArchivos] = useState<{ file: File; nombre: string; tipo: "imagen" | "video"; progreso: number }[]>([]);
  const [audiencia, setAudiencia] = useState<Audiencia>("ateneo");
  const [menuAud, setMenuAud] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorMedia, setErrorMedia] = useState<string | null>(null);
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [gifQ, setGifQ] = useState("");
  const [gifSel, setGifSel] = useState<GifItem | null>(null);
  const [gifCargando, setGifCargando] = useState(false);
  // Enlace pegado → tarjeta OG (unfurl server-side con guard SSRF). Snapshot que se persiste.
  const [enlace, setEnlace] = useState<EnlacePreview | null>(null);
  const [enlaceCargando, setEnlaceCargando] = useState(false);
  const [enlaceDescartadas, setEnlaceDescartadas] = useState<string[]>([]);
  const enlaceUrlRef = useRef<string | null>(null); // última url para la que se disparó el fetch

  // Al entrar al modo GIF, trae tendencias; la búsqueda es reactiva a gifQ (con debounce).
  useEffect(() => {
    if (modo !== "gif") return;
    let vivo = true;
    setGifCargando(true);
    const q = gifQ.trim();
    const t = setTimeout(async () => {
      const res = q ? await gifsBuscar(q) : await gifsTrending();
      if (vivo) { setGifs(res); setGifCargando(false); }
    }, q ? 350 : 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [modo, gifQ]);

  // Detecta la 1ª URL del texto y pide su previsualización (debounce 500ms). El fetch OG lo hace
  // el `api` server-side con guard SSRF; el cliente nunca sale a la red. La encuesta no lleva texto.
  useEffect(() => {
    if (modo === "encuesta") return;
    const url = primeraUrl(texto);
    if (!url) {
      if (enlaceUrlRef.current !== null) { enlaceUrlRef.current = null; setEnlace(null); setEnlaceCargando(false); }
      return;
    }
    if (enlaceDescartadas.includes(url) || url === enlaceUrlRef.current) return;
    let vivo = true;
    setEnlace(null);
    setEnlaceCargando(true);
    const t = setTimeout(async () => {
      enlaceUrlRef.current = url; // marca al disparar (no antes: el debounce puede re-agendar)
      const res = await unfurlEnlace(url);
      if (!vivo) return;
      setEnlaceCargando(false);
      setEnlace(res); // null → sin tarjeta (falla suave)
    }, 500);
    return () => { vivo = false; clearTimeout(t); };
  }, [texto, modo, enlaceDescartadas]);

  const quitarEnlace = () => {
    const u = enlaceUrlRef.current ?? primeraUrl(texto);
    if (u) setEnlaceDescartadas((s) => (s.includes(u) ? s : [...s, u]));
    setEnlace(null);
    setEnlaceCargando(false);
  };

  const caso = misCasos.find((c) => c.id === casoId);

  const puedePublicar =
    (modo === "texto" && texto.trim()) ||
    (modo === "caso" && caso) ||
    (modo === "pregunta" && pregunta.trim()) ||
    (modo === "media" && archivos.length > 0) ||
    (modo === "gif" && gifSel) ||
    (modo === "encuesta" && pregunta.trim() && opciones.filter((o) => o.trim()).length >= 2);

  const publicar = async () => {
    if (!puedePublicar || subiendo) return;
    if (modo === "caso" && casoId) return onPublicar({ modo, texto, casoId, audiencia, enlace });
    if (modo === "pregunta") return onPublicar({ modo, pregunta, contexto: texto, temas, audiencia, enlace });
    if (modo === "encuesta") return onPublicar({ modo, pregunta, opciones: opciones.filter((o) => o.trim()), cierraEnDias: cierra, audiencia });
    if (modo === "gif") {
      if (!gifSel) return;
      // No se sube nada: el GIF es un hotlink al CDN de Giphy (lo exige su ToS). Solo se persiste la URL.
      return onPublicar({ modo: "gif", texto, gif: { url: gifSel.url }, audiencia, enlace });
    }
    if (modo === "media") {
      // Sube cada archivo DIRECTO a storage con URL firmada pública (§2) ANTES de publicar;
      // solo se persiste el post con las refs ya subidas.
      setSubiendo(true);
      setErrorMedia(null);
      const media: { tipo: "imagen" | "video"; ref: string }[] = [];
      for (let i = 0; i < archivos.length; i++) {
        const a = archivos[i]!;
        const ext = (a.nombre.split(".").pop() || (a.tipo === "video" ? "mp4" : "jpg")).toLowerCase();
        const firma = await firmarSubidaMediaAteneo(ext);
        if (!firma.ok) { setErrorMedia(firma.error); setSubiendo(false); return; }
        const put = await fetch(firma.urlSubida, {
          method: "PUT",
          headers: { "content-type": a.file.type || "application/octet-stream" },
          body: a.file,
        }).catch(() => null);
        if (!put || !put.ok) { setErrorMedia("No se pudo subir un archivo. Inténtelo de nuevo."); setSubiendo(false); return; }
        setArchivos((s) => s.map((x, j) => (j === i ? { ...x, progreso: 100 } : x)));
        media.push({ tipo: a.tipo, ref: firma.ref });
      }
      setSubiendo(false);
      return onPublicar({ modo: "media", texto, media, audiencia, enlace });
    }
    onPublicar({ modo: "texto", texto, audiencia, enlace });
  };

  const Editor = ({ placeholder, grande = true }: { placeholder: string; grande?: boolean }) => (
    <>
      <div className="mt-3 flex gap-0.5">
        {[
          ["Negrita", Bold],
          ["Cursiva", Italic],
          ["Lista", List],
        ].map(([l, I]) => {
          const Icono = I as typeof Bold;
          return (
            <button key={l as string} type="button" aria-label={l as string} className={`grid h-[30px] w-[30px] place-items-center rounded-md text-muted-foreground hover:bg-muted ${focusRing}`}>
              <Icono aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          );
        })}
      </div>
      <label>
        <span className="sr-only">{placeholder}</span>
        <textarea
          rows={grande ? 3 : 2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={placeholder}
          className={`mt-1 w-full resize-none bg-transparent leading-[1.6] text-foreground outline-none placeholder:text-muted-foreground ${
            grande ? "text-[17px]" : "text-[15px]"
          }`}
        />
      </label>
    </>
  );

  return (
    <Modal
      titulo="Crear publicación"
      onCerrar={onCerrar}
      ancho={modo === "caso" ? 660 : 560}
      pie={
        <>
          {/* barra de acciones: transforma el composer */}
          <div className="mx-5 mt-3.5 flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2.5">
            <span className="whitespace-nowrap text-[12.5px] font-semibold">Agregar a su publicación</span>
            <span className="ml-auto flex gap-1">
              {ACCIONES.map(({ modo: m, etiqueta, Icono, color, fondo }) => {
                const on = modo === m;
                return (
                  <button
                    key={m}
                    type="button"
                    title={etiqueta}
                    aria-pressed={on}
                    onClick={() => setModo(on ? "texto" : m)}
                    style={{ color, background: on ? fondo : "transparent", borderColor: on ? color : "transparent" }}
                    className={`inline-flex h-[38px] items-center gap-[7px] whitespace-nowrap rounded-[10px] border-[1.5px] text-[12px] ${
                      on ? "px-3 font-bold" : "px-2.5 font-semibold"
                    } ${focusRing}`}
                  >
                    <Icono aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    {on && etiqueta}
                  </button>
                );
              })}
            </span>
          </div>
          <div className="px-5 pb-[18px] pt-3.5">
            {errorMedia && (
              <p className="mb-2 text-[12px] font-medium text-[color:var(--warning-foreground)]">{errorMedia}</p>
            )}
            <button
              type="button"
              onClick={publicar}
              disabled={!puedePublicar || subiendo}
              className={`h-12 w-full rounded-[11px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${focusRing}`}
            >
              {subiendo ? "Subiendo…" : "Publicar"}
            </button>
          </div>
        </>
      }
    >
      <div className="px-5 pt-4">
        {/* autor + audiencia */}
        <div className="flex items-center gap-3">
          <Avatar p={yo} url={yo.avatarUrl} size={42} />
          <div>
            <p className="text-[14px] font-bold">{yo.nombre}</p>
            {/* Audiencia: a toda la comunidad o solo a mis colegas */}
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setMenuAud((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuAud}
                className={`inline-flex h-[26px] items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 text-[11.5px] font-semibold ${softText} ${focusRing}`}
              >
                {(() => {
                  const AudIcono = (AUDIENCIAS.find(([id]) => id === audiencia) ?? AUDIENCIAS[0])[1];
                  return <AudIcono aria-hidden className="h-3 w-3" strokeWidth={1.75} />;
                })()}
                {(AUDIENCIAS.find(([id]) => id === audiencia) ?? AUDIENCIAS[0])[2]}
                <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
              </button>
              {menuAud && (
                <div role="menu" className="absolute left-0 top-[30px] z-20 w-[190px] overflow-hidden rounded-[10px] border border-border bg-card shadow-[0_6px_20px_rgba(17,24,39,0.12)]">
                  {AUDIENCIAS.map(([id, Icono, etiqueta, ayuda]) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAudiencia(id);
                        setMenuAud(false);
                      }}
                      className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent ${focusRing} ${audiencia === id ? "bg-accent" : ""}`}
                    >
                      <Icono aria-hidden className="mt-px h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-bold">{etiqueta}</span>
                        <span className={`block text-[11px] ${softText}`}>{ayuda}</span>
                      </span>
                      {audiencia === id && <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2.4} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── TEXTO ── */}
        {modo === "texto" && <Editor placeholder="¿Qué quiere compartir con sus colegas?" />}

        {/* ── PRESENTAR CASO ── */}
        {modo === "caso" && (
          <>
            <Editor placeholder="Cuente por qué trae este caso y qué quiere que le miren." grande={false} />
            {caso && (
              <div className="mt-3 overflow-hidden rounded-xl border-[1.5px] border-secondary">
                <div className="flex items-center gap-2 bg-secondary px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white">
                    <ScanLine aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                    Caso presentado · de Mi Bitácora
                  </span>
                  <button type="button" onClick={() => setCasoId(undefined)} aria-label="Quitar el caso" className={`ml-auto grid h-[26px] w-[26px] place-items-center rounded-md bg-white/[0.16] text-white ${focusRing}`}>
                    <X aria-hidden className="h-[13px] w-[13px]" strokeWidth={2} />
                  </button>
                </div>
                <div className="flex gap-3 p-3">
                  <div className="w-[150px] shrink-0 overflow-hidden rounded-lg">
                    <EstudioCaso casoId={caso.id} piezas={caso.piezas} ratio="16 / 10" tamanoPlay={30} />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold leading-snug">{caso.titulo}</span>
                    <span className={`${mono} mt-1 block text-[11px] text-muted-foreground`}>
                      {caso.area} · {caso.organo} · {caso.piezas} piezas{caso.loops ? ` · ${caso.loops} loop` : ""}
                    </span>
                    {caso.validado && (
                      <span className="mt-2 inline-flex h-5 items-center gap-1 rounded-full bg-accent px-[7px] text-[10px] font-bold text-accent-foreground">
                        <Check aria-hidden className="h-[11px] w-[11px]" strokeWidth={2.6} />
                        Validado por su docente
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
            <p className="mt-3.5 text-[11.5px] font-semibold">Elegir de Mi Bitácora</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {misCasos.map((c) => {
                const on = c.id === casoId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCasoId(c.id)}
                    aria-pressed={on}
                    className={`w-[168px] shrink-0 rounded-[11px] border-[1.5px] p-[7px] text-left ${
                      on ? "border-secondary bg-accent" : "border-border bg-card"
                    } ${focusRing}`}
                  >
                    <span className="relative block overflow-hidden rounded-[7px]">
                      <EstudioCaso casoId={c.id} piezas={c.piezas} ratio="16 / 10" play={false} />
                      {on && (
                        <span className="absolute right-1.5 top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-primary text-[color:var(--sidebar)]">
                          <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="mt-[7px] block text-[11.5px] font-bold leading-snug">{c.titulo}</span>
                    <span className={`${mono} mt-[3px] block text-[10px] ${c.validado ? "text-secondary" : "text-muted-foreground"}`}>
                      {c.fecha} · {c.validado ? "Validado" : "Pendiente"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Solo sus casos, ya anonimizados. Se publica sin datos del paciente.
            </p>
          </>
        )}

        {/* ── PREGUNTAR ── */}
        {modo === "pregunta" && (
          <>
            <div className="mt-3.5 rounded-xl border-[1.5px] border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3.5">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--warning-foreground)]">
                <CircleHelp aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                Su pregunta
              </p>
              <label>
                <span className="sr-only">Su pregunta</span>
                <textarea
                  rows={2}
                  value={pregunta}
                  onChange={(e) => setPregunta(e.target.value)}
                  placeholder="¿Qué quiere preguntarle a la comunidad?"
                  className="mt-2 w-full resize-none bg-transparent text-[17px] font-bold leading-snug text-foreground outline-none placeholder:font-bold placeholder:text-muted-foreground"
                />
              </label>
            </div>
            <p className="mt-3 text-[11.5px] font-semibold">
              Contexto <span className="font-normal text-muted-foreground">(opcional)</span>
            </p>
            <Editor placeholder="Qué intentó, qué le hace dudar…" grande={false} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {temas.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
              <button type="button" onClick={() => setTemas((s) => [...s, "#renal"])} className={`inline-flex h-[26px] items-center rounded-full border border-dashed border-border px-2.5 text-[11.5px] font-semibold text-secondary ${focusRing}`}>
                + tema
              </button>
            </div>
          </>
        )}

        {/* ── IMAGEN O VIDEO ── */}
        {modo === "media" && (
          <>
            <Editor placeholder="Cuente qué muestra…" grande={false} />
            {archivos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {archivos.map((a, i) => (
                  <div key={i} className="relative overflow-hidden rounded-[10px]" style={{ aspectRatio: "1" }}>
                    {a.progreso < 100 ? (
                      <div className="grid h-full place-items-center bg-[color:var(--track)] text-center">
                        <div>
                          <span className={`${mono} block text-[12px] font-bold ${softText}`}>{a.progreso}%</span>
                          <span className="mx-auto mt-1.5 block h-1 w-[60px] overflow-hidden rounded-full bg-border">
                            <span className="block h-full bg-primary" style={{ width: `${a.progreso}%` }} />
                          </span>
                          <span className="mt-1 block text-[10px] text-muted-foreground">subiendo</span>
                        </div>
                      </div>
                    ) : (
                      <Estudio ratio="1" play={false} />
                    )}
                    <button type="button" onClick={() => setArchivos((s) => s.filter((_, j) => j !== i))} aria-label={`Quitar ${a.nombre}`} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: "rgba(15,45,82,.85)" }}>
                      <X aria-hidden className="h-3 w-3" strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className={`mt-2 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-dashed border-[color:var(--track)] bg-muted text-[12.5px] font-semibold text-secondary ${focusRing}`}>
              <Upload aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
              Agregar fotos o video · o arrástrelos aquí
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const nuevos = Array.from(e.target.files ?? []).flatMap((f) => {
                    const esImg = f.type.startsWith("image/");
                    const esVid = f.type.startsWith("video/");
                    if (!esImg && !esVid) return []; // solo imagen/video (sin DICOM/.zip)
                    if (f.size > (esVid ? MAX_VIDEO : MAX_IMAGEN)) {
                      setErrorMedia(`"${f.name}" supera el máximo (${esVid ? "50" : "10"} MB).`);
                      return [];
                    }
                    return [{ file: f, nombre: f.name, tipo: (esVid ? "video" : "imagen") as "imagen" | "video", progreso: 100 }];
                  });
                  if (nuevos.length) setErrorMedia(null);
                  setArchivos((s) => [...s, ...nuevos].slice(0, 8));
                  e.target.value = "";
                }}
              />
            </label>
          </>
        )}

        {/* ── GIF (Giphy · hotlink al CDN, sin subida · §3) ── */}
        {modo === "gif" && (
          <>
            <Editor placeholder="Agregue un comentario…" grande={false} />
            <div className="relative mt-3">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <input
                type="search"
                value={gifQ}
                onChange={(e) => setGifQ(e.target.value)}
                placeholder="Buscar GIFs en GIPHY…"
                aria-label="Buscar GIFs"
                className={`h-11 w-full rounded-[11px] border-[1.5px] border-border bg-card pl-9 pr-3 text-[13px] font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground ${focusRing}`}
              />
            </div>
            <div className="mt-3 max-h-[300px] overflow-y-auto rounded-[11px]">
              {gifCargando && gifs.length === 0 ? (
                <div className="grid h-24 place-items-center text-[12px] text-muted-foreground">Cargando GIFs…</div>
              ) : gifs.length === 0 ? (
                <div className="grid h-24 place-items-center text-[12px] text-muted-foreground">Sin resultados.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gifs.map((g) => {
                    const sel = gifSel?.id === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGifSel(sel ? null : g)}
                        aria-pressed={sel}
                        className={`relative overflow-hidden rounded-[10px] bg-muted ${focusRing} ${sel ? "ring-2 ring-primary ring-offset-1" : ""}`}
                        style={{ aspectRatio: "1" }}
                      >
                        <img src={g.preview} alt="" loading="lazy" className="h-full w-full object-cover" />
                        {sel && (
                          <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white">
                            <Check aria-hidden className="h-3 w-3" strokeWidth={2.6} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Atribución obligatoria (ToS de Giphy) */}
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Powered by GIPHY</p>
          </>
        )}

        {/* ── ENCUESTA ── */}
        {modo === "encuesta" && (
          <div className="mt-3.5 rounded-xl border-[1.5px] border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-3.5">
            <label>
              <span className="sr-only">Pregunta de la encuesta</span>
              <input
                type="text"
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                placeholder="Haga una pregunta…"
                className="h-11 w-full rounded-[10px] border border-[color:var(--info-border)] bg-card px-3 text-[14px] font-bold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
              />
            </label>
            <ul className="mt-2.5 flex flex-col gap-[7px]">
              {Array.from({ length: 4 }).map((_, i) => {
                const val = opciones[i];
                const existe = val !== undefined;
                return (
                  <li key={i} className="flex items-center gap-2">
                    <span className={`${mono} w-4 text-[11px] font-bold text-muted-foreground`}>{i + 1}</span>
                    <input
                      type="text"
                      value={val ?? ""}
                      disabled={!existe && i > opciones.length}
                      onChange={(e) =>
                        setOpciones((s) => {
                          const n = [...s];
                          n[i] = e.target.value;
                          return n;
                        })
                      }
                      placeholder={`Opción ${i + 1}`}
                      className="h-[42px] min-w-0 flex-1 rounded-[10px] border border-border bg-card px-3 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    {existe && opciones.length > 2 ? (
                      <button type="button" aria-label={`Quitar opción ${i + 1}`} onClick={() => setOpciones((s) => s.filter((_, j) => j !== i))} className={`grid h-[30px] w-[30px] place-items-center rounded-lg text-muted-foreground ${focusRing}`}>
                        <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    ) : (
                      <span className="w-[30px]" />
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] text-[color:var(--info-foreground)]">
                Hasta 4 opciones · {opciones.filter((o) => o.trim()).length} de 4
              </span>
              <button type="button" onClick={() => setCierra((d) => (d % 7) + 1)} className={`ml-auto inline-flex h-[34px] items-center gap-[7px] rounded-[9px] border border-[color:var(--info-border)] bg-card px-2.5 text-[12px] font-semibold text-[color:var(--info-foreground)] ${focusRing}`}>
                Cierra en {cierra} {cierra === 1 ? "día" : "días"}
                <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {/* ── PREVISUALIZACIÓN DE ENLACE (OG · unfurl server-side con guard SSRF) ── */}
        {modo !== "encuesta" && (enlaceCargando || enlace) && (
          <div className="relative mt-3">
            {enlace ? (
              <div className="flex overflow-hidden rounded-[11px] border border-border bg-card">
                {enlace.imagen && (
                  <img src={enlace.imagen} alt="" loading="lazy" className="h-[92px] w-[120px] shrink-0 bg-muted object-cover" />
                )}
                <div className="min-w-0 flex-1 px-3.5 py-2.5">
                  {enlace.sitio && <p className="truncate text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{enlace.sitio}</p>}
                  {enlace.titulo && <p className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-snug text-foreground">{enlace.titulo}</p>}
                  {enlace.descripcion && <p className={`mt-1 line-clamp-2 text-[11.5px] leading-relaxed ${softText}`}>{enlace.descripcion}</p>}
                </div>
              </div>
            ) : (
              // Skeleton mientras el `api` hace el unfurl (server-side).
              <div className="flex overflow-hidden rounded-[11px] border border-border bg-card">
                <div className="h-[92px] w-[120px] shrink-0 animate-pulse bg-muted motion-reduce:animate-none" />
                <div className="flex-1 space-y-2 px-3.5 py-3">
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  <div className="h-2.5 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                </div>
              </div>
            )}
            {enlace && (
              <button
                type="button"
                onClick={quitarEnlace}
                aria-label="Quitar la previsualización del enlace"
                className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-white ${focusRing}`}
                style={{ background: "rgba(15,45,82,.85)" }}
              >
                <X aria-hidden className="h-3 w-3" strokeWidth={2.2} />
              </button>
            )}
          </div>
        )}
        <div className="h-1" />
      </div>
    </Modal>
  );
}
