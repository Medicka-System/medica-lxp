'use client';

/**
 * LectorLeccion — lectura inmersiva de una lección (§5A). Cubre el shell con una
 * superficie a pantalla completa que hereda uno de tres temas de lectura
 * (claro/sepia/oscuro) vía `data-tema-lectura`, con el header en tono y control de
 * tamaño de fuente (A- / A+). El tema y el tamaño se recuerdan (localStorage) y la
 * transición respeta prefers-reduced-motion (definido en globals.css).
 *
 * Cada bloque de lxp.contenidos se renderiza con la pieza ya construida: texto con
 * ContenidoRico (visor del EditorRico), y video/H5P/paquetes con components/bloques.
 * Lo que depende de object storage / servidor se degrada con dignidad (contratos).
 */

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  Minus,
  Moon,
  Plus,
  Sun,
  Type,
  X,
} from 'lucide-react';
import { ContenidoRico } from '@/components/editor-rico';
import { BloqueVideo } from '@/components/bloques/video/bloque-video';
import { BloqueH5P } from '@/components/bloques/h5p/bloque-h5p';
import { BloquePaquete } from '@/components/bloques/paquetes/bloque-paquete';
import type { TipoPaquete } from '@/components/bloques/contratos';
import { mono } from '@/components/tokens';
import { MotorAutoevaluacion } from './motor-autoevaluacion';
import { marcarLeccionCompletada } from '@/lib/campus/leccion-acciones';
import { reportarProgresoInteractivo } from '@/lib/campus/players-acciones';
import { LeccionInteractiva } from './leccion-interactiva';
import {
  esLeccionInteractiva,
  TIPO_LABEL,
  type BloqueContenido,
  type LeccionCompleta,
} from '@/lib/campus/leccion-contrato';

type Tema = 'claro' | 'sepia' | 'oscuro';

const CLAVE_TEMA = 'lxp:lectura:tema';
const CLAVE_FS = 'lxp:lectura:fs';
const FS_MIN = 13.5;
const FS_MAX = 24;
const FS_PASO = 1.5;
const FS_DEFECTO = 16.5;

const TEMAS: { id: Tema; etiqueta: string; icono: typeof Sun }[] = [
  { id: 'claro', etiqueta: 'Claro', icono: Sun },
  { id: 'sepia', etiqueta: 'Sepia', icono: Type },
  { id: 'oscuro', etiqueta: 'Oscuro', icono: Moon },
];

function esTema(v: string | null): v is Tema {
  return v === 'claro' || v === 'sepia' || v === 'oscuro';
}

export function LectorLeccion({
  leccion,
  preview = false,
}: {
  leccion: LeccionCompleta;
  /**
   * Modo VISTA PREVIA para staff (§5B): mismo render que ve el alumno, pero navega
   * entre lecciones por la ruta de preview (que no exige `publicado`), no registra
   * progreso y sale de vuelta al builder. El alumno real nunca lo usa.
   */
  preview?: boolean;
}) {
  // Base de navegación: en preview las vecinas van por la ruta de staff (que sí ve
  // borradores); en el campus, por la ruta normal del alumno.
  const baseLeccion = preview ? '/studio/preview/leccion' : '/leccion';
  const [tema, setTema] = useState<Tema>('claro');
  const [fs, setFs] = useState<number>(FS_DEFECTO);
  const [completada, setCompletada] = useState(leccion.completada);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  // Recupera preferencias guardadas (una vez, en cliente).
  useEffect(() => {
    const t = localStorage.getItem(CLAVE_TEMA);
    if (esTema(t)) setTema(t);
    const f = Number(localStorage.getItem(CLAVE_FS));
    if (Number.isFinite(f) && f >= FS_MIN && f <= FS_MAX) setFs(f);
  }, []);

  useEffect(() => localStorage.setItem(CLAVE_TEMA, tema), [tema]);
  useEffect(() => localStorage.setItem(CLAVE_FS, String(fs)), [fs]);

  const contexto = `${leccion.contexto.programa} · ${leccion.contexto.modulo}`;
  const interactiva = esLeccionInteractiva(leccion.tipo);
  // La autoevaluación se completa al ENVIAR el examen (motor), no con el botón genérico.
  const esAutoeval = leccion.tipo === 'autoevaluacion';

  const marcar = () => {
    setError(null);
    iniciar(async () => {
      // Las lecciones interactivas (h5p/xapi) anclan el progreso al LRS por el dominio
      // (POST /players/progreso); el resto persiste el avance por CRUD directo (§2/§7).
      const r = interactiva
        ? await reportarProgresoInteractivo({
            leccionId: leccion.id,
            contenidoId: leccion.contenidoId,
            completado: true,
            titulo: leccion.nombre,
          })
        : await marcarLeccionCompletada(leccion.id);
      if (r.ok) setCompletada(true);
      else setError(r.error);
    });
  };

  return (
    <div
      data-tema-lectura={tema}
      style={{ ['--lectura-fs' as string]: `${fs}px` }}
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

        <div className="flex items-center gap-2">
          {/* Tamaño de fuente */}
          <div className="hidden items-center gap-0.5 rounded-full border border-border bg-muted p-0.5 sm:flex">
            <button
              type="button"
              aria-label="Reducir tamaño de letra"
              disabled={fs <= FS_MIN}
              onClick={() => setFs((v) => Math.max(FS_MIN, v - FS_PASO))}
              className="grid h-8 w-8 place-items-center rounded-full text-foreground transition-colors hover:bg-card disabled:opacity-40"
            >
              <Minus className="h-4 w-4" strokeWidth={2} />
            </button>
            <span aria-hidden className="grid h-8 w-6 place-items-center text-muted-foreground">
              <Type className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </span>
            <button
              type="button"
              aria-label="Aumentar tamaño de letra"
              disabled={fs >= FS_MAX}
              onClick={() => setFs((v) => Math.min(FS_MAX, v + FS_PASO))}
              className="grid h-8 w-8 place-items-center rounded-full text-foreground transition-colors hover:bg-card disabled:opacity-40"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
            </button>
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
        <article className="mx-auto w-full max-w-[760px] px-5 py-10 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
            {leccion.contexto.modulo}
          </p>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">
            {leccion.nombre}
          </h1>
          {leccion.descripcion && (
            <p className="mt-3 text-[15px] leading-relaxed text-foreground-soft">{leccion.descripcion}</p>
          )}

          <div aria-hidden className="mt-8 h-px w-full bg-border" />

          {interactiva ? (
            // Modelo NUEVO: la lección ES un interactivo H5P / paquete xAPI; se reproduce
            // desde `lecciones.config` y reporta al LRS (§5C · §7).
            <div className="mt-8">
              <LeccionInteractiva
                leccion={leccion}
                preview={preview}
                onCompletado={() => setCompletada(true)}
              />
            </div>
          ) : esAutoeval && leccion.autoeval ? (
            // Autoevaluación (modelo nuevo · §5C): el motor lee lecciones.config y
            // autocalifica contra el dominio (api). Reemplaza los bloques de contenido.
            <div className="mt-8">
              <MotorAutoevaluacion
                leccionId={leccion.id}
                autoeval={leccion.autoeval}
                preview={preview}
              />
            </div>
          ) : leccion.bloques.length === 0 ? (
            <p className="mt-10 rounded-xl border border-dashed border-border px-5 py-10 text-center text-[14px] text-muted-foreground">
              Esta lección aún no tiene contenido publicado.
            </p>
          ) : (
            <div className="mt-8 space-y-10">
              {leccion.bloques.map((b) => (
                <Bloque key={b.id} bloque={b} contexto={contexto} />
              ))}
            </div>
          )}

          {/* ══ Pie: completar + navegación ══ */}
          <div className="mt-12 border-t border-border pt-6">
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
                  {esAutoeval ? 'Autoevaluación enviada' : 'Lección completada'}
                </span>
              ) : esAutoeval ? (
                // La completa el motor al calificar; no hay botón genérico aquí.
                <span />
              ) : (
                <button
                  type="button"
                  onClick={marcar}
                  disabled={guardando}
                  className="inline-flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  {guardando ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} /> : <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />}
                  Marcar como completada
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
        </article>
      </div>
    </div>
  );
}

/* ─────────────────────────── Bloques ─────────────────────────── */

function EncabezadoBloque({ bloque }: { bloque: BloqueContenido }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`${mono} text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground`}>
        {TIPO_LABEL[bloque.tipo]}
      </span>
      {bloque.completado && (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-secondary">
          <Check className="h-3 w-3" strokeWidth={2.5} /> Visto
        </span>
      )}
    </div>
  );
}

function Bloque({ bloque, contexto }: { bloque: BloqueContenido; contexto: string }) {
  if (bloque.tipo === 'texto') {
    return (
      <section>
        {bloque.titulo && <h2 className="mb-3 text-[20px] font-bold leading-snug">{bloque.titulo}</h2>}
        <div className="cuerpo-lectura">
          <ContenidoRico html={bloque.cuerpo ?? ''} />
        </div>
      </section>
    );
  }

  if (bloque.tipo === 'video') {
    return (
      <section>
        <EncabezadoBloque bloque={bloque} />
        <BloqueVideo src={null} titulo={bloque.titulo} contexto={contexto} />
      </section>
    );
  }

  if (bloque.tipo === 'h5p') {
    return (
      <section>
        <EncabezadoBloque bloque={bloque} />
        <BloqueH5P
          modo="ver"
          contentId={bloque.recursoRef ?? undefined}
          servidorBase={null}
          titulo={bloque.titulo}
          contexto={contexto}
        />
      </section>
    );
  }

  if (bloque.tipo === 'scorm' || bloque.tipo === 'xapi') {
    const tipo: TipoPaquete | undefined = bloque.tipo === 'xapi' ? 'xapi' : 'scorm12';
    return (
      <section>
        <EncabezadoBloque bloque={bloque} />
        <BloquePaquete modo="ver" titulo={bloque.titulo} contexto={contexto} paquete={{ tipo, titulo: bloque.titulo }} />
      </section>
    );
  }

  // quiz — la autoevaluación como actividad llega en el Sprint 8.5.
  return (
    <section>
      <EncabezadoBloque bloque={bloque} />
      <div className="flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-4">
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <div>
          <p className="text-[13.5px] font-bold text-[color:var(--info-foreground)]">{bloque.titulo}</p>
          <p className="mt-0.5 text-[12.5px] text-[color:var(--info-foreground)]">
            La autoevaluación se contesta como actividad de la lección (disponible próximamente).
          </p>
        </div>
      </div>
    </section>
  );
}
