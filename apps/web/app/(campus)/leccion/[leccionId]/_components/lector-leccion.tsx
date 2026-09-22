'use client';

/**
 * LectorLeccion — lectura inmersiva de una lección (§5A · mock leccion-lectura). NO
 * tapa el shell: vive DENTRO de él. Al montar una lección de lectura (teoría /
 * autoevaluación) enciende el MODO LECTURA GLOBAL en sepia (ModoLecturaProvider), que
 * tiñe TODA la plataforma —menú lateral navy incluido, header y contenido— reescribiendo
 * los tokens del sistema. Debajo del header aparece la BARRA DE LECCIÓN (progreso "%
 * leído", A-/A+, selector de temas y navegación) y a la derecha el MENÚ DEL CURSO
 * (módulos → lecciones con palomita de completado).
 *
 * Fuera del campus (vista previa del Studio) NO hay provider: cae a un modo local que
 * aplica el tema en su propio contenedor, sin teñir un shell que ahí no existe.
 *
 * Cada bloque se renderiza con la pieza ya construida (texto con ContenidoRico; video/
 * H5P/paquetes con components/bloques). Lo que depende de object storage / servidor se
 * degrada con dignidad (contratos).
 */

import { useContext, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  Moon,
  Sun,
  Type,
  X,
} from 'lucide-react';
import { ContenidoRico } from '@/components/editor-rico';
import { BloqueTeoriaLector } from './bloque-teoria-lector';
import { BloqueVideo } from '@/components/bloques/video/bloque-video';
import { BloqueH5P } from '@/components/bloques/h5p/bloque-h5p';
import { BloquePaquete } from '@/components/bloques/paquetes/bloque-paquete';
import { MenuCurso } from './menu-curso';
import { PanelNotas } from './panel-notas';
import { MigasLeccion } from '@/components/campus/migas-leccion';
import { BarraSeleccion } from './barra-seleccion';
import { useNotas } from './usar-notas';
import { anclaDeSeleccion, pintarSubrayados } from '@/lib/campus/notas-anclaje';
import { esAnclaTexto, type AnclaTexto, type Nota } from '@/lib/campus/notas-contrato';
import type { TipoPaquete } from '@/components/bloques/contratos';
import { mono, focusRing } from '@/components/tokens';
import {
  ModoLecturaContext,
  esTemaLectura,
  CLAVE_TEMA,
  CLAVE_FS,
  FS_MIN,
  FS_MAX,
  FS_PASO,
  FS_DEFECTO,
  type TemaLectura,
} from '@/components/campus/modo-lectura';
import { MotorAutoevaluacion } from './motor-autoevaluacion';
import { marcarLeccionCompletada } from '@/lib/campus/leccion-acciones';
import { reportarProgresoInteractivo } from '@/lib/campus/players-acciones';
import { LeccionInteractiva } from './leccion-interactiva';
import {
  esLeccionInteractiva,
  TIPO_LABEL,
  type BloqueContenido,
  type ContenidoCurso,
  type LeccionCompleta,
} from '@/lib/campus/leccion-contrato';

const TEMAS: { id: TemaLectura; etiqueta: string; icono: typeof Sun }[] = [
  { id: 'claro', etiqueta: 'Claro', icono: Sun },
  { id: 'sepia', etiqueta: 'Sepia', icono: Type },
  { id: 'oscuro', etiqueta: 'Oscuro', icono: Moon },
];

export function LectorLeccion({
  leccion,
  contenidoCurso = null,
  notasIniciales = [],
  preview = false,
}: {
  leccion: LeccionCompleta;
  /** Árbol del curso para el menú del rail derecho (null si no se pudo cargar). */
  contenidoCurso?: ContenidoCurso | null;
  /** Notas del alumno para esta lección (§5A · mig 0027). Vacío en preview. */
  notasIniciales?: Nota[];
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

  // Las lecturas (teoría / autoevaluación) entran en sepia; el resto en claro. El
  // tema real respeta la preferencia guardada del alumno (ver ModoLecturaProvider).
  const esLectura = leccion.tipo === 'teoria' || leccion.tipo === 'autoevaluacion';
  const temaInicial: TemaLectura = esLectura ? 'sepia' : 'claro';

  // Modo lectura GLOBAL si hay provider (campus); si no (preview del Studio), local.
  const ctx = useContext(ModoLecturaContext);
  const [temaLocal, setTemaLocal] = useState<TemaLectura>(temaInicial);
  const [fsLocal, setFsLocal] = useState<number>(FS_DEFECTO);

  const tema = ctx ? ctx.tema : temaLocal;
  const fs = ctx ? ctx.fs : fsLocal;

  const setTema = (t: TemaLectura) => {
    if (ctx) ctx.setTema(t);
    else {
      setTemaLocal(t);
      localStorage.setItem(CLAVE_TEMA, t);
    }
  };
  const ajustarFs = (delta: number) => {
    if (ctx) ctx.ajustarFs(delta);
    else
      setFsLocal((prev) => {
        const v = Math.min(FS_MAX, Math.max(FS_MIN, prev + delta));
        localStorage.setItem(CLAVE_FS, String(v));
        return v;
      });
  };

  // Enciende el modo lectura global una sola vez al montar (y lo apaga al salir de la
  // lección). Vía ref para no reengancharse cuando cambia el valor del contexto.
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  useEffect(() => {
    const c = ctxRef.current;
    if (c) {
      // Teoría/autoeval fuerzan sepia al entrar (esLectura); el resto respeta la
      // preferencia guardada. El alumno puede cambiarlo a mano después.
      c.activar(temaInicial, esLectura);
      return () => ctxRef.current?.desactivar();
    }
    // Preview: sin provider, recupera las preferencias locales.
    const t = localStorage.getItem(CLAVE_TEMA);
    if (esTemaLectura(t)) setTemaLocal(t);
    const f = Number(localStorage.getItem(CLAVE_FS));
    if (Number.isFinite(f) && f >= FS_MIN && f <= FS_MAX) setFsLocal(f);
    return undefined;
  }, []);

  // Progreso de lectura "% leído": posición del scroll de la ventana sobre el alto útil.
  const [leido, setLeido] = useState(0);
  useEffect(() => {
    const calc = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      setLeido(alto > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / alto) * 100))) : 0);
    };
    calc();
    window.addEventListener('scroll', calc, { passive: true });
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('scroll', calc);
      window.removeEventListener('resize', calc);
    };
  }, [leccion.id]);

  const [completada, setCompletada] = useState(leccion.completada);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  // ── NOTAS del alumno (§5A · mig 0027) — deshabilitadas en preview del Studio ──
  const notasApi = useNotas(leccion.id, leccion.contexto.moduloId, notasIniciales);
  const notasActivas = !preview;
  const contenidoRef = useRef<HTMLElement>(null);
  const [seleccion, setSeleccion] = useState<{ x: number; y: number; ancla: AnclaTexto } | null>(null);

  // Muestra la barra flotante al seleccionar texto dentro de un bloque anotable.
  const alSeleccionar = () => {
    if (!notasActivas) return;
    const root = contenidoRef.current;
    if (!root) return;
    const res = anclaDeSeleccion(root);
    if (res) setSeleccion({ x: res.rect.left + res.rect.width / 2, y: res.rect.top, ancla: res.ancla });
    else setSeleccion(null);
  };

  // Oculta la barra al hacer scroll (posición fija sobre la selección).
  useEffect(() => {
    if (!seleccion) return;
    const cerrar = () => setSeleccion(null);
    window.addEventListener('scroll', cerrar, { passive: true });
    return () => window.removeEventListener('scroll', cerrar);
  }, [seleccion]);

  const guardarComoNota = async () => {
    if (!seleccion) return;
    await notasApi.crear('texto_seleccionado', '', seleccion.ancla);
    setSeleccion(null);
    window.getSelection()?.removeAllRanges();
  };
  const subrayar = async () => {
    if (!seleccion) return;
    await notasApi.crear('subrayado', '', seleccion.ancla);
    setSeleccion(null);
    window.getSelection()?.removeAllRanges();
  };

  // Lleva al texto resaltado de un subrayado (click en la nota · §5A).
  const irASubrayado = (n: Nota) => {
    if (!esAnclaTexto(n.ancla)) return;
    const bloque = contenidoRef.current?.querySelector<HTMLElement>(
      `[data-bloque-id="${CSS.escape(n.ancla.bloqueId)}"]`,
    );
    bloque?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Pinta los subrayados guardados (CSS Highlight API · sin mutar el DOM). Reintenta
  // unas veces porque ContenidoRico (ProseMirror) monta su contenido de forma diferida.
  useEffect(() => {
    if (!notasActivas) return;
    const root = contenidoRef.current;
    if (!root) return;
    const subs = notasApi.notas
      .filter((n) => n.tipo === 'subrayado' && esAnclaTexto(n.ancla))
      .map((n) => n.ancla as AnclaTexto);
    const pintar = () => pintarSubrayados(root, subs);
    const ids = [120, 500, 1200].map((ms) => window.setTimeout(pintar, ms));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [notasApi.notas, notasActivas, leccion.id]);

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

  const cuerpo = (
    <>
      {/* ══ BARRA DE LECCIÓN — debajo del header, adopta el tono del tema ══ */}
      <div className="sticky top-[68px] z-20 border-b border-border bg-card transition-colors duration-[750ms] motion-reduce:transition-none">
        <div className="mx-auto flex h-[52px] w-full max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href={preview ? `/studio/programas/${leccion.contexto.programaId}` : `/cursos`}
            aria-label={preview ? 'Salir de la vista previa' : 'Salir de la lección'}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-[12.5px] font-semibold text-foreground-soft transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <X className="h-[17px] w-[17px]" strokeWidth={1.75} />
            <span className="hidden sm:inline">{preview ? 'Salir' : 'Salir'}</span>
          </Link>

          {/* Ruta de la lección (breadcrumb) */}
          <MigasLeccion segmentos={[leccion.contexto.programa, leccion.contexto.modulo, leccion.nombre]} />

          {/* Progreso de lectura */}
          <span className="flex shrink-0 items-center gap-2.5">
            <span className="hidden h-[5px] w-[120px] overflow-hidden rounded-full bg-[color:var(--track)] sm:block">
              <span
                aria-hidden
                className="block h-full rounded-full bg-primary transition-[width] duration-150"
                style={{ width: `${leido}%` }}
              />
            </span>
            <span className={`${mono} whitespace-nowrap text-[11px] font-bold text-muted-foreground`}>
              {leido}% leído
            </span>
          </span>

          <span aria-hidden className="h-[22px] w-px shrink-0 bg-border" />

          {/* Tamaño de letra */}
          <div className="hidden items-center gap-0.5 rounded-full border border-border bg-muted p-0.5 sm:flex">
            <button
              type="button"
              aria-label="Reducir el tamaño de la letra"
              disabled={fs <= FS_MIN}
              onClick={() => ajustarFs(-FS_PASO)}
              className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-foreground transition-colors hover:bg-card disabled:opacity-40 ${focusRing}`}
            >
              A-
            </button>
            <span aria-hidden className="grid h-8 w-6 place-items-center text-muted-foreground">
              <Type className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </span>
            <button
              type="button"
              aria-label="Aumentar el tamaño de la letra"
              disabled={fs >= FS_MAX}
              onClick={() => ajustarFs(FS_PASO)}
              className={`grid h-8 w-8 place-items-center rounded-full text-[15px] font-bold text-foreground transition-colors hover:bg-card disabled:opacity-40 ${focusRing}`}
            >
              A+
            </button>
          </div>

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

          {/* Navegación anterior / siguiente */}
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

      {/* ══ 3 columnas: (lateral = shell) · contenido · menú del curso ══ */}
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_324px]">
          {/* ── Contenido (medida de lectura) ── */}
          <article ref={contenidoRef} onMouseUp={alSeleccionar} className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
              {leccion.contexto.modulo}
            </p>
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">{leccion.nombre}</h1>
            {leccion.descripcion && (
              <p className="mt-3 text-[15px] leading-relaxed text-foreground-soft">{leccion.descripcion}</p>
            )}

            <div aria-hidden className="mt-7 h-px w-full bg-border" />

            {interactiva ? (
              // Modelo NUEVO: la lección ES un interactivo H5P / paquete xAPI; se reproduce
              // desde `lecciones.config` y reporta al LRS (§5C · §7).
              <div className="mt-8">
                <LeccionInteractiva leccion={leccion} preview={preview} onCompletado={() => setCompletada(true)} />
              </div>
            ) : esAutoeval && leccion.autoeval ? (
              // Autoevaluación (modelo nuevo · §5C): el motor lee lecciones.config y
              // autocalifica contra el dominio (api). Reemplaza los bloques de contenido.
              <div className="mt-8">
                <MotorAutoevaluacion leccionId={leccion.id} autoeval={leccion.autoeval} preview={preview} />
              </div>
            ) : leccion.tipo === 'teoria' ? (
              // Teoría (modelo NUEVO · mig 0023): renderiza los bloques ordenables de
              // `lxp.bloques` (los que armó el diseñador), NO los de `lxp.contenidos`.
              leccion.bloquesTeoria.length === 0 ? (
                <p className="mt-10 rounded-xl border border-dashed border-border px-5 py-10 text-center text-[14px] text-muted-foreground">
                  Esta lección aún no tiene contenido publicado.
                </p>
              ) : (
                <div className="mt-8 space-y-10">
                  {leccion.bloquesTeoria.map((b) => (
                    <section key={b.id} data-bloque-id={b.id}>
                      <BloqueTeoriaLector bloque={b} />
                    </section>
                  ))}
                </div>
              )
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
                    className={`inline-flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-secondary disabled:opacity-60 ${focusRing}`}
                  >
                    {guardando ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
                    ) : (
                      <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />
                    )}
                    Marcar como completada
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
          </article>

          {/* ── Rail derecho: menú del curso + notas del alumno ── */}
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
                  onIrASubrayado={irASubrayado}
                />
              )}
            </aside>
          )}
        </div>
      </div>

      {/* Barra flotante de selección (guardar como nota / subrayar) */}
      {seleccion && <BarraSeleccion x={seleccion.x} y={seleccion.y} onGuardar={guardarComoNota} onSubrayar={subrayar} />}
    </>
  );

  // Con provider (campus): el tinte global lo aplica ModoLecturaProvider al shell
  // entero; aquí solo se renderiza el contenido. Sin provider (preview): se aplica el
  // tema en un contenedor local para no depender de un shell inexistente.
  if (ctx) return <div className="min-h-full">{cuerpo}</div>;
  return (
    <div
      data-tema-lectura={tema}
      style={{ ['--lectura-fs']: `${fs}px` } as React.CSSProperties}
      className="min-h-dvh bg-background text-foreground transition-colors duration-[750ms] motion-reduce:transition-none"
    >
      {cuerpo}
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
