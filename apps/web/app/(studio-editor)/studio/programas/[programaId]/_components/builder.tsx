'use client';

/**
 * Studio · Builder del programa — la pieza principal del back office (§5B).
 *
 * El programa es la PLANTILLA viva. Aquí se construye su temario: Programa →
 * Módulos → Lecciones → Bloques de actividad. La herencia y los overrides son de
 * Grupos, no de aquí.
 *
 * Header contextual propio (por eso vive en el route group (studio-editor), fuera
 * del shell general): breadcrumb + estado + Guardar / Publicar / Vista previa.
 *
 * Todas las mutaciones son server actions (CRUD directo web→Supabase bajo RLS ·
 * Regla de Oro §2). Reordenar es por teclado (↑/↓ sobre el asa) — accesible y sin
 * dependencias nuevas (§3).
 *
 * PENDIENTE DE API (dominio · §2): la PUBLICACIÓN con versionado real (snapshot de
 * versión, diff de "cambios sin publicar", aviso a docentes, estado "revisión"),
 * el HISTORIAL de versiones y la VISTA PREVIA como alumno. Aquí la publicación solo
 * alterna la visibilidad (columna `publicado`). El editor A FONDO de cada bloque
 * (subir el loop, armar el H5P, escribir preguntas) también es otra pantalla.
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  History,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { mono, kicker, softText, focusRing, focusRingDark } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import type { Modulo, ProgramaBuilder } from '@/lib/studio/datos';
import {
  INFO_TIPO_LECCION,
  TIPOS_LECCION,
  type TipoLeccion,
} from '@/lib/studio/leccion-tipos';
import {
  actualizarHorasLeccion,
  crearLeccion,
  crearModulo,
  eliminarLeccion,
  eliminarModulo,
  moverLeccion,
  moverModulo,
  renombrarLeccion,
  renombrarModulo,
  renombrarPrograma,
} from '@/lib/studio/acciones';
import { EditorDeLeccion, VISUAL_TIPO } from './editores-leccion';
import {
  obtenerHistorial,
  obtenerVersionSnapshot,
  publicarPrograma,
  type VersionHistorial,
} from '@/lib/studio/publicacion-acciones';

/* ───────────────────────── Edición inline ───────────────────────── */

function TextoEditable({
  valor,
  onGuardar,
  className,
  ariaLabel,
}: {
  valor: string;
  onGuardar: (v: string) => void;
  className?: string;
  ariaLabel: string;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setTexto(valor), [valor]);
  useEffect(() => {
    if (editando) ref.current?.select();
  }, [editando]);

  function confirmar() {
    setEditando(false);
    const limpio = texto.trim();
    if (limpio && limpio !== valor) onGuardar(limpio);
    else setTexto(valor);
  }

  if (editando) {
    return (
      <input
        ref={ref}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmar();
          if (e.key === 'Escape') {
            setTexto(valor);
            setEditando(false);
          }
        }}
        aria-label={ariaLabel}
        // El texto SIEMPRE oscuro: el campo abre sobre `bg-card` (blanco) aunque el
        // rótulo en reposo venga en claro (p.ej. el título del programa en el header
        // navy usa `text-sidebar-foreground`). Inline gana al color del className.
        style={{ color: 'var(--foreground)' }}
        className={`min-w-0 rounded-[7px] border border-secondary bg-card px-1.5 py-0.5 outline-none ${className ?? ''}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      title={`Renombrar: ${valor}`}
      className={`group/inline inline-flex min-w-0 items-center gap-1.5 rounded-[7px] px-1 -mx-1 text-left hover:bg-muted ${focusRing} ${className ?? ''}`}
    >
      <span className="min-w-0 truncate">{valor}</span>
      <Pencil
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/inline:opacity-100"
        strokeWidth={1.75}
      />
    </button>
  );
}

/* ───────────────────────────── Builder ───────────────────────────── */

export function Builder({ programa }: { programa: ProgramaBuilder }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const { id, nombre, estado, version, gruposActivos, totales, modulos } = programa;

  const moduloInicial = modulos.find((m) => m.lecciones.length > 0) ?? modulos[0];
  const [abierto, setAbierto] = useState<string[]>(moduloInicial ? [moduloInicial.id] : []);
  const [leccionId, setLeccionId] = useState<string | undefined>(
    moduloInicial?.lecciones[0]?.id,
  );
  const [dialogo, setDialogo] = useState(false);
  const [historial, setHistorial] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState<string | null>(null);
  const [errorPub, setErrorPub] = useState<string | null>(null);
  // Módulo al que se le está agregando una lección → abre el selector de tipo (§5C).
  const [selectorModulo, setSelectorModulo] = useState<string | null>(null);
  // Lección recién creada pendiente de auto-seleccionar. Guardamos el módulo y los ids
  // que YA existían al crearla: cuando el árbol revalidado traiga un id nuevo en ese
  // módulo, esa es la lección nueva → se selecciona. Comparar ids (no "la última")
  // evita la carrera de elegir sobre el árbol viejo antes de que llegue la nueva.
  const [nuevaPendiente, setNuevaPendiente] = useState<{ moduloId: string; previos: string[] } | null>(
    null,
  );

  // Si la lección seleccionada desaparece (borrada), reselecciona una válida.
  const todasLecciones = modulos.flatMap((m) => m.lecciones);
  useEffect(() => {
    if (leccionId && !todasLecciones.some((l) => l.id === leccionId)) {
      setLeccionId(todasLecciones[0]?.id);
    }
  }, [leccionId, todasLecciones]);

  // Auto-selección de la lección recién creada: cuando el árbol revalidado trae un id
  // que no existía al crearla, esa es la nueva → la selecciona y abre su editor. Espera
  // al refresh, así no pelea con el efecto de reselección de arriba.
  useEffect(() => {
    if (!nuevaPendiente) return;
    const mod = modulos.find((m) => m.id === nuevaPendiente.moduloId);
    const nueva = mod?.lecciones.find((l) => !nuevaPendiente.previos.includes(l.id));
    if (nueva) {
      setLeccionId(nueva.id);
      setNuevaPendiente(null);
    }
  }, [modulos, nuevaPendiente]);

  function correr(accion: () => Promise<void>) {
    iniciar(async () => {
      await accion();
      setGuardadoEn(haceCuanto(new Date()));
    });
  }

  const modulo = modulos.find((m) => m.lecciones.some((l) => l.id === leccionId));
  const leccion = modulo?.lecciones.find((l) => l.id === leccionId);
  const publicado = estado === 'publicado';

  // Primera lección del programa (orden módulo → lección) para abrir la vista previa.
  const primeraLeccion = todasLecciones[0];

  /** Abre la vista previa como alumno del borrador en una pestaña nueva (solo staff). */
  function abrirVistaPrevia() {
    if (!primeraLeccion) return;
    window.open(`/studio/preview/leccion/${primeraLeccion.id}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
      {/* ───── Header contextual ───── */}
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <Link
          href="/studio/programas"
          aria-label="Volver a Programas"
          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/20 text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
        >
          <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        </Link>

        <div className="flex min-w-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-[12.5px] font-medium text-white/60">Programas</span>
          <span aria-hidden className="text-white/35">/</span>
          <TextoEditable
            valor={nombre}
            onGuardar={(v) => correr(() => renombrarPrograma(id, v))}
            ariaLabel="Renombrar el programa"
            className="text-[14.5px] font-bold text-sidebar-foreground"
          />
          <span
            className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${
              publicado
                ? 'bg-primary text-[color:var(--sidebar)]'
                : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
            }`}
          >
            {publicado ? 'Publicado' : 'Borrador'}
          </span>
          <span className={`${mono} whitespace-nowrap text-[11.5px] text-white/55`}>v{version}</span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className={`${mono} inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-white/60`}>
            <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${pendiente ? 'bg-[color:var(--warning)]' : 'bg-primary'}`} />
            {pendiente ? 'guardando…' : guardadoEn ? `guardado ${guardadoEn}` : 'sin cambios'}
          </span>
          <button
            type="button"
            onClick={abrirVistaPrevia}
            disabled={!primeraLeccion}
            title={
              primeraLeccion
                ? 'Ver el curso como lo verá el alumno (borrador · pestaña nueva)'
                : 'Agrega una lección para previsualizar'
            }
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${focusRingDark}`}
          >
            <Eye aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Vista previa
          </button>
          <button
            type="button"
            // Cada edición ya se auto-guarda (server actions · web→Supabase). Este botón
            // da feedback visible: relee el árbol y actualiza el indicador "guardado".
            onClick={() => correr(async () => router.refresh())}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setDialogo(true)}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-white ${focusRingDark}`}
          >
            <Upload aria-hidden className="h-4 w-4" strokeWidth={2} />
            {publicado ? 'Publicación' : 'Publicar'}
          </button>
        </div>
      </header>

      {/* ───── Franja de contexto ───── */}
      <div className="flex h-[52px] shrink-0 items-center gap-5 overflow-x-auto border-b border-border bg-card px-6">
        {(
          [
            ['Módulos', String(totales.modulos)],
            ['Horas del programa', `${totales.horas} h`],
            ['Lecciones', String(totales.lecciones)],
            ['Bloques', String(totales.bloques)],
            ['Grupos que derivan', String(gruposActivos)],
          ] as const
        ).map(([t, v]) => (
          <span key={t} className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={`${kicker} text-muted-foreground`}>{t}</span>
            <span className={`${mono} text-[14px] font-bold`}>{v}</span>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setHistorial(true)}
          title="Ver el historial de versiones publicadas"
          className={`ml-auto inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <History aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Historial de versiones
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ════════ Estructura ════════ */}
        <aside className="flex w-[324px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
            <p className={`${kicker} text-muted-foreground`}>Estructura</p>
            <button
              type="button"
              onClick={() => correr(() => crearModulo(id))}
              className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
            >
              <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
              Módulo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 pb-4">
            {modulos.length === 0 && (
              <div className="mt-6 px-4 text-center">
                <p className="text-[13.5px] font-bold">Programa vacío</p>
                <p className={`mx-auto mt-1.5 max-w-[28ch] text-[12px] leading-relaxed ${softText}`}>
                  Agrega el primer módulo para empezar a construir el temario.
                </p>
              </div>
            )}

            {modulos.map((m, iM) => (
              <ModuloArbol
                key={m.id}
                programaId={id}
                modulo={m}
                indice={iM}
                total={modulos.length}
                abierto={abierto.includes(m.id)}
                leccionId={leccionId}
                onAlternar={() =>
                  setAbierto((a) => (a.includes(m.id) ? a.filter((x) => x !== m.id) : [...a, m.id]))
                }
                onSeleccionarLeccion={setLeccionId}
                onAgregarLeccion={setSelectorModulo}
                correr={correr}
              />
            ))}

            {modulos.length > 0 && (
              <div className="mt-2.5 flex items-center gap-2 rounded-[10px] bg-muted px-3 py-2.5">
                <span className={`${kicker} tracking-[0.1em] text-muted-foreground`}>Suma del programa</span>
                <span className={`${mono} ml-auto text-[14px] font-extrabold`}>{totales.horas} h</span>
              </div>
            )}
          </div>
        </aside>

        {/* ════════ Lienzo: la lección y sus bloques ════════ */}
        {/* `relative`: es el bloque contenedor de los absolutos internos (p.ej. los
            <input class="sr-only"> de las zonas de subida). Sin esto se anclan al <html>
            y estiran el documento → segundo scrollbar de ventana + espacio muerto. */}
        <div className="relative min-w-0 flex-1 overflow-y-auto px-7 py-6">
          {leccion && modulo ? (
            <>
              <p className={`${kicker} text-secondary`}>
                Módulo {modulo.clave} · {modulo.titulo} · Lección{' '}
                {modulo.lecciones.findIndex((l) => l.id === leccion.id) + 1}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
                  <TextoEditable
                    valor={leccion.titulo}
                    onGuardar={(v) => correr(() => renombrarLeccion(id, leccion.id, v))}
                    ariaLabel="Renombrar la lección"
                  />
                </h1>
                <ChipTipo tipo={leccion.tipo} />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                {/* Las horas acumulables se definen AQUÍ, en la lección; el módulo y
                    el programa las suman solos (mig 0022 · trigger). */}
                <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <input
                    key={leccion.id}
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={leccion.horas}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v !== leccion.horas) {
                        correr(() => actualizarHorasLeccion(id, leccion.id, v));
                      }
                    }}
                    aria-label={`Horas de la lección ${leccion.titulo}`}
                    className={`h-7 w-16 rounded-[7px] border border-border bg-muted px-2 text-[12px] text-foreground outline-none focus:border-secondary ${focusRing}`}
                  />
                  horas de la lección
                </label>
              </div>

              {/* El builder detecta el tipo y muestra el editor de ese tipo (hoy un
                  placeholder). Cada agente enchufa su editor en EDITORES_LECCION (§5C). */}
              <div className="mt-5">
                <EditorDeLeccion
                  programaId={id}
                  leccionId={leccion.id}
                  tipo={leccion.tipo}
                  titulo={leccion.titulo}
                  config={leccion.config}
                  bloques={leccion.bloques}
                  correr={correr}
                />
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center">
              <p className={`text-[14px] ${softText}`}>
                {modulos.length === 0
                  ? 'Agrega un módulo y una lección para empezar.'
                  : 'Selecciona una lección en la estructura para ver sus bloques.'}
              </p>
            </div>
          )}
        </div>

        {/* ════════ Publicación ════════ */}
        <aside className="w-[316px] shrink-0 overflow-y-auto border-l border-border bg-card p-5">
          <p className={`${kicker} text-muted-foreground`}>Publicación</p>
          <div className="mt-3.5 flex items-center gap-2">
            {(['Borrador', 'Revisión', 'Publicado'] as const).map((t, i) => {
              const activo = (publicado && i === 2) || (!publicado && i === 0);
              return (
                <span key={t} className="flex flex-1 items-center gap-2">
                  {i > 0 && <span aria-hidden className="h-[1.5px] flex-1 bg-border" />}
                  <span
                    className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${
                      activo && publicado
                        ? 'bg-primary text-[color:var(--sidebar)]'
                        : activo
                          ? 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {t}
                  </span>
                </span>
              );
            })}
          </div>

          <p className={`mt-3.5 text-[12.5px] leading-relaxed ${softText}`}>
            {publicado ? (
              <>
                Este programa está <span className="font-bold text-foreground">publicado</span>: sus{' '}
                <span className="font-bold text-foreground">{gruposActivos} grupos</span> lo ven. Al
                despublicar deja de ser visible para los alumnos.
              </>
            ) : (
              <>
                Tus cambios viven en un <span className="font-bold text-foreground">borrador</span>. Un
                programa en borrador <span className="font-bold text-foreground">no lo ve el alumno</span>{' '}
                hasta que lo publiques.
              </>
            )}
          </p>

          <div className="mt-4 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-3">
            <p className="text-[11.5px] font-bold text-[color:var(--info-foreground)]">
              Versionado — pendiente de API
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
              El snapshot de versión, el diff de cambios sin publicar y el aviso a los docentes se
              resuelven en el dominio (apps/api). Aquí se alterna la visibilidad.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDialogo(true)}
            className={`mt-3.5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            {publicado ? 'Gestionar publicación' : 'Publicar programa'}
          </button>

          <p className={`${kicker} mt-6 text-muted-foreground`}>Versión actual</p>
          <div className="mt-3 flex items-center gap-2.5 rounded-[9px] bg-accent px-2.5 py-2.5">
            <span
              aria-hidden
              className={`${mono} grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-primary text-[11px] font-bold text-[color:var(--sidebar)]`}
            >
              v{version}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold leading-snug">
                {publicado ? 'Publicada' : 'Borrador'} · actual
              </span>
              <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>
                {haceCuanto(programa.actualizado)}
              </span>
            </span>
          </div>
        </aside>
      </div>

      {/* ───── Diálogo de publicación ───── */}
      {dialogo && (
        <DialogoPublicar
          publicado={publicado}
          gruposActivos={gruposActivos}
          version={version}
          onCerrar={() => setDialogo(false)}
          onConfirmar={() => {
            setErrorPub(null);
            correr(async () => {
              const r = await publicarPrograma(id, !publicado);
              if (!r.ok) setErrorPub(r.error);
            });
            setDialogo(false);
          }}
        />
      )}

      {/* ───── Modal de historial de versiones ───── */}
      {historial && (
        <ModalHistorial programaId={id} versionActual={version} onCerrar={() => setHistorial(false)} />
      )}

      {/* ───── Selector de tipo de la nueva lección (§5C) ───── */}
      {selectorModulo && (
        <SelectorTipoLeccion
          onCerrar={() => setSelectorModulo(null)}
          onElegir={(tipo) => {
            const moduloId = selectorModulo;
            setSelectorModulo(null);
            setAbierto((a) => (a.includes(moduloId) ? a : [...a, moduloId]));
            // Ids existentes ANTES de crear: el que aparezca de más es la nueva lección.
            const previos = modulos.find((m) => m.id === moduloId)?.lecciones.map((l) => l.id) ?? [];
            setNuevaPendiente({ moduloId, previos });
            correr(() => crearLeccion(id, moduloId, tipo));
          }}
        />
      )}

      {/* ───── Aviso de error de publicación (dominio no disponible / transición inválida) ───── */}
      {errorPub && (
        <div
          role="alert"
          className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-[11px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-4 py-3 shadow-lg"
        >
          <span className="text-[12.5px] font-semibold text-[color:var(--destructive-foreground)]">{errorPub}</span>
          <button
            type="button"
            onClick={() => setErrorPub(null)}
            aria-label="Cerrar aviso"
            className={`grid h-6 w-6 place-items-center rounded-md text-[color:var(--destructive-foreground)] hover:bg-white/40 ${focusRing}`}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Módulo (árbol) ───────────────────────── */

function ModuloArbol({
  programaId,
  modulo,
  indice,
  total,
  abierto,
  leccionId,
  onAlternar,
  onSeleccionarLeccion,
  onAgregarLeccion,
  correr,
}: {
  programaId: string;
  modulo: Modulo;
  indice: number;
  total: number;
  abierto: boolean;
  leccionId: string | undefined;
  onAlternar: () => void;
  onSeleccionarLeccion: (id: string) => void;
  onAgregarLeccion: (moduloId: string) => void;
  correr: (accion: () => Promise<void>) => void;
}) {
  return (
    <div className="mb-0.5">
      <div className={`flex items-center gap-1.5 rounded-[9px] px-2 py-2 ${abierto ? 'bg-muted' : 'hover:bg-muted'}`}>
        <Asa
          ariaLabel={`Reordenar módulo ${modulo.titulo}`}
          onArriba={indice > 0 ? () => correr(() => moverModulo(programaId, modulo.id, 'arriba')) : undefined}
          onAbajo={indice < total - 1 ? () => correr(() => moverModulo(programaId, modulo.id, 'abajo')) : undefined}
        />
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierto}
          aria-label={abierto ? `Contraer ${modulo.titulo}` : `Expandir ${modulo.titulo}`}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground ${focusRing}`}
        >
          <ChevronDown
            aria-hidden
            className={`h-[15px] w-[15px] transition-transform ${abierto ? '' : '-rotate-90'}`}
            strokeWidth={2}
          />
        </button>
        <span className="min-w-0 flex-1">
          <span className={`block text-[13px] leading-snug ${abierto ? 'font-bold' : 'font-semibold'}`}>
            <span className={`${mono} mr-1 text-muted-foreground`}>{modulo.clave}</span>
            <TextoEditable
              valor={modulo.titulo}
              onGuardar={(v) => correr(() => renombrarModulo(programaId, modulo.id, v))}
              ariaLabel="Renombrar el módulo"
            />
          </span>
          <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>
            {modulo.horas} h · {modulo.lecciones.length || '—'} lecciones
          </span>
        </span>
        <button
          type="button"
          aria-label={`Eliminar módulo ${modulo.titulo}`}
          onClick={() => correr(() => eliminarModulo(programaId, modulo.id))}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
        >
          <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {abierto && (
        <div className="mb-1.5 ml-[26px] mt-0.5 border-l-[1.5px] border-border pl-3">
          {modulo.lecciones.map((l, iL) => {
            const sel = l.id === leccionId;
            const IconoTipo = VISUAL_TIPO[l.tipo].icono;
            return (
              <div
                key={l.id}
                className={`flex items-center gap-1.5 rounded-[9px] p-1.5 ${
                  sel ? 'bg-accent shadow-[inset_0_0_0_1px_var(--primary)]' : 'hover:bg-muted'
                }`}
              >
                <Asa
                  ariaLabel={`Reordenar lección ${l.titulo}`}
                  small
                  onArriba={iL > 0 ? () => correr(() => moverLeccion(programaId, modulo.id, l.id, 'arriba')) : undefined}
                  onAbajo={
                    iL < modulo.lecciones.length - 1
                      ? () => correr(() => moverLeccion(programaId, modulo.id, l.id, 'abajo'))
                      : undefined
                  }
                />
                <span
                  aria-hidden
                  title={INFO_TIPO_LECCION[l.tipo].rotulo}
                  className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md ${VISUAL_TIPO[l.tipo].clase}`}
                >
                  <IconoTipo className="h-[13px] w-[13px]" strokeWidth={1.75} />
                </span>
                <button
                  type="button"
                  onClick={() => onSeleccionarLeccion(l.id)}
                  aria-current={sel ? 'true' : undefined}
                  className={`min-w-0 flex-1 text-left ${focusRing}`}
                >
                  <span
                    className={`block truncate text-[12.5px] leading-snug ${
                      sel ? 'font-bold text-accent-foreground' : `font-medium ${softText}`
                    }`}
                  >
                    {iL + 1}. {l.titulo}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar lección ${l.titulo}`}
                  onClick={() => correr(() => eliminarLeccion(programaId, l.id))}
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
                >
                  <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => onAgregarLeccion(modulo.id)}
            className={`flex w-full items-center gap-1.5 rounded-[9px] p-2 text-left text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
          >
            <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
            Agregar lección
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Chip de tipo de lección ───────────────────────── */

function ChipTipo({ tipo }: { tipo: TipoLeccion }) {
  const info = INFO_TIPO_LECCION[tipo];
  const { icono: Icono, clase } = VISUAL_TIPO[tipo];
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${clase}`}
    >
      <Icono aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
      {info.rotulo}
    </span>
  );
}

/* ───────────────────────── Selector de tipo de lección (§5C) ───────────────────────── */

function SelectorTipoLeccion({
  onCerrar,
  onElegir,
}: {
  onCerrar: () => void;
  onElegir: (tipo: TipoLeccion) => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elige el tipo de la nueva lección"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="w-full max-w-[640px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b border-border px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>Nueva lección</p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
              ¿Qué tipo de lección?
            </h2>
            <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
              El tipo decide qué editor la construye. Se elige ahora y no cambia después.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-5">
          {TIPOS_LECCION.map((t) => {
            const info = INFO_TIPO_LECCION[t];
            const { icono: Icono, clase } = VISUAL_TIPO[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => onElegir(t)}
                className={`flex items-start gap-3 rounded-[12px] border border-border bg-card p-3.5 text-left transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
              >
                <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${clase}`}>
                  <Icono className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold leading-snug">{info.rotulo}</span>
                  <span className={`mt-0.5 block text-[11.5px] leading-relaxed ${softText}`}>
                    {info.descripcion}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Asa de reorden (teclado) ───────────────────────── */

function Asa({
  ariaLabel,
  onArriba,
  onAbajo,
  small = false,
}: {
  ariaLabel: string;
  onArriba?: () => void;
  onAbajo?: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`${ariaLabel} — usa las flechas ↑ ↓`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' && onArriba) {
          e.preventDefault();
          onArriba();
        }
        if (e.key === 'ArrowDown' && onAbajo) {
          e.preventDefault();
          onAbajo();
        }
      }}
      className={`shrink-0 cursor-grab text-[color:var(--track)] hover:text-muted-foreground ${focusRing}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        className={small ? 'h-3.5 w-3.5' : 'h-[15px] w-[15px]'}
      >
        <circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

/* ───────────────────────── Diálogo de publicación ───────────────────────── */

function DialogoPublicar({
  publicado,
  gruposActivos,
  version,
  onCerrar,
  onConfirmar,
}: {
  publicado: boolean;
  gruposActivos: number;
  version: number;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={publicado ? 'Gestionar publicación' : 'Publicar programa'}
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="w-full max-w-[540px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>{publicado ? 'Publicación' : `Publicar la v${version}`}</p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
              {publicado
                ? `Este programa lo ven sus ${gruposActivos} grupos`
                : `Los ${gruposActivos} grupos que deriven verán este programa`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <p className={`px-6 text-[13.5px] leading-relaxed ${softText}`}>
          {publicado ? (
            <>Al despublicar, el programa deja de ser visible para los alumnos. Lo ya acreditado no se recalcula.</>
          ) : (
            <>Al publicar, un borrador se vuelve visible para el alumno. El versionado con snapshot y el aviso a docentes se resolverán en el dominio (pendiente de API).</>
          )}
        </p>

        <div className="mt-5 flex items-center gap-2.5 border-t border-border bg-muted px-6 py-4">
          <span className={`${mono} text-[11.5px] text-muted-foreground`}>v{version}</span>
          <span className="ml-auto flex gap-2.5">
            <button
              type="button"
              onClick={onCerrar}
              className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              className={`inline-flex h-12 items-center gap-2 rounded-[10px] px-5 text-[14px] font-bold transition-colors ${focusRing} ${
                publicado
                  ? 'border border-border bg-card text-foreground hover:bg-accent'
                  : 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
              }`}
            >
              {publicado ? (
                'Despublicar'
              ) : (
                <>
                  <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />
                  Publicar ahora
                </>
              )}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Modal de historial de versiones ───────────────────────── */

/** Forma mínima del snapshot congelado que se muestra en el historial (§5B · api). */
type SnapshotResumen = {
  programa?: { nombre?: string };
  modulos?: { nombre?: string; horas?: number; lecciones?: unknown[] }[];
};

function ModalHistorial({
  programaId,
  versionActual,
  onCerrar,
}: {
  programaId: string;
  versionActual: number;
  onCerrar: () => void;
}) {
  const [versiones, setVersiones] = useState<VersionHistorial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResumen | null>(null);
  const [cargandoSnap, setCargandoSnap] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  useEffect(() => {
    let vivo = true;
    obtenerHistorial(programaId)
      .then((v) => {
        if (!vivo) return;
        setVersiones(v);
        if (v[0]) seleccionar(v[0].version);
      })
      .catch((e) => {
        console.error('[ModalHistorial] fallo al cargar historial:', e);
        if (vivo) setError('No se pudo cargar el historial (¿está levantada la API?).');
      });
    return () => {
      vivo = false;
    };
  }, [programaId]);

  function seleccionar(version: number) {
    setSeleccion(version);
    setSnapshot(null);
    setCargandoSnap(true);
    obtenerVersionSnapshot(programaId, version)
      .then((s) => setSnapshot((s ?? {}) as SnapshotResumen))
      .catch(() => setSnapshot(null))
      .finally(() => setCargandoSnap(false));
  }

  const lecciones = (m: { lecciones?: unknown[] }) => (Array.isArray(m.lecciones) ? m.lecciones.length : 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Historial de versiones"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="flex max-h-[80vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b border-border px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>Versionado</p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
              Historial de versiones publicadas
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr]">
          {/* Lista de versiones */}
          <div className="min-h-0 overflow-y-auto border-r border-border p-3">
            {error && <p className="px-2 py-3 text-[12.5px] text-destructive">{error}</p>}
            {!error && versiones === null && (
              <p className={`px-2 py-3 text-[12.5px] ${softText}`}>Cargando…</p>
            )}
            {!error && versiones?.length === 0 && (
              <p className={`px-2 py-3 text-[12.5px] leading-relaxed ${softText}`}>
                Aún no hay versiones publicadas. Al publicar el programa se congela la primera.
              </p>
            )}
            {versiones?.map((v) => {
              const sel = v.version === seleccion;
              return (
                <button
                  key={v.version}
                  type="button"
                  onClick={() => seleccionar(v.version)}
                  aria-current={sel ? 'true' : undefined}
                  className={`mb-1 flex w-full items-center gap-2.5 rounded-[9px] p-2.5 text-left ${
                    sel ? 'bg-accent shadow-[inset_0_0_0_1px_var(--primary)]' : 'hover:bg-muted'
                  } ${focusRing}`}
                >
                  <span
                    aria-hidden
                    className={`${mono} grid h-[30px] w-[34px] shrink-0 place-items-center rounded-[9px] text-[11px] font-bold ${
                      sel ? 'bg-primary text-[color:var(--sidebar)]' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    v{v.version}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-semibold leading-snug">Versión {v.version}</span>
                      {v.version === versionActual && (
                        <span className="inline-flex h-4 items-center rounded-full bg-accent px-1.5 text-[9.5px] font-bold uppercase tracking-wide text-accent-foreground">
                          actual
                        </span>
                      )}
                    </span>
                    <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                      {haceCuanto(new Date(v.publicadoEn))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detalle de la versión seleccionada */}
          <div className="min-h-0 overflow-y-auto p-5">
            {seleccion === null ? (
              <p className={`text-[13px] ${softText}`}>Selecciona una versión para ver su contenido congelado.</p>
            ) : cargandoSnap ? (
              <p className={`text-[13px] ${softText}`}>Cargando la versión…</p>
            ) : snapshot ? (
              <>
                <p className={`${kicker} text-muted-foreground`}>Snapshot congelado · v{seleccion}</p>
                <h3 className="mt-1.5 text-[16px] font-bold tracking-[-0.01em]">
                  {snapshot.programa?.nombre ?? 'Programa'}
                </h3>
                <p className={`${mono} mt-1 text-[11.5px] text-muted-foreground`}>
                  {snapshot.modulos?.length ?? 0} módulos ·{' '}
                  {(snapshot.modulos ?? []).reduce((s, m) => s + lecciones(m), 0)} lecciones
                </p>
                <ol className="mt-3.5 flex flex-col gap-1.5">
                  {(snapshot.modulos ?? []).map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 rounded-[9px] border border-border bg-card px-3 py-2.5"
                    >
                      <span className={`${mono} shrink-0 text-[11px] text-muted-foreground`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                        {m.nombre ?? 'Módulo'}
                      </span>
                      <span className={`${mono} shrink-0 text-[11px] text-muted-foreground`}>
                        {typeof m.horas === 'number' ? `${Math.round(m.horas)} h · ` : ''}
                        {lecciones(m)} lecciones
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className={`text-[13px] ${softText}`}>No se pudo cargar el snapshot de esta versión.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
