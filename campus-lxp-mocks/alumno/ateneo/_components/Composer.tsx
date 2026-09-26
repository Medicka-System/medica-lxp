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

import { useState } from "react";
import {
  BarChart3,
  Bold,
  Check,
  ChevronDown,
  CircleHelp,
  Globe,
  Image as ImageIcon,
  Italic,
  List,
  ScanLine,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { CasoBitacora, ModoComposer, PerfilResumen } from "./tipos";
import { Avatar, Chip, Estudio, Modal, focusRing, mono, softText } from "./ui";

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
        <Avatar p={yo} size={42} />
        <button
          type="button"
          onClick={() => onAbrir("texto")}
          className={`h-12 min-w-0 flex-1 rounded-full border border-border bg-muted px-5 text-left text-[14.5px] text-muted-foreground transition-colors hover:bg-accent ${focusRing}`}
        >
          ¿Qué quiere compartir, {yo.nombre.split(" ").slice(0, 2).join(" ")}?
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-border pt-3 sm:grid-cols-4">
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

export type BorradorPost =
  | { modo: "texto"; texto: string }
  | { modo: "caso"; texto: string; casoId: string }
  | { modo: "pregunta"; pregunta: string; contexto: string; temas: string[] }
  | { modo: "media"; texto: string; archivos: File[] }
  | { modo: "encuesta"; pregunta: string; opciones: string[]; cierraEnDias: number };

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
  const [archivos, setArchivos] = useState<{ nombre: string; progreso: number }[]>([]);

  const caso = misCasos.find((c) => c.id === casoId);

  const puedePublicar =
    (modo === "texto" && texto.trim()) ||
    (modo === "caso" && caso) ||
    (modo === "pregunta" && pregunta.trim()) ||
    (modo === "media" && archivos.length > 0) ||
    (modo === "encuesta" && pregunta.trim() && opciones.filter((o) => o.trim()).length >= 2);

  const publicar = () => {
    if (!puedePublicar) return;
    if (modo === "caso" && casoId) onPublicar({ modo, texto, casoId });
    else if (modo === "pregunta") onPublicar({ modo, pregunta, contexto: texto, temas });
    else if (modo === "encuesta") onPublicar({ modo, pregunta, opciones: opciones.filter((o) => o.trim()), cierraEnDias: cierra });
    else if (modo === "media") onPublicar({ modo, texto, archivos: [] });
    else onPublicar({ modo: "texto", texto });
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
            <button
              type="button"
              onClick={publicar}
              disabled={!puedePublicar}
              className={`h-12 w-full rounded-[11px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${focusRing}`}
            >
              Publicar
            </button>
          </div>
        </>
      }
    >
      <div className="px-5 pt-4">
        {/* autor + audiencia */}
        <div className="flex items-center gap-3">
          <Avatar p={yo} size={42} />
          <div>
            <p className="text-[14px] font-bold">{yo.nombre}</p>
            <button type="button" className={`mt-1 inline-flex h-[26px] items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 text-[11.5px] font-semibold ${softText} ${focusRing}`}>
              <Globe aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              Todo el Ateneo
              <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
            </button>
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
                    <Estudio ratio="16 / 10" poster={caso.poster} tamanoPlay={30} />
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
                      <Estudio ratio="16 / 10" poster={c.poster} play={false} />
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
                onChange={(e) =>
                  setArchivos((s) => [...s, ...Array.from(e.target.files ?? []).map((f) => ({ nombre: f.name, progreso: 100 }))])
                }
              />
            </label>
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
        <div className="h-1" />
      </div>
    </Modal>
  );
}
