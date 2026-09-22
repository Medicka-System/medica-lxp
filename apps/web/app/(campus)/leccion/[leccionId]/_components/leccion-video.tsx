'use client';

/**
 * LeccionVideo — render del alumno para una lección tipo VIDEO (modelo nuevo · mig
 * 0023). Vive DENTRO del shell con la MISMA cáscara inmersiva de 3 columnas que la
 * teoría (§5A): barra de lección bajo el header, columna central con el video y rail
 * derecho (menú del curso + notas). Reusa `BloqueVideo` (Vidstack · card unificada del
 * mock leccion-estudio: video + timeline de hitos + "Guardar nota" + tabs Hitos/
 * Transcripción) y `PanelNotas` (marcadores de video + notas libres). Deriva la fuente
 * firmada del servicio de media y emite xAPI de progreso/completado (§7) — sin lógica
 * de dominio en el cliente (§2).
 */

import { useContext, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, Loader2, Moon, Sun, Type, X } from 'lucide-react';
import { BloqueVideo, type VideoApi } from '@/components/bloques/video/bloque-video';
import { MenuCurso } from './menu-curso';
import { PanelNotas } from './panel-notas';
import { MigasLeccion } from '@/components/campus/migas-leccion';
import { useNotas } from './usar-notas';
import { ModoLecturaContext, esTemaLectura, CLAVE_TEMA, type TemaLectura } from '@/components/campus/modo-lectura';
import { focusRing } from '@/components/tokens';
import type { Nota } from '@/lib/campus/notas-contrato';
import type { ContenidoCurso } from '@/lib/campus/leccion-contrato';
import type { LeccionVideo as LeccionVideoData } from '@/lib/campus/leccion-video-contrato';
import {
  firmarReproduccionAlumno,
  marcarVideoVisto,
  registrarVistaVideo,
} from '@/lib/campus/leccion-video-acciones';

const TEMAS: { id: TemaLectura; etiqueta: string; icono: typeof Sun }[] = [
  { id: 'claro', etiqueta: 'Claro', icono: Sun },
  { id: 'sepia', etiqueta: 'Sepia', icono: Type },
  { id: 'oscuro', etiqueta: 'Oscuro', icono: Moon },
];

export function LeccionVideo({
  leccion,
  contenidoCurso = null,
  notasIniciales = [],
  preview = false,
}: {
  leccion: LeccionVideoData;
  /** Árbol del curso para el menú del rail derecho (null si no se pudo cargar). */
  contenidoCurso?: ContenidoCurso | null;
  /** Notas del alumno para esta lección (§5A · mig 0027). Vacío en preview. */
  notasIniciales?: Nota[];
  /** Vista previa de staff (§5B): no registra progreso ni emite xAPI; navega por preview. */
  preview?: boolean;
}) {
  const baseLeccion = preview ? '/studio/preview/leccion' : '/leccion';

  // Modo lectura GLOBAL si hay provider (campus); si no (preview del Studio), local. El
  // video NO fuerza sepia (no es lectura): activa el modo respetando la preferencia
  // guardada, así el shell colapsa el lateral y da las 3 columnas igual que la teoría.
  const ctx = useContext(ModoLecturaContext);
  const [temaLocal, setTemaLocal] = useState<TemaLectura>('claro');
  const tema = ctx ? ctx.tema : temaLocal;
  const setTema = (t: TemaLectura) => {
    if (ctx) ctx.setTema(t);
    else {
      setTemaLocal(t);
      localStorage.setItem(CLAVE_TEMA, t);
    }
  };

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  useEffect(() => {
    const c = ctxRef.current;
    if (c) {
      c.activar('claro', false);
      return () => ctxRef.current?.desactivar();
    }
    const t = localStorage.getItem(CLAVE_TEMA);
    if (esTemaLectura(t)) setTemaLocal(t);
    return undefined;
  }, []);

  // El enlace directo se conoce en el servidor → arranca ya con esa fuente (SSR muestra
  // la card, sin parpadeo al fallback). La subida a videoteca se firma en el efecto.
  const [src, setSrc] = useState<string | null>(leccion.video.urlDirecta ?? null);
  const [avisoMedia, setAvisoMedia] = useState<string | null>(null);
  const [completada, setCompletada] = useState(leccion.completada);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();
  const experimentado = useRef(false);

  // ── NOTAS del alumno (§5A · mig 0027): marcadores de video + notas libres ──
  const notasActivas = !preview;
  const notasApi = useNotas(leccion.id, null, notasIniciales);
  const apiRef = useRef<VideoApi | null>(null);

  // Fuente del video: enlace directo (tal cual) o subida a videoteca (URL firmada).
  const { videotecaId, urlDirecta, reproducible } = leccion.video;
  useEffect(() => {
    let vivo = true;
    // Enlace directo: se reproduce sin firmar (Stream / CDN / origen externo).
    if (urlDirecta) {
      setSrc(urlDirecta);
      return;
    }
    if (!reproducible || !videotecaId) {
      setSrc(null);
      return;
    }
    firmarReproduccionAlumno(videotecaId).then((r) => {
      if (!vivo) return;
      if (r.ok) setSrc(r.url);
      else {
        setSrc(null);
        setAvisoMedia(r.error);
      }
    });
    return () => {
      vivo = false;
    };
  }, [reproducible, videotecaId, urlDirecta]);

  // Emite xAPI `experimentó` una sola vez al abrir la lección (best-effort · §7).
  useEffect(() => {
    if (preview || experimentado.current) return;
    experimentado.current = true;
    void registrarVistaVideo(leccion.id, leccion.nombre);
  }, [preview, leccion.id, leccion.nombre]);

  const contexto = `${leccion.contexto.programa} · ${leccion.contexto.modulo}`;

  const marcar = () => {
    setError(null);
    iniciar(async () => {
      const r = await marcarVideoVisto(leccion.id, leccion.nombre);
      if (r.ok) setCompletada(true);
      else setError(r.error);
    });
  };

  const cuerpo = (
    <>
      {/* ══ BARRA DE LECCIÓN — bajo el header, adopta el tono del tema ══ */}
      <div className="sticky top-[68px] z-20 border-b border-border bg-card transition-colors duration-[750ms] motion-reduce:transition-none">
        <div className="mx-auto flex h-[52px] w-full max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href={preview ? `/studio/programas/${leccion.contexto.programaId}` : `/cursos`}
            aria-label={preview ? 'Salir de la vista previa' : 'Salir de la lección'}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-[12.5px] font-semibold text-foreground-soft transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <X className="h-[17px] w-[17px]" strokeWidth={1.75} />
            <span className="hidden sm:inline">Salir</span>
          </Link>

          <MigasLeccion
            segmentos={[leccion.contexto.programa, leccion.contexto.modulo, leccion.nombre]}
          />

          {/* Selector de temas */}
          <div
            role="radiogroup"
            aria-label="Tema de lectura"
            className="flex items-center gap-0.5 rounded-full border border-border bg-muted p-0.5"
          >
            {TEMAS.map(({ id, etiqueta, icono: Icono }) => {
              const on = tema === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Tema ${etiqueta}`}
                  title={etiqueta}
                  onClick={() => setTema(id)}
                  className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${focusRing} ${
                    on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-card'
                  }`}
                >
                  <Icono className="h-[16px] w-[16px]" strokeWidth={1.75} />
                </button>
              );
            })}
          </div>

          <span aria-hidden className="hidden h-[22px] w-px shrink-0 bg-border sm:block" />

          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {leccion.anterior ? (
              <Link
                href={`${baseLeccion}/${leccion.anterior.id}`}
                aria-label={`Anterior: ${leccion.anterior.nombre}`}
                className={`grid h-9 w-9 place-items-center rounded-control border border-border text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                <ArrowLeft className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </Link>
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-control border border-border opacity-30">
                <ArrowLeft className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
            )}
            {leccion.siguiente ? (
              <Link
                href={`${baseLeccion}/${leccion.siguiente.id}`}
                aria-label={`Siguiente: ${leccion.siguiente.nombre}`}
                className={`grid h-9 w-9 place-items-center rounded-control bg-primary text-primary-foreground transition-colors hover:bg-secondary ${focusRing}`}
              >
                <ArrowRight className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </Link>
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-control border border-border opacity-30">
                <ArrowRight className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══ Aviso de vista previa (solo staff) ══ */}
      {preview && (
        <div className="flex items-center justify-center gap-2 border-b border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-2 text-center">
          <Eye className="h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
          <p className="text-[12px] font-semibold text-[color:var(--info-foreground)]">
            Vista previa como alumno · el alumno real solo lo verá cuando publiques. No se registra progreso.
          </p>
        </div>
      )}

      {/* ══ 3 columnas: (lateral = shell) · video · menú del curso + notas ══ */}
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_324px]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">{leccion.contexto.modulo}</p>
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">{leccion.nombre}</h1>
            {leccion.descripcion && (
              <p className="mt-3 text-[15px] leading-relaxed text-foreground-soft">{leccion.descripcion}</p>
            )}

            <div aria-hidden className="mt-7 h-px w-full bg-border" />

            <div className="mt-8">
              <BloqueVideo
                src={src}
                titulo={leccion.nombre}
                contexto={contexto}
                transcripcion={leccion.video.transcripcion}
                hitos={leccion.video.hitos}
                modo="ver"
                // Video subido: mientras se firma la URL (src aún null) muestra "cargando",
                // no el aviso de media pendiente.
                cargando={!src && !!videotecaId && !urlDirecta && !avisoMedia}
                onApi={(api) => {
                  apiRef.current = api;
                }}
                onGuardarMomento={
                  notasActivas ? (seg) => void notasApi.crear('marcador_video', '', { segundos: seg }) : undefined
                }
              />
              {avisoMedia && !src && <p className="mt-2 text-[12px] text-muted-foreground">{avisoMedia}</p>}
            </div>

            {/* ══ Pie: completar + navegación ══ */}
            <div className="mt-8 border-t border-border pt-6">
              {error && (
                <p className="mb-4 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[color:var(--destructive-foreground)]">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {leccion.anterior ? (
                  <Link
                    href={`${baseLeccion}/${leccion.anterior.id}`}
                    className={`inline-flex h-11 items-center gap-2 rounded-control border border-border bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
                  >
                    <ArrowLeft className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    <span className="max-w-[160px] truncate">{leccion.anterior.nombre}</span>
                  </Link>
                ) : (
                  <span />
                )}

                {preview ? (
                  <span className="inline-flex h-11 items-center gap-2 rounded-control border border-dashed border-border px-5 text-[13px] font-semibold text-muted-foreground">
                    <Eye className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    Vista previa
                  </span>
                ) : completada ? (
                  <span className="inline-flex h-11 items-center gap-2 rounded-control bg-accent px-5 text-[13.5px] font-bold text-accent-foreground">
                    <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2} />
                    Lección completada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={marcar}
                    disabled={guardando}
                    className={`inline-flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-secondary disabled:opacity-60 ${focusRing}`}
                  >
                    {guardando ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
                    ) : (
                      <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />
                    )}
                    Marcar como vista
                  </button>
                )}

                {leccion.siguiente ? (
                  <Link
                    href={`${baseLeccion}/${leccion.siguiente.id}`}
                    className={`inline-flex h-11 items-center gap-2 rounded-control bg-secondary px-4 text-[13px] font-semibold text-secondary-foreground transition-colors hover:opacity-90 ${focusRing}`}
                  >
                    <span className="max-w-[160px] truncate">{leccion.siguiente.nombre}</span>
                    <ArrowRight className="h-[17px] w-[17px]" strokeWidth={1.75} />
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            </div>
          </div>

          {/* ── Rail derecho: menú del curso + notas ── */}
          {(contenidoCurso || notasActivas) && (
            <aside className="flex flex-col gap-5 lg:sticky lg:top-[136px]">
              {contenidoCurso && <MenuCurso contenido={contenidoCurso} baseLeccion={baseLeccion} />}
              {notasActivas && (
                <PanelNotas
                  notas={notasApi.notas}
                  error={notasApi.error}
                  onAgregarLibre={(t) => notasApi.crear('nota_libre', t)}
                  onEditar={notasApi.editar}
                  onBorrar={notasApi.borrar}
                  onSaltar={(s) => apiRef.current?.irA(s)}
                />
              )}
            </aside>
          )}
        </div>
      </div>
    </>
  );

  if (ctx) return <div className="min-h-full">{cuerpo}</div>;
  return (
    <div
      data-tema-lectura={tema}
      className="min-h-dvh bg-background text-foreground transition-colors duration-[750ms] motion-reduce:transition-none"
    >
      {cuerpo}
    </div>
  );
}
