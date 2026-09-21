'use client';

/**
 * LeccionVideo — render del alumno para una lección tipo VIDEO (modelo nuevo · mig
 * 0023). Reemplaza el placeholder: la lección ES un video y ocupa toda la superficie.
 *
 * Reusa `BloqueVideo` (reproductor Vidstack · §3) en modo `ver`: video + panel de
 * TRANSCRIPCIÓN (salto por cue) e HITOS de consulta rápida en tabs (clic salta al
 * punto). Comparte la cáscara inmersiva de la lectura (§5A): superficie a pantalla
 * completa con los tres temas de lectura (claro/sepia/oscuro), header en tono y
 * navegación anterior/siguiente. Deriva la fuente firmada del servicio de media y
 * emite xAPI de progreso/completado (§7) — sin lógica de dominio en el cliente (§2).
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  Moon,
  Sun,
  Type,
  X,
} from 'lucide-react';
import { BloqueVideo, type VideoApi } from '@/components/bloques/video/bloque-video';
import { PanelNotas } from './panel-notas';
import { useNotas } from './usar-notas';
import type { Nota } from '@/lib/campus/notas-contrato';
import type { LeccionVideo as LeccionVideoData } from '@/lib/campus/leccion-video-contrato';
import {
  firmarReproduccionAlumno,
  marcarVideoVisto,
  registrarVistaVideo,
} from '@/lib/campus/leccion-video-acciones';

type Tema = 'claro' | 'sepia' | 'oscuro';

const CLAVE_TEMA = 'lxp:lectura:tema';

const TEMAS: { id: Tema; etiqueta: string; icono: typeof Sun }[] = [
  { id: 'claro', etiqueta: 'Claro', icono: Sun },
  { id: 'sepia', etiqueta: 'Sepia', icono: Type },
  { id: 'oscuro', etiqueta: 'Oscuro', icono: Moon },
];

function esTema(v: string | null): v is Tema {
  return v === 'claro' || v === 'sepia' || v === 'oscuro';
}

export function LeccionVideo({
  leccion,
  notasIniciales = [],
  preview = false,
}: {
  leccion: LeccionVideoData;
  /** Notas del alumno para esta lección (§5A · mig 0027). Vacío en preview. */
  notasIniciales?: Nota[];
  /** Vista previa de staff (§5B): no registra progreso ni emite xAPI; navega por preview. */
  preview?: boolean;
}) {
  const baseLeccion = preview ? '/studio/preview/leccion' : '/leccion';
  const [tema, setTema] = useState<Tema>('claro');
  const [src, setSrc] = useState<string | null>(null);
  const [avisoMedia, setAvisoMedia] = useState<string | null>(null);
  const [completada, setCompletada] = useState(leccion.completada);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();
  const experimentado = useRef(false);

  // ── NOTAS del alumno (§5A · mig 0027): marcadores de video + notas libres ──
  const notasActivas = !preview;
  const notasApi = useNotas(leccion.id, null, notasIniciales);
  const apiRef = useRef<VideoApi | null>(null);
  const guardarMomento = () => {
    const seg = Math.floor(apiRef.current?.tiempoActual() ?? 0);
    void notasApi.crear('marcador_video', '', { segundos: seg });
  };

  // Recupera el tema de lectura guardado (comparte clave con la lectura inmersiva).
  useEffect(() => {
    const t = localStorage.getItem(CLAVE_TEMA);
    if (esTema(t)) setTema(t);
  }, []);
  useEffect(() => localStorage.setItem(CLAVE_TEMA, tema), [tema]);

  // Firma la URL de reproducción (vida corta) cuando hay una fuente reproducible.
  const { videotecaId, reproducible } = leccion.video;
  useEffect(() => {
    let vivo = true;
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
  }, [reproducible, videotecaId]);

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

  return (
    <div
      data-tema-lectura={tema}
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background text-foreground"
    >
      {/* ══ Header en tono ══ */}
      <header className="sticky top-0 z-10 flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
        <Link
          href={preview ? `/studio/programas/${leccion.contexto.programaId}` : `/cursos`}
          aria-label={preview ? 'Salir de la vista previa' : 'Salir de la lección'}
          className="inline-flex h-10 items-center gap-2 rounded-control px-2.5 text-[13px] font-semibold text-foreground-soft transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-[19px] w-[19px]" strokeWidth={1.75} />
          <span className="hidden sm:inline">{preview ? 'Salir de la vista previa' : 'Salir'}</span>
        </Link>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {contexto}
          </p>
          <p className="truncate text-[13.5px] font-bold leading-tight">{leccion.nombre}</p>
        </div>

        {/* Tema de lectura */}
        <div role="radiogroup" aria-label="Tema de lectura" className="flex items-center gap-0.5 rounded-full border border-border bg-muted p-0.5">
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
                className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
                  on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-card'
                }`}
              >
                <Icono className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </button>
            );
          })}
        </div>
      </header>

      {/* ══ Aviso de vista previa (solo staff) ══ */}
      {preview && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-2 text-center">
          <Eye className="h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
          <p className="text-[12px] font-semibold text-[color:var(--info-foreground)]">
            Vista previa como alumno · el alumno real solo lo verá cuando publiques. No se registra progreso.
          </p>
        </div>
      )}

      {/* ══ Cuerpo ══ */}
      <div className="flex-1">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 lg:py-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
            {leccion.contexto.modulo}
          </p>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight sm:text-[30px]">
            {leccion.nombre}
          </h1>
          {leccion.descripcion && (
            <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-foreground-soft">
              {leccion.descripcion}
            </p>
          )}

          <div className="mt-6">
            <BloqueVideo
              src={src}
              titulo={leccion.nombre}
              contexto={contexto}
              transcripcion={leccion.video.transcripcion}
              hitos={leccion.video.hitos}
              modo="ver"
              onApi={(api) => {
                apiRef.current = api;
              }}
            />
            {avisoMedia && !src && (
              <p className="mt-2 text-[12px] text-muted-foreground">{avisoMedia}</p>
            )}
          </div>

          {/* ── Notas del alumno (marcadores de video + notas libres · §5A) ── */}
          {notasActivas && (
            <div className="mt-6">
              <PanelNotas
                notas={notasApi.notas}
                error={notasApi.error}
                onAgregarLibre={(t) => notasApi.crear('nota_libre', t)}
                onEditar={notasApi.editar}
                onBorrar={notasApi.borrar}
                onGuardarMomento={guardarMomento}
                onSaltar={(s) => apiRef.current?.irA(s)}
              />
            </div>
          )}

          {/* ══ Pie: completar + navegación ══ */}
          <div className="mt-10 border-t border-border pt-6">
            {error && (
              <p className="mb-4 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[color:var(--destructive-foreground)]">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {leccion.anterior ? (
                <Link
                  href={`${baseLeccion}/${leccion.anterior.id}`}
                  className="inline-flex h-11 items-center gap-2 rounded-control border border-border bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent"
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
                  className="inline-flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  {guardando ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} /> : <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />}
                  Marcar como vista
                </button>
              )}

              {leccion.siguiente ? (
                <Link
                  href={`${baseLeccion}/${leccion.siguiente.id}`}
                  className="inline-flex h-11 items-center gap-2 rounded-control bg-secondary px-4 text-[13px] font-semibold text-secondary-foreground transition-colors hover:opacity-90"
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
      </div>
    </div>
  );
}
