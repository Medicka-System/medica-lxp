"use client";

/**
 * Studio · Detalle de un recurso — lo que ES y lo que AFECTA
 *
 * Izquierda: preview + metadatos + etiquetas (lo que el recurso es).
 * Derecha: "dónde se usa" — las lecciones que lo referencian, con programa, versión y estado — más
 * las versiones del archivo (lo que el recurso afecta).
 *
 * Reemplazar es la acción PRIMARIA: actualiza el archivo en todas las lecciones a la vez, sin
 * copias ni edición lección por lección. Su diálogo antepone el alcance. Eliminar es la única
 * acción que usa el rojo, y solo al confirmar cuando el recurso está en uso.
 *
 * Stubs: onReemplazar · onRenombrar · onEtiquetar · onEliminar · onAbrirLeccion
 */

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Link2,
  Pencil,
  Play,
  Repeat2,
  Tag,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type UsoRecurso = {
  id: string;
  programa: string;
  version: string;
  ruta: string;
  estadoLeccion: "publicada" | "borrador";
};

export type VersionArchivo = { id: string; etiqueta: string; nota: string; fecha: string; actual?: boolean };

export type RecursoDetalle = {
  id: string;
  tipo: "video" | "h5p" | "documento" | "imagen";
  nombre: string;
  estadoStream?: "listo" | "procesando";
  metadatos: { etiqueta: string; valor: string }[];
  duracion?: string;
  resolucion?: string;
  etiquetas: string[];
  usos: UsoRecurso[];
  versiones: VersionArchivo[];
};

const MOCK: RecursoDetalle = {
  id: "r1",
  tipo: "video",
  nombre: "Hidronefrosis grado I a IV con marcadores",
  estadoStream: "listo",
  duracion: "18:40 · 1080p",
  metadatos: [
    { etiqueta: "Tipo", valor: "Video · Cloudflare Stream" },
    { etiqueta: "Duración", valor: "18:40" },
    { etiqueta: "Resolución", valor: "1920 × 1080" },
    { etiqueta: "Peso", valor: "412 MB" },
    { etiqueta: "Subido", valor: "4 nov 2026 · Mariana V." },
    { etiqueta: "Última versión", valor: "v2 · 4 nov 2026" },
  ],
  etiquetas: ["renal", "hidronefrosis", "modo B"],
  usos: [
    { id: "u1", programa: "Ultrasonografía Médica", version: "v3", ruta: "Módulo 04 · Lección 3 · Hidronefrosis: gradación y trampas", estadoLeccion: "publicada" },
    { id: "u2", programa: "Ultrasonografía Médica", version: "v3", ruta: "Módulo 05 · Lección 2 · Obstrucción: signos indirectos", estadoLeccion: "publicada" },
    { id: "u3", programa: "Ultrasonografía Médica", version: "v4", ruta: "Módulo 04 · Lección 6 · Cierre: informe estructurado", estadoLeccion: "borrador" },
    { id: "u4", programa: "POCUS en Urgencias", version: "v5", ruta: "Módulo 03 · Lección 4 · Riñón en el paciente agudo", estadoLeccion: "publicada" },
    { id: "u5", programa: "POCUS en Urgencias", version: "v5", ruta: "Módulo 06 · Lección 1 · Repaso de casos renales", estadoLeccion: "publicada" },
    { id: "u6", programa: "Ultrasonido Musculoesquelético", version: "v1", ruta: "Módulo 02 · Lección 5 · Comparativo de artefactos", estadoLeccion: "publicada" },
    { id: "u7", programa: "Doppler Vascular", version: "v4", ruta: "Módulo 01 · Lección 3 · Escala y ganancia", estadoLeccion: "publicada" },
  ],
  versiones: [
    { id: "v2", etiqueta: "v2", nota: "Se corrigió el audio del minuto 8", fecha: "4 nov 2026", actual: true },
    { id: "v1", etiqueta: "v1", nota: "Carga original", fecha: "18 sep 2026" },
  ],
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function DetalleRecurso({ data = MOCK }: { data?: RecursoDetalle }) {
  const { nombre, duracion, metadatos, etiquetas, usos, versiones } = data;
  const [dialogo, setDialogo] = useState<null | "reemplazar" | "eliminar">(null);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onReemplazar = () => setDialogo(null);
  const onRenombrar = () => {};
  const onEtiquetar = () => {};
  const onEliminar = () => setDialogo(null);
  const onAbrirLeccion = (_id: string) => {};
  /* ──────────────────────────────────────────────────────── */

  const programas = [...new Set(usos.map((u) => u.programa))];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-8 pt-6">
      {/* acciones: reemplazar es la primaria */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={`inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
          Volver a Contenido
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRenombrar}
            className={`inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Renombrar
          </button>
          <button
            type="button"
            onClick={onEtiquetar}
            className={`inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <Tag aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Etiquetar
          </button>
          <button
            type="button"
            onClick={() => setDialogo("eliminar")}
            className={`inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-[color:var(--destructive-border)] hover:bg-[color:var(--destructive-surface)] hover:text-destructive ${focusRing}`}
          >
            <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => setDialogo("reemplazar")}
            className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Repeat2 aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
            Reemplazar archivo
          </button>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* ════════ Lo que el recurso ES ════════ */}
        <section className={`${card} min-w-0 overflow-hidden`}>
          <div
            className="relative grid w-full place-items-center"
            style={{ aspectRatio: "16 / 9", background: "var(--sidebar)" }}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)",
              }}
            />
            <span
              aria-hidden
              className="relative grid h-[58px] w-[58px] place-items-center rounded-full bg-white/[0.18] text-white"
            >
              <Play className="h-[26px] w-[26px]" strokeWidth={1} fill="currentColor" />
            </span>
            {duracion && (
              <span
                className={`${mono} absolute bottom-3 left-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white`}
                style={{ background: "rgba(15,45,82,.82)" }}
              >
                {duracion}
              </span>
            )}
            <span className="absolute bottom-3 right-3 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-[color:var(--sidebar)]">
              Listo en Stream
            </span>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
                <Play aria-hidden className="h-3 w-3" strokeWidth={1} fill="currentColor" />
                Video
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
                <Link2 aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                <span className={mono}>{usos.length}</span> lecciones · {programas.length} programas
              </span>
            </div>
            <h1
              className="mt-3 text-[22px] font-extrabold leading-tight tracking-[-0.02em]"
              style={{ textWrap: "pretty" }}
            >
              {nombre}
            </h1>

            <dl className="mt-5 grid gap-3.5 sm:grid-cols-2">
              {metadatos.map((m) => (
                <div key={m.etiqueta}>
                  <dt className={`${kicker} text-muted-foreground`}>{m.etiqueta}</dt>
                  <dd
                    className={`mt-1 text-[13px] font-semibold ${
                      ["Duración", "Resolución", "Peso"].includes(m.etiqueta) ? `${mono} font-bold` : ""
                    }`}
                  >
                    {m.valor}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <span className={`${kicker} text-muted-foreground`}>Etiquetas</span>
              {etiquetas.map((t) => (
                <span
                  key={t}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[12px] font-semibold ${softText}`}
                >
                  <Tag aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  {t}
                </span>
              ))}
              <button
                type="button"
                onClick={onEtiquetar}
                className={`inline-flex h-7 items-center rounded-full border border-dashed border-border bg-card px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
              >
                + etiqueta
              </button>
              <button
                type="button"
                className={`ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <Download aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Descargar original
              </button>
            </div>
          </div>
        </section>

        {/* ════════ Lo que el recurso AFECTA ════════ */}
        <aside className="flex min-w-0 flex-col gap-4">
          <section className={`${card} overflow-hidden`}>
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Dónde se usa</p>
                <span className={`${mono} ml-auto text-[13px] font-bold`}>
                  {usos.length} lecciones
                </span>
              </div>
              <p className={`mt-2 text-[12.5px] leading-relaxed ${softText}`}>
                Si reemplaza el archivo, estas {usos.length} lecciones muestran el nuevo video la
                próxima vez que un alumno entre.
              </p>
            </div>
            <ul className="max-h-[360px] overflow-y-auto">
              {usos.map((u, i) => (
                <li key={u.id} className={i ? "border-t border-border" : ""}>
                  <button
                    type="button"
                    onClick={() => onAbrirLeccion(u.id)}
                    className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted ${focusRing}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold text-secondary">{u.programa}</span>
                        <span className={`${mono} text-[11px] text-muted-foreground`}>
                          {u.version}
                        </span>
                        {u.estadoLeccion === "borrador" && (
                          <span className="inline-flex h-[19px] items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
                            Borrador
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[12.5px] font-medium leading-snug">
                        {u.ruta}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="mt-0.5 h-[15px] w-[15px] shrink-0 text-muted-foreground"
                      strokeWidth={2}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>Versiones del archivo</p>
            <ul className="mt-3 flex flex-col gap-0.5">
              {versiones.map((v) => (
                <li
                  key={v.id}
                  className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 ${
                    v.actual ? "bg-accent" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className={`${mono} grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] text-[11px] font-bold ${
                      v.actual ? "bg-primary text-[color:var(--sidebar)]" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {v.etiqueta}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold leading-snug">{v.nota}</span>
                    <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>
                      {v.fecha}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
              Reemplazar crea una versión nueva y la sirve en todas las lecciones. Las anteriores
              quedan por si hay que volver.
            </p>
          </section>
        </aside>
      </div>

      {/* ───── Reemplazar: el alcance antes de aceptar ───── */}
      {dialogo === "reemplazar" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reemplazar archivo"
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: "rgba(15,45,82,.52)" }}
        >
          <div className="w-full max-w-[600px] overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="px-6 pb-5 pt-6">
              <p className={`${kicker} text-secondary`}>Reemplazar archivo</p>
              <h2 className="mt-2.5 text-[21px] font-extrabold leading-snug tracking-[-0.02em]">
                El nuevo video entrará en {usos.length} lecciones de {programas.length} programas
              </h2>
              <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
                El recurso vive una sola vez: al reemplazarlo, todas las lecciones que lo referencian
                sirven el archivo nuevo. No se crean copias ni hay que editar cada lección.
              </p>

              <div className="mt-4 rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-muted p-5 text-center">
                <span
                  aria-hidden
                  className="inline-grid h-[42px] w-[42px] place-items-center rounded-full bg-card text-secondary"
                >
                  <Upload className="h-5 w-5" strokeWidth={2} />
                </span>
                <p className="mt-2.5 text-[13.5px] font-bold">
                  Arrastre el archivo nuevo o elíjalo
                </p>
                <p className={`${mono} mt-1 text-[11.5px] text-muted-foreground`}>
                  MP4 o MOV · se procesa en Cloudflare Stream
                </p>
              </div>

              <ul className="mt-4 overflow-hidden rounded-[11px] border border-border">
                {programas.map((p, i) => {
                  const enPrograma = usos.filter((u) => u.programa === p);
                  const publicadas = enPrograma.filter((u) => u.estadoLeccion === "publicada").length;
                  return (
                    <li
                      key={p}
                      className={`flex items-center gap-3 px-3.5 py-2.5 ${i ? "border-t border-border" : ""}`}
                    >
                      <Link2 aria-hidden className="h-[15px] w-[15px] shrink-0 text-secondary" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 text-[13px] font-semibold">{p}</span>
                      <span className={`${mono} shrink-0 text-[12px] text-muted-foreground`}>
                        {enPrograma.length} {enPrograma.length === 1 ? "lección" : "lecciones"} ·{" "}
                        {publicadas} publicadas
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex items-start gap-2.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3">
                <TriangleAlert
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-[color:var(--warning-foreground)]"
                  strokeWidth={2}
                />
                <p className="text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
                  Los alumnos que ya vieron el video verán el nuevo al volver a entrar. Su avance no
                  se reinicia.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-t border-border bg-muted px-6 py-4">
              <span className={`${mono} min-w-0 text-[11.5px] text-muted-foreground`}>
                quedará como v3 · 16 nov 2026
              </span>
              <span className="ml-auto flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDialogo(null)}
                  className={`h-11 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onReemplazar}
                  className={`h-12 shrink-0 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  Reemplazar en las {usos.length}
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ───── Eliminar en uso: la única acción que toca el rojo ───── */}
      {dialogo === "eliminar" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Eliminar recurso"
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: "rgba(15,45,82,.52)" }}
        >
          <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="px-6 pb-5 pt-6">
              <p className={`${kicker} text-destructive`}>Eliminar recurso</p>
              <h2 className="mt-2.5 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
                Está en uso en {usos.length} lecciones
              </h2>
              <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
                Si lo elimina, esas lecciones se quedan sin el recurso y el alumno verá un hueco.
                Primero quítelo de las lecciones o reemplácelo por otro archivo.
              </p>
            </div>
            <div className="flex items-center gap-2.5 border-t border-border bg-muted px-6 py-4">
              <span className="ml-auto flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDialogo(null)}
                  className={`h-11 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onEliminar}
                  className={`h-11 shrink-0 whitespace-nowrap rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-4 text-[13.5px] font-bold text-destructive ${focusRing}`}
                >
                  Eliminar de todas formas
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
