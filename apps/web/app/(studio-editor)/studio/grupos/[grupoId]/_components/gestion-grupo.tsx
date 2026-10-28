'use client';

/**
 * Studio · Gestión de un grupo — herencia vs personalización (§5B/§6).
 *
 * El grupo NO copia el contenido del programa: apunta a él. Lo editable aquí es lo
 * que el grupo SÍ posee: datos (nombre/modalidad/fechas), docente y sus overrides.
 * Alumnos/inscripciones son de CORA (solo lectura).
 *
 * DIVISIÓN (§2, consigna del sprint):
 *  • Real (web→Supabase): datos del grupo (server action), estructura HEREDADA del
 *    programa, y marca CRUDA de qué nodos tienen override (existe fila en
 *    lxp.grupo_overrides). El header contextual propio vive en (studio-editor).
 *  • PENDIENTE DE API (dominio, lo hace sprint45-api): la vista RESUELTA (tipo exacto
 *    del override + merge), la detección de RE-SINCRONIZACIÓN y las MUTACIONES de
 *    override (personalizar/heredar/resync) — requieren resolverHerencia/validarPatch/
 *    detectarResync y `aplicado_sobre_version` (0012). Contrato exacto en
 *    lib/studio/herencia-contrato.ts. Aquí la hoja de personalización queda cableada
 *    a un stub que lo indica; no se inventa la lógica de dominio.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ImgDerivada } from '@/components/img-derivada';
import estilosPanel from './panel-historial.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  History,
  Image as ImageIcon,
  Info,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Repeat2,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { mono, kicker, softText, focusRing, focusRingDark } from '@/lib/studio/estilos';
import type {
  AlumnoDeGrupo,
  AvisoResyncUI,
  EstadoGrupo,
  GrupoDetalle,
  LeccionGrupoEditor,
  NodoLeccionGrupo,
  NodoModuloGrupo,
} from '@/lib/studio/datos';
import type { TipoOverride } from '@/lib/studio/herencia-contrato';
import type { TipoLeccion } from '@/lib/studio/leccion-tipos';
import { Select } from '@/components/ui/select';
import {
  actualizarGrupo,
  fijarFechaApertura,
  limpiarFechaApertura,
  crearModuloGrupo,
  crearLeccionGrupo,
  eliminarModuloGrupo,
  eliminarLeccionGrupo,
  independizarLeccionGrupo,
  cargarEditorLeccionGrupo,
  volverAHeredarLeccion,
} from '@/lib/studio/acciones';
import { EditorDeLeccion } from '@/app/(studio-editor)/studio/programas/[programaId]/_components/editores-leccion';
import { firmarSubidaImagenContenido } from '@/lib/studio/media-acciones';
import { fechaCortaDia } from '@/lib/format';
import { aplicarOverride, revertirOverride, type EntidadOverrideUI } from '@/lib/studio/herencia-acciones';
import { ReemplazarRecurso } from './reemplazar-recurso';

/** Tipos de lección cuyo contenido vive en `lecciones.config` → se editan INLINE (Paso 2). */
const TIPOS_CONFIG = new Set<TipoLeccion>(['video', 'h5p', 'xapi', 'autoevaluacion', 'tarea', 'foro']);

const ESTADO: Record<EstadoGrupo, { texto: string; clase: string }> = {
  curso: { texto: 'En curso', clase: 'bg-accent text-accent-foreground' },
  proximo: {
    texto: 'Próximo',
    clase:
      'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
  },
  finalizado: { texto: 'Finalizado', clase: 'border border-border bg-muted text-muted-foreground' },
};

/** Señal de herencia: heredado (gris+eslabón) vs personalizado (violeta). El TIPO
 *  exacto (oculta/reemplaza/fecha/extra) lo resuelve el dominio (contrato). */
function Sello({ personalizado }: { personalizado: boolean }) {
  if (!personalizado) {
    return (
      <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[10.5px] font-semibold text-muted-foreground">
        <Link2 aria-hidden className="h-3 w-3" strokeWidth={1.75} />
        Heredado
      </span>
    );
  }
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
      <SlidersHorizontal aria-hidden className="h-3 w-3" strokeWidth={2} />
      Personalizado
    </span>
  );
}

function isoFecha(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

const ETIQUETA_ENTIDAD: Record<string, string> = {
  modulo: 'Módulo',
  leccion: 'Lección',
  contenido: 'Contenido',
  // Reemplazo de FUENTE por grupo (4b): se muestran como "Recurso reemplazado" en el Historial.
  bloque: 'Recurso',
  leccion_config: 'Recurso',
};

export function GestionGrupo({
  grupo,
  docentes,
  alumnos,
}: {
  grupo: GrupoDetalle;
  docentes: { userId: string; nombre: string }[];
  alumnos: AlumnoDeGrupo[];
}) {
  const router = useRouter();
  const [guardando, iniciar] = useTransition();

  const [nombre, setNombre] = useState(grupo.nombre);
  const [modalidad, setModalidad] = useState(grupo.modalidad);
  const [inicio, setInicio] = useState(isoFecha(grupo.fechaInicio));
  const [fin, setFin] = useState(isoFecha(grupo.fechaFin));
  const [docenteId, setDocenteId] = useState(grupo.docenteId ?? '');

  // Portada del grupo (§5A): subida DIRECTA (contenido, sin Presidio · §10). Muestra la
  // guardada (URL firmada del server) y, tras subir, la nueva de vida corta.
  const [portadaUrl, setPortadaUrl] = useState<string | null>(grupo.portadaUrl);
  const [subiendoPortada, setSubiendoPortada] = useState(false);
  const [errorPortada, setErrorPortada] = useState<string | null>(null);

  const [abierto, setAbierto] = useState<string[]>(
    grupo.temario.find((m) => m.personalizado || m.lecciones.some((l) => l.personalizado))?.id
      ? [grupo.temario.find((m) => m.personalizado || m.lecciones.some((l) => l.personalizado))!.id]
      : grupo.temario[0]
        ? [grupo.temario[0].id]
        : [],
  );
  const [hoja, setHoja] = useState<{
    modulo: string;
    nodo: { entidad: EntidadOverrideUI; entidadId: string; titulo: string; personalizado: boolean };
  } | null>(null);

  // Re-sincronización (#6): modal de diferencia + override en curso de re-sincronizar.
  const [verDiff, setVerDiff] = useState<AvisoResyncUI | null>(null);
  const [resyncando, setResyncando] = useState<string | null>(null);
  // Panel lateral "Historial" (conflictos + personalizaciones), oculto por defecto.
  const [historialAbierto, setHistorialAbierto] = useState(false);

  // Contenido PROPIO del grupo (Opción 1A · Etapa 4B): agregar/eliminar estructura propia.
  const [contenidoOcupado, iniciarContenido] = useTransition();
  // Modal "Agregar contenido propio": elige TIPO (lección, 7 tipos) + POSICIÓN (despues_de).
  const [agregar, setAgregar] = useState<{ modo: 'modulo' } | { modo: 'leccion'; moduloId: string } | null>(null);
  const eliminarModuloPropio = (moduloId: string) =>
    iniciarContenido(async () => {
      await eliminarModuloGrupo(grupo.id, moduloId);
      router.refresh();
    });
  const eliminarLeccionPropia = (leccionId: string) =>
    iniciarContenido(async () => {
      await eliminarLeccionGrupo(grupo.id, leccionId);
      router.refresh();
    });
  // Autorar el contenido de una lección PROPIA de TEORÍA → course builder completo (ruta · 4C).
  const editarLeccionPropia = (leccionId: string) =>
    router.push(`/studio/grupos/${grupo.id}/leccion/${leccionId}`);

  // ── Editor INLINE para los tipos de config (Paso 2 · copy-on-write) ──
  // Al editar una lección de config HEREDADA: se independiza (copia a fila propia) y se monta
  // EditorDeLeccion sobre la copia; si ya es propia, se monta directo. Guardar persiste con las
  // actions existentes (se llavean por leccionId → escriben la copia del grupo).
  const [editorInline, setEditorInline] = useState<{ leccionId: string; data: LeccionGrupoEditor } | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const abrirEditorInline = (leccion: NodoLeccionGrupo) =>
    iniciarContenido(async () => {
      setEditorError(null);
      let destino = leccion.id;
      if (!leccion.esPropio) {
        const r = await independizarLeccionGrupo(grupo.id, leccion.id);
        if (!r.ok) {
          setEditorError(r.error);
          return;
        }
        destino = r.leccionId;
      }
      const data = await cargarEditorLeccionGrupo(grupo.id, destino);
      if (!data) {
        setEditorError('No se pudo abrir el editor de esta lección.');
        return;
      }
      setEditorInline({ leccionId: destino, data });
      router.refresh();
    });
  const cerrarEditorInline = () => {
    setEditorInline(null);
    router.refresh();
  };
  // Volver a heredar (Paso 3): descarta la copia → reaparece la heredada del programa (versión actual).
  const volverAHeredar = (leccionId: string) =>
    iniciarContenido(async () => {
      setEditorError(null);
      const r = await volverAHeredarLeccion(grupo.id, leccionId);
      if (!r.ok) {
        setEditorError(r.error);
        return;
      }
      setEditorInline((e) => (e && e.leccionId === leccionId ? null : e));
      router.refresh();
    });
  // `correr` del editor inline: ejecuta la action y refresca el indicador del temario.
  const correrEditor = (accion: () => Promise<void>) =>
    iniciarContenido(async () => {
      await accion();
      router.refresh();
    });

  function resincronizar(r: AvisoResyncUI) {
    const clave = `${r.entidad}:${r.entidadId}`;
    setResyncando(clave);
    iniciar(async () => {
      // Re-sincronizar = DESCARTAR el override → el nodo vuelve a heredar (DELETE ya existente).
      await revertirOverride(grupo.id, r.entidad as EntidadOverrideUI, r.entidadId);
      setResyncando(null);
      setVerDiff((d) => (d && `${d.entidad}:${d.entidadId}` === clave ? null : d));
      router.refresh();
    });
  }

  const cambiado =
    nombre !== grupo.nombre ||
    modalidad !== grupo.modalidad ||
    inicio !== isoFecha(grupo.fechaInicio) ||
    fin !== isoFecha(grupo.fechaFin) ||
    docenteId !== (grupo.docenteId ?? '');

  function guardar() {
    iniciar(() =>
      actualizarGrupo(grupo.id, {
        nombre,
        modalidad,
        fechaInicio: modalidad === 'sincrono' ? inicio : null,
        fechaFin: modalidad === 'sincrono' ? fin : null,
        docenteId: docenteId || null,
      }),
    );
  }

  function extDe(nombre: string): string {
    const m = /\.([a-zA-Z0-9]+)$/.exec(nombre);
    const e = (m?.[1] ?? 'jpg').toLowerCase();
    return e === 'jpeg' ? 'jpg' : e;
  }

  async function subirPortada(file: File) {
    setErrorPortada(null);
    setSubiendoPortada(true);
    try {
      const sol = await firmarSubidaImagenContenido(extDe(file.name));
      if (!sol.ok) {
        setErrorPortada(sol.error);
        return;
      }
      const put = await fetch(sol.datos.urlSubida, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'image/jpeg' },
        body: file,
      }).catch(() => null);
      if (!put || !put.ok) {
        setErrorPortada('No se pudo subir la imagen (URL firmada). Reintenta.');
        return;
      }
      setPortadaUrl(sol.datos.urlLectura);
      iniciar(async () => {
        await actualizarGrupo(grupo.id, { imagenPortada: sol.datos.ref });
        router.refresh();
      });
    } finally {
      setSubiendoPortada(false);
    }
  }

  function quitarPortada() {
    setPortadaUrl(null);
    iniciar(async () => {
      await actualizarGrupo(grupo.id, { imagenPortada: null });
      router.refresh();
    });
  }

  // Etiqueta legible de cada override crudo, resolviendo el título del nodo.
  const tituloDeNodo = useMemo(() => {
    const m = new Map<string, string>();
    for (const mod of grupo.temario) {
      m.set(mod.id, `${mod.clave} · ${mod.titulo}`);
      for (const l of mod.lecciones) m.set(l.id, l.titulo);
    }
    return m;
  }, [grupo.temario]);

  const docenteNombre = docentes.find((d) => d.userId === docenteId)?.nombre;

  // Claves (entidad:id) de los overrides en conflicto, para el chip ámbar del índice (#6).
  const resyncKeys = useMemo(
    () => new Set(grupo.resync.map((r) => `${r.entidad}:${r.entidadId}`)),
    [grupo.resync],
  );

  return (
    <div className="flex h-dvh flex-col bg-background font-sans text-foreground antialiased">
      {/* ───── Header contextual ───── */}
      <header className="relative z-20 flex h-[var(--studio-header)] shrink-0 items-center gap-3 bg-sidebar px-5">
        <Link
          href="/studio/grupos"
          aria-label="Volver a Grupos"
          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/20 text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
        >
          <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        </Link>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-[12.5px] font-medium text-white/60">Grupos</span>
          <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/35" strokeWidth={2} />
          <span className="truncate text-[14.5px] font-bold text-sidebar-foreground">{grupo.nombre}</span>
          <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11.5px] font-bold ${ESTADO[grupo.estado].clase}`}>
            {ESTADO[grupo.estado].texto}
          </span>
          {grupo.overrides.length > 0 && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--info-foreground)]">
              <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              {grupo.overrides.length} personalizaciones
            </span>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={!cambiado || guardando}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-white disabled:opacity-50 ${focusRingDark}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={2} />
            {guardando ? 'Guardando…' : cambiado ? 'Guardar cambios' : 'Guardado'}
          </button>
        </div>
      </header>

      {/* ───── Franja: de dónde hereda ───── */}
      <div className="flex h-[var(--studio-franja)] shrink-0 items-center gap-5 overflow-x-auto border-b border-border bg-card px-6">
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className={`${kicker} text-muted-foreground`}>Programa base</span>
          <Link
            href={`/studio/programas/${grupo.programa.id}`}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-secondary no-underline"
          >
            <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            {grupo.programa.nombre}
            <span className={`${mono} font-normal text-muted-foreground`}>v{grupo.programa.version}</span>
          </Link>
        </span>
        <span aria-hidden className="h-[22px] w-px shrink-0 bg-border" />
        {(
          [
            ['Modalidad', modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono', false],
            ['Módulos', String(grupo.totales.modulos), true],
            ['Horas', `${grupo.totales.horas} h`, true],
          ] as const
        ).map(([t, v, esMono]) => (
          <span key={t} className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={`${kicker} text-muted-foreground`}>{t}</span>
            <span className={`text-[13.5px] font-bold ${esMono ? mono : ''}`}>{v}</span>
          </span>
        ))}
        <span className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-3 text-[12px] font-semibold text-muted-foreground">
          <Lock aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className={mono}>{alumnos.length}</span> alumnos · CORA
        </span>
        <button
          type="button"
          onClick={() => setHistorialAbierto(true)}
          aria-haspopup="dialog"
          aria-expanded={historialAbierto}
          className={`relative inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
            grupo.resync.length > 0
              ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)] hover:brightness-95'
              : 'border-border bg-card text-foreground hover:bg-muted'
          }`}
        >
          <History aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          Historial
          {grupo.resync.length > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--warning-foreground)] px-1 text-[10px] font-bold text-white">
              {grupo.resync.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ════════ Lo que el grupo SÍ posee ════════ */}
        <aside className="w-[328px] shrink-0 overflow-y-auto border-r border-border bg-card p-5">
          <p className={`${kicker} text-muted-foreground`}>Datos del grupo</p>
          <div className="mt-3.5 flex flex-col gap-2.5">
            <label className="block">
              <span className="block text-[11.5px] font-semibold">Nombre del grupo</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-[10px] border border-border bg-card px-3 text-[13.5px] font-medium text-foreground outline-none transition-colors focus:border-secondary"
              />
            </label>
            <label className="block">
              <span className="block text-[11.5px] font-semibold">Modalidad</span>
              <Select
                aria-label="Modalidad"
                value={modalidad}
                onChange={(v) => setModalidad(v as 'sincrono' | 'asincrono')}
                className={`mt-1.5 flex h-10 w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-[13.5px] font-medium text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
                options={[
                  { value: 'sincrono', label: 'Síncrono · con fechas' },
                  { value: 'asincrono', label: 'Asíncrono · sin fechas' },
                ]}
              />
            </label>
            {modalidad === 'sincrono' &&
              (
                [
                  ['Inicio', inicio, setInicio] as const,
                  ['Fin', fin, setFin] as const,
                ]
              ).map(([l, val, set]) => (
                <label key={l} className="block">
                  <span className="block text-[11.5px] font-semibold">{l}</span>
                  <span className="mt-1.5 flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3">
                    <Calendar aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <input
                      type="date"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className={`${mono} w-full bg-transparent text-[13px] text-foreground outline-none`}
                    />
                  </span>
                </label>
              ))}
          </div>

          <p className={`${kicker} mt-6 text-muted-foreground`}>Docente asignado</p>
          <div className="mt-2.5 flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3">
            <span
              aria-hidden
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sidebar text-[9px] font-bold text-sidebar-foreground"
            >
              {docenteNombre ? docenteNombre.replace(/^(Dr\.|Dra\.)\s*/, '').slice(0, 2).toUpperCase() : '—'}
            </span>
            <div className="min-w-0 flex-1">
              <Select
                aria-label="Docente asignado"
                value={docenteId}
                onChange={(v) => setDocenteId(v)}
                className="flex w-full items-center gap-2 bg-transparent text-[13.5px] font-medium text-foreground outline-none"
                placeholder="Sin asignar"
                options={[
                  { value: '', label: 'Sin asignar' },
                  ...docentes.map((d) => ({ value: d.userId, label: d.nombre })),
                ]}
              />
            </div>
          </div>

          <p className={`${kicker} mt-6 text-muted-foreground`}>Portada del grupo</p>
          {errorPortada && (
            <p className="mt-2 rounded-[9px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[11.5px] font-medium text-[color:var(--destructive-foreground)]">
              {errorPortada}
            </p>
          )}
          <div className="mt-2.5 overflow-hidden rounded-[11px] border border-border bg-muted">
            {portadaUrl ? (
              // <img> a propósito: URL firmada de object storage, no asset local de next/image.
              <ImgDerivada url={portadaUrl} srcset={portadaUrl === grupo.portadaUrl ? grupo.portadaSrcset : undefined} sizes="(max-width: 680px) 100vw, 640px" className="aspect-[16/9] w-full object-cover" />
            ) : (
              <div className="grid aspect-[16/9] w-full place-items-center text-muted-foreground">
                <span className="flex flex-col items-center gap-1.5">
                  <ImageIcon aria-hidden className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-[11px]">Hereda la del programa</span>
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label
              className={`inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${
                subiendoPortada ? 'pointer-events-none opacity-60' : ''
              } ${focusRing}`}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={subiendoPortada}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void subirPortada(f);
                  e.target.value = '';
                }}
              />
              {subiendoPortada ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : portadaUrl ? (
                <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Upload aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              )}
              {subiendoPortada ? 'Subiendo…' : portadaUrl ? 'Reemplazar' : 'Subir portada'}
            </label>
            {portadaUrl && !subiendoPortada && (
              <button
                type="button"
                onClick={quitarPortada}
                aria-label="Quitar portada"
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:text-destructive ${focusRing}`}
              >
                <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
          <p className={`mt-1.5 text-[11px] leading-relaxed ${softText}`}>
            Contenido educativo (JPG/PNG). Se ve en el listado de grupos y en Mis cursos del alumno.
          </p>

          <p className={`${kicker} mt-6 text-muted-foreground`}>Calendario de liberación</p>
          {modalidad === 'sincrono' ? (
            <CalendarioLiberacion grupoId={grupo.id} modulos={grupo.temario} onCambio={() => router.refresh()} />
          ) : (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-[11px] border border-border bg-muted px-3 py-2.5">
              <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <p className={`text-[11.5px] leading-relaxed ${softText}`}>
                Sin fechas: en modalidad <span className="font-bold">asíncrona</span> todos los módulos
                están disponibles desde la inscripción. La liberación por fecha aplica solo a grupos
                síncronos.
              </p>
            </div>
          )}
        </aside>

        {/* ════════ Contenido: heredado vs personalizado ════════ */}
        {/* Etapa 5 (5A): el centro usa el MISMO ancho que el lienzo del course builder de
            Programas (flex-1 sin max-width), para que el editor de contenido propio del grupo
            tenga el mismo espacio. Se soltó el cap `max-w-[760px]` anterior. */}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="w-full">
          <h2 className="text-[17px] font-extrabold tracking-[-0.015em]">Contenido del grupo</h2>
          <p className={`mt-1.5 text-[13px] leading-relaxed ${softText}`}>
            Todo viene del programa y se actualiza solo. Lo que este grupo personalizó se queda como
            lo dejó.
          </p>

          {/* leyenda */}
          <div className="mt-3.5 flex flex-wrap items-center gap-4 rounded-[11px] border border-border bg-card px-4 py-3">
            <span className={`${kicker} text-muted-foreground`}>Cómo leerlo</span>
            <span className={`inline-flex items-center gap-1.5 text-[12px] ${softText}`}>
              <Sello personalizado={false} />
              se actualiza cuando se corrige el programa
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[12px] ${softText}`}>
              <Sello personalizado />
              lo cambió este grupo · no se toca
            </span>
          </div>

          {/* Los conflictos de re-sincronización viven ahora en el panel lateral "Historial"
              (botón en la franja de contexto). El centro queda solo con el temario. */}

          {editorError && (
            <div
              role="alert"
              className="mt-4 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-medium text-[color:var(--destructive-foreground)]"
            >
              {editorError}
            </div>
          )}

          {/* temario */}
          <ul className="mt-4 flex flex-col gap-2.5">
            {grupo.temario.map((m) => (
              <ModuloNodo
                key={m.id}
                modulo={m}
                abierto={abierto.includes(m.id)}
                ocupado={contenidoOcupado}
                onAlternar={() =>
                  setAbierto((a) => (a.includes(m.id) ? a.filter((x) => x !== m.id) : [...a, m.id]))
                }
                onPersonalizar={(nodo) => setHoja({ modulo: m.titulo, nodo })}
                onAgregarLeccion={() => setAgregar({ modo: 'leccion', moduloId: m.id })}
                onEliminarPropio={() => eliminarModuloPropio(m.id)}
                onEliminarLeccionPropia={eliminarLeccionPropia}
                onEditarLeccionPropia={editarLeccionPropia}
                onEditarInline={abrirEditorInline}
                onVolverAHeredar={volverAHeredar}
                editorInline={editorInline}
                onCerrarEditor={cerrarEditorInline}
                correrEditor={correrEditor}
              />
            ))}
          </ul>

          {/* Agregar contenido PROPIO del grupo (Opción 1A · solo este grupo) */}
          <button
            type="button"
            onClick={() => setAgregar({ modo: 'modulo' })}
            className={`mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] border border-dashed border-[color:var(--track)] bg-card px-4 text-[13px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            Agregar módulo del grupo
          </button>

          {grupo.temario.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-[color:var(--track)] bg-card px-6 py-10 text-center">
              <p className="text-[14px] font-bold">El programa base aún no tiene módulos</p>
              <p className={`mx-auto mt-1.5 max-w-[44ch] text-[12.5px] ${softText}`}>
                Agrega módulos y lecciones en el programa; el grupo los heredará solo.
              </p>
            </div>
          )}

          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            El contenido no se copia: el grupo apunta al programa. Personalizar guarda solo la
            excepción, así que una corrección en el programa llega sola a todo lo heredado.
          </p>
          </div>
        </div>

        {/* ════════ Consulta: alumnos (CORA) + overrides ════════ */}
        <aside className="w-[316px] shrink-0 overflow-y-auto border-l border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <p className={`${kicker} text-muted-foreground`}>Alumnos y avance</p>
            <span className="ml-auto inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold text-muted-foreground">
              <Lock aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              Solo lectura
            </span>
          </div>
          <p className={`mt-2 text-[11.5px] leading-relaxed ${softText}`}>
            Inscripción y nombres vienen de <span className="font-semibold text-foreground">CORA</span>{' '}
            (solo lectura); el avance es su progreso real en el temario del grupo.
          </p>
          {alumnos.length === 0 ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-[11px] border border-border bg-muted px-3 py-2.5">
              <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <p className={`text-[11.5px] leading-relaxed ${softText}`}>
                Este grupo aún no tiene alumnos inscritos en CORA.
              </p>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5">
              {alumnos.map((a) => (
                <li key={a.userId} className="rounded-[11px] border border-border bg-card px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sidebar text-[10px] font-bold text-sidebar-foreground"
                    >
                      {a.nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '—'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold leading-snug">{a.nombre}</span>
                      {a.matricula && (
                        <span className={`${mono} block text-[10.5px] text-muted-foreground`}>{a.matricula}</span>
                      )}
                    </span>
                    <span className={`${mono} shrink-0 text-[12px] font-bold ${a.avancePct > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {a.avancePct}%
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-muted"
                    role="progressbar"
                    aria-valuenow={a.avancePct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Avance de ${a.nombre}`}
                  >
                    <div className="h-full rounded-pill bg-primary transition-[width] duration-300" style={{ width: `${a.avancePct}%` }} />
                  </div>
                  <p className="mt-1 text-[10.5px] text-muted-foreground">
                    {a.completadas} de {a.totalLecciones} lecciones
                  </p>
                </li>
              ))}
            </ul>
          )}

          {/* "Personalizaciones de este grupo" se movió al panel lateral "Historial". */}
        </aside>
      </div>

      {/* ───── Hoja: personalizar un nodo (mutación = dominio) ───── */}
      {hoja && (
        <HojaPersonalizar
          grupoId={grupo.id}
          modulo={hoja.modulo}
          nodo={hoja.nodo}
          grupoNombre={grupo.nombre}
          modalidad={modalidad}
          fechaAperturaActual={
            hoja.nodo.entidad === 'modulo'
              ? isoFecha(grupo.temario.find((m) => m.id === hoja.nodo.entidadId)?.fechaApertura ?? null)
              : ''
          }
          onCerrar={() => setHoja(null)}
          onGuardado={() => router.refresh()}
        />
      )}

      {/* ───── Panel lateral "Historial": conflictos + personalizaciones (drawer) ─────
          Montado SIEMPRE (controlado por `abierto`) para que anime también la SALIDA
          (contrato del overlay CSS-nativo · @starting-style + allow-discrete). */}
      <PanelHistorial
        abierto={historialAbierto}
        resync={grupo.resync}
        overrides={grupo.overrides}
        resyncKeys={resyncKeys}
        tituloDeNodo={tituloDeNodo}
        resyncando={resyncando}
        onVerDiff={setVerDiff}
        onResincronizar={resincronizar}
        onCerrar={() => setHistorialAbierto(false)}
      />

      {/* ───── Diferencia: programa actual vs personalización del grupo (#6) ───── */}
      {verDiff && (
        <DialogoDiferencia
          aviso={verDiff}
          reSincronizando={resyncando === `${verDiff.entidad}:${verDiff.entidadId}`}
          onReSincronizar={() => resincronizar(verDiff)}
          onCerrar={() => setVerDiff(null)}
        />
      )}

      {/* ───── Agregar contenido PROPIO del grupo: tipo (7) + posición (despues_de) ───── */}
      {agregar && (
        <ModalAgregarContenido
          grupoId={grupo.id}
          objetivo={agregar}
          temario={grupo.temario}
          ocupado={contenidoOcupado}
          onCerrar={() => setAgregar(null)}
          onEnviar={(fn) =>
            iniciarContenido(async () => {
              await fn();
              setAgregar(null);
              router.refresh();
            })
          }
        />
      )}
    </div>
  );
}

/* ───────────────────────── Modal: agregar contenido propio (tipo + posición) ───────────────────────── */

const ETIQUETA_TIPO: Record<TipoLeccion, string> = {
  teoria: 'Teoría',
  video: 'Video',
  autoevaluacion: 'Autoevaluación',
  tarea: 'Tarea',
  foro: 'Foro',
  h5p: 'Interactivo H5P',
  xapi: 'Paquete xAPI / SCORM',
};

function ModalAgregarContenido({
  grupoId,
  objetivo,
  temario,
  ocupado,
  onCerrar,
  onEnviar,
}: {
  grupoId: string;
  objetivo: { modo: 'modulo' } | { modo: 'leccion'; moduloId: string };
  temario: NodoModuloGrupo[];
  ocupado: boolean;
  onCerrar: () => void;
  onEnviar: (fn: () => Promise<void>) => void;
}) {
  const esLeccion = objetivo.modo === 'leccion';
  const moduloDestino = esLeccion ? temario.find((m) => m.id === objetivo.moduloId) : null;

  const [tipo, setTipo] = useState<TipoLeccion>('teoria');
  const [despuesDe, setDespuesDe] = useState<string>(''); // '' = al inicio

  // Opciones de posición: "Al inicio" + "Después de <cada hermano>".
  const hermanos = esLeccion
    ? (moduloDestino?.lecciones ?? []).map((l, i) => ({ value: l.id, label: `Después de ${i + 1}. ${l.titulo}` }))
    : temario.map((m) => ({ value: m.id, label: `Después de ${m.clave} · ${m.titulo}` }));
  const opcionesPosicion = [
    { value: '', label: esLeccion ? 'Al inicio del módulo' : 'Al inicio del temario' },
    ...hermanos,
  ];

  function confirmar() {
    const pos = despuesDe || null;
    onEnviar(() =>
      esLeccion
        ? crearLeccionGrupo(grupoId, objetivo.moduloId, tipo, pos)
        : crearModuloGrupo(grupoId, pos),
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={esLeccion ? 'Agregar lección del grupo' : 'Agregar módulo del grupo'}
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 px-6 pb-4 pt-6">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]">
            <Plus className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-extrabold leading-snug tracking-[-0.015em]">
              {esLeccion ? 'Agregar lección del grupo' : 'Agregar módulo del grupo'}
            </h2>
            <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
              Contenido exclusivo de este grupo. {esLeccion && moduloDestino ? `En ${moduloDestino.clave} · ${moduloDestino.titulo}.` : ''}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}>
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 pb-2">
          {esLeccion && (
            <label className="block">
              <span className="block text-[11.5px] font-semibold">Tipo de lección</span>
              <Select
                aria-label="Tipo de lección"
                value={tipo}
                onChange={(v) => setTipo(v as TipoLeccion)}
                className={`mt-1.5 flex h-10 w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-[13.5px] font-medium text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
                options={(Object.keys(ETIQUETA_TIPO) as TipoLeccion[]).map((t) => ({ value: t, label: ETIQUETA_TIPO[t] }))}
              />
            </label>
          )}
          <label className="block">
            <span className="block text-[11.5px] font-semibold">Posición</span>
            <Select
              aria-label="Posición"
              value={despuesDe}
              onChange={setDespuesDe}
              className={`mt-1.5 flex h-10 w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-[13.5px] font-medium text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
              options={opcionesPosicion}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2.5 border-t border-border bg-muted px-6 py-4">
          <button type="button" onClick={onCerrar} disabled={ocupado} className={`h-11 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}>
            Cancelar
          </button>
          <button type="button" onClick={confirmar} disabled={ocupado} className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}>
            {ocupado ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />}
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Panel lateral "Historial" (drawer derecho) ───────────────────────── */

/**
 * Off-canvas desde el borde derecho con dos secciones: "Conflictos" (resync · solo si hay) y
 * "Personalizaciones del grupo" (índice de overrides con sus chips). Mueve aquí, sin cambiar su
 * lógica, lo que antes vivía en la banda central y la columna derecha. Cierra con Esc / clic fuera
 * / botón X; foco inicial al cerrar; `aria-modal`.
 */
function PanelHistorial({
  abierto,
  resync,
  overrides,
  resyncKeys,
  tituloDeNodo,
  resyncando,
  onVerDiff,
  onResincronizar,
  onCerrar,
}: {
  abierto: boolean;
  resync: AvisoResyncUI[];
  overrides: GrupoDetalle['overrides'];
  resyncKeys: Set<string>;
  tituloDeNodo: Map<string, string>;
  resyncando: string | null;
  onVerDiff: (r: AvisoResyncUI) => void;
  onResincronizar: (r: AvisoResyncUI) => void;
  onCerrar: () => void;
}) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  // Esc cierra (solo mientras está abierto; el panel vive montado para animar la salida).
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [abierto, onCerrar]);
  // Foco al botón de cerrar al abrir (el panel está siempre montado → no uso autoFocus).
  useEffect(() => {
    if (abierto) cerrarRef.current?.focus();
  }, [abierto]);

  return (
    // Capa de posicionamiento SIEMPRE montada; sin puntero cuando está cerrada (deja pasar
    // los clics a la página). Los hijos interactivos restauran pointer-events.
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* overlay tenue (clic fuera cierra) · fade-in/out */}
      <button
        type="button"
        aria-label="Cerrar historial"
        data-open={abierto}
        onClick={onCerrar}
        className={`${estilosPanel.backdrop} pointer-events-auto absolute inset-0 cursor-default`}
        style={{ background: 'rgba(15,45,82,.32)' }}
      />
      {/* panel · entra deslizando desde la derecha */}
      <aside
        data-open={abierto}
        role="dialog"
        aria-modal="true"
        aria-label="Historial del grupo"
        className={`${estilosPanel.panel} pointer-events-auto absolute right-0 top-0 h-full w-[380px] max-w-[92vw] flex-col border-l border-border bg-card shadow-2xl`}
      >
        <header className="flex h-[56px] shrink-0 items-center gap-2.5 border-b border-border px-5">
          <History aria-hidden className="h-[18px] w-[18px] shrink-0 text-secondary" strokeWidth={1.75} />
          <span className="text-[15px] font-extrabold tracking-[-0.01em]">Historial</span>
          {resync.length > 0 && (
            <span className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[color:var(--warning-foreground)] px-1.5 text-[10.5px] font-bold text-white">
              {resync.length}
            </span>
          )}
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* ── Sección: Conflictos (solo si hay) ── */}
          {resync.length > 0 && (
            <section>
              <p className={`${kicker} text-[color:var(--warning-foreground)]`}>Conflictos</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[color:var(--warning-foreground)]">
                El programa base cambió en {resync.length === 1 ? 'un nodo que este grupo personalizó' : `${resync.length} nodos que este grupo personalizó`}.
                Revisa la diferencia y decide si re-sincronizas (descarta la excepción y el nodo vuelve a heredar la versión actual).
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {resync.map((r) => (
                  <li
                    key={`${r.entidad}:${r.entidadId}`}
                    className="flex flex-col gap-2.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold leading-snug text-[color:var(--warning-foreground)]">
                        {r.donde}
                        {r.tituloActual ? ` · ${r.tituloActual}` : ''}
                      </span>
                      <span className={`${mono} mt-0.5 block text-[11px] text-[color:var(--warning-foreground)]`}>
                        {r.motivo === 'huerfano'
                          ? 'el nodo ya no existe en el programa'
                          : `personalizado sobre v${r.aplicadoSobreVersion} · programa en v${r.versionActual}`}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      {r.motivo !== 'huerfano' && (
                        <button
                          type="button"
                          onClick={() => onVerDiff(r)}
                          className={`h-9 shrink-0 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3 text-[12px] font-semibold text-[color:var(--warning-foreground)] transition-colors hover:brightness-95 ${focusRing}`}
                        >
                          Ver la diferencia
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onResincronizar(r)}
                        disabled={resyncando === `${r.entidad}:${r.entidadId}`}
                        className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-sidebar px-3 text-[12px] font-bold text-sidebar-foreground transition-colors hover:bg-secondary disabled:opacity-60 ${focusRingDark}`}
                      >
                        {resyncando === `${r.entidad}:${r.entidadId}` ? (
                          <Loader2 aria-hidden className="h-[14px] w-[14px] animate-spin" strokeWidth={2} />
                        ) : (
                          <RefreshCw aria-hidden className="h-[14px] w-[14px]" strokeWidth={2} />
                        )}
                        Re-sincronizar
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Sección: Personalizaciones del grupo ── */}
          <section className={resync.length > 0 ? 'mt-6' : ''}>
            <p className={`${kicker} text-muted-foreground`}>Personalizaciones del grupo</p>
            {overrides.length === 0 ? (
              <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
                Este grupo sigue el programa base sin cambios. Personaliza un nodo del temario para
                apartarlo de las correcciones futuras.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {overrides.map((o) => {
                  const enConflicto = resyncKeys.has(`${o.entidad}:${o.entidadId}`);
                  return (
                    <li
                      key={o.id}
                      className="flex gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 py-2.5"
                    >
                      <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--info)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-bold leading-snug text-[color:var(--info-foreground)]">
                          {o.entidad === 'bloque' || o.entidad === 'leccion_config'
                            ? 'Recurso reemplazado'
                            : `${ETIQUETA_ENTIDAD[o.entidad] ?? o.entidad} personalizado`}
                        </span>
                        {/* Ubicación legible si la conocemos (módulo/lección); un bloque no está en el índice → se omite. */}
                        {tituloDeNodo.get(o.entidadId) && (
                          <span className="mt-0.5 block truncate text-[11.5px] text-[color:var(--info-foreground)]">
                            {tituloDeNodo.get(o.entidadId)}
                          </span>
                        )}
                        {enConflicto && (
                          <span className="mt-1.5 inline-flex h-5 items-center gap-1 rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                            <RefreshCw aria-hidden className="h-2.5 w-2.5" strokeWidth={2.2} />
                            El programa cambió
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── Diferencia: programa actual vs grupo (#6) ───────────────────────── */

/** Etiqueta legible de un campo del patch (lo que el grupo personalizó). */
const ETIQUETA_CAMPO: Record<string, string> = {
  nombre: 'Título',
  descripcion: 'Descripción',
  orden: 'Orden',
  horas: 'Horas',
  oculto: 'Visibilidad',
};

function valorLegible(clave: string, valor: unknown): string {
  if (clave === 'oculto') return valor ? 'Oculto en este grupo' : 'Visible';
  if (valor === null || valor === undefined || valor === '') return '—';
  return String(valor);
}

function DialogoDiferencia({
  aviso,
  reSincronizando,
  onReSincronizar,
  onCerrar,
}: {
  aviso: AvisoResyncUI;
  reSincronizando: boolean;
  onReSincronizar: () => void;
  onCerrar: () => void;
}) {
  // Campos personalizados = claves del patch. Para cada uno: valor del programa ACTUAL vs el
  // del grupo. "nombre" usa el título actual del nodo; el resto no tiene espejo directo en el
  // detalle → se muestra "(valor vigente del programa)" como referencia honesta (sin historial).
  const campos = Object.keys(aviso.patch);
  // Reemplazo de FUENTE (4b): no se muestra la ref cruda ni campo-a-campo; solo "Recurso
  // reemplazado" vs "recurso del programa" (§decisión 4).
  const esFuente = aviso.entidad === 'bloque' || aviso.entidad === 'leccion_config';
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ver la diferencia"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="w-full max-w-[640px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 px-6 pb-4 pt-6">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]">
            <RefreshCw className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-[color:var(--warning-foreground)]`}>El programa cambió aquí</p>
            <h2 className="mt-1.5 text-[18px] font-extrabold leading-snug tracking-[-0.015em]">
              {aviso.donde}
              {aviso.tituloActual ? ` · ${aviso.tituloActual}` : ''}
            </h2>
            <p className={`${mono} mt-0.5 text-[11.5px] text-muted-foreground`}>
              personalizado sobre v{aviso.aplicadoSobreVersion} · programa en v{aviso.versionActual}
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

        <div className="px-6">
          <div className="grid grid-cols-2 gap-3">
            {/* Programa ACTUAL */}
            <div className="rounded-[11px] border border-border bg-muted p-3.5">
              <p className={`${kicker} text-muted-foreground`}>Programa actual</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                Lo que trae hoy el programa base (v{aviso.versionActual}).
              </p>
              {esFuente ? (
                <p className="mt-2.5 text-[13px] font-medium text-foreground">El recurso del programa.</p>
              ) : (
                <ul className="mt-2.5 flex flex-col gap-2">
                  {campos.map((c) => (
                    <li key={c}>
                      <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {ETIQUETA_CAMPO[c] ?? c}
                      </span>
                      <span className="mt-0.5 block text-[13px] font-medium text-foreground">
                        {c === 'nombre'
                          ? aviso.tituloActual ?? '—'
                          : c === 'oculto'
                            ? 'Visible'
                            : '(valor vigente del programa)'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Personalización del GRUPO */}
            <div className="rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-3.5">
              <p className={`${kicker} text-[color:var(--info-foreground)]`}>Personalización del grupo</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
                Lo que este grupo fijó y mantiene.
              </p>
              {esFuente ? (
                <p className="mt-2.5 text-[13px] font-bold text-[color:var(--info-foreground)]">Recurso reemplazado.</p>
              ) : (
                <ul className="mt-2.5 flex flex-col gap-2">
                  {campos.map((c) => (
                    <li key={c}>
                      <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[color:var(--info-foreground)]">
                        {ETIQUETA_CAMPO[c] ?? c}
                      </span>
                      <span className="mt-0.5 block text-[13px] font-bold text-[color:var(--info-foreground)]">
                        {valorLegible(c, aviso.patch[c])}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3">
            <RefreshCw aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning-foreground)]" strokeWidth={2} />
            <p className="text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
              Re-sincronizar <span className="font-bold">descarta la personalización</span> de este
              nodo: el grupo vuelve a heredar lo que trae el programa actual. No se puede deshacer.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-border bg-muted px-6 py-4">
          <button
            type="button"
            onClick={onCerrar}
            className={`h-11 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onReSincronizar}
            disabled={reSincronizando}
            className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-sidebar px-5 text-[13.5px] font-bold text-sidebar-foreground transition-colors hover:bg-secondary disabled:opacity-60 ${focusRingDark}`}
          >
            {reSincronizando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <RefreshCw aria-hidden className="h-4 w-4" strokeWidth={2} />}
            Re-sincronizar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Módulo del temario del grupo ───────────────────────── */

function ModuloNodo({
  modulo,
  abierto,
  ocupado,
  onAlternar,
  onPersonalizar,
  onAgregarLeccion,
  onEliminarPropio,
  onEliminarLeccionPropia,
  onEditarLeccionPropia,
  onEditarInline,
  onVolverAHeredar,
  editorInline,
  onCerrarEditor,
  correrEditor,
}: {
  modulo: NodoModuloGrupo;
  abierto: boolean;
  ocupado: boolean;
  onAlternar: () => void;
  onPersonalizar: (nodo: { entidad: EntidadOverrideUI; entidadId: string; titulo: string; personalizado: boolean }) => void;
  onAgregarLeccion: () => void;
  onEliminarPropio: () => void;
  onEliminarLeccionPropia: (leccionId: string) => void;
  onEditarLeccionPropia: (leccionId: string) => void;
  onEditarInline: (leccion: NodoLeccionGrupo) => void;
  onVolverAHeredar: (leccionId: string) => void;
  editorInline: { leccionId: string; data: LeccionGrupoEditor } | null;
  onCerrarEditor: () => void;
  correrEditor: (accion: () => Promise<void>) => void;
}) {
  const resaltar = modulo.personalizado || modulo.esPropio;
  return (
    <li className={`overflow-hidden rounded-xl border bg-card ${resaltar ? 'border-[color:var(--info-border)]' : 'border-border'}`}>
      <div className={`flex items-center gap-3 px-4 py-3.5 ${resaltar ? 'bg-[color:var(--info-surface)]' : ''} ${abierto ? 'border-b border-border' : ''}`}>
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierto}
          className={`flex min-w-0 flex-1 items-center gap-3 text-left ${focusRing}`}
        >
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${abierto ? '' : '-rotate-90'}`}
            strokeWidth={2}
          />
          <span
            aria-hidden
            className={`${mono} grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-[11.5px] font-bold ${
              resaltar ? 'bg-[color:var(--info)] text-white' : 'bg-muted text-muted-foreground'
            }`}
          >
            {modulo.clave}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold leading-snug">{modulo.titulo}</span>
            <span className={`${mono} mt-0.5 block text-[11.5px] text-muted-foreground`}>
              {modulo.horas} h · {modulo.lecciones.length || '—'} lecciones
            </span>
          </span>
        </button>
        {modulo.esPropio ? (
          <>
            <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11px] font-bold text-[color:var(--info-foreground)]">
              Propio del grupo
            </span>
            <button
              type="button"
              onClick={onEliminarPropio}
              disabled={ocupado}
              aria-label="Eliminar módulo del grupo"
              className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60 ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </>
        ) : (
          <>
            <Sello personalizado={modulo.personalizado} />
            <button
              type="button"
              onClick={() => onPersonalizar({ entidad: 'modulo', entidadId: modulo.id, titulo: `${modulo.clave} · ${modulo.titulo}`, personalizado: modulo.personalizado })}
              className={`h-[34px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              {modulo.personalizado ? 'Editar cambio' : 'Personalizar'}
            </button>
          </>
        )}
      </div>

      {abierto && (
        <ul className="px-2 pb-2.5 pt-1.5">
          {modulo.lecciones.map((l, i) => (
            <LeccionNodo
              key={l.id}
              leccion={l}
              indice={i}
              ocupado={ocupado}
              onPersonalizar={() => onPersonalizar({ entidad: 'leccion', entidadId: l.id, titulo: l.titulo, personalizado: l.personalizado })}
              onEliminarPropia={() => onEliminarLeccionPropia(l.id)}
              onEditarPropia={() => onEditarLeccionPropia(l.id)}
              onEditarInline={() => onEditarInline(l)}
              onVolverAHeredar={() => onVolverAHeredar(l.id)}
              editorAbierto={editorInline?.leccionId === l.id}
              editorData={editorInline?.leccionId === l.id ? editorInline.data : null}
              onCerrarEditor={onCerrarEditor}
              correrEditor={correrEditor}
            />
          ))}
          <li className="px-1 pt-1.5">
            <button
              type="button"
              onClick={onAgregarLeccion}
              disabled={ocupado}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-[color:var(--track)] bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent disabled:opacity-60 ${focusRing}`}
            >
              <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} /> Agregar lección del grupo
            </button>
          </li>
        </ul>
      )}
    </li>
  );
}

function LeccionNodo({
  leccion,
  indice,
  ocupado,
  onPersonalizar,
  onEliminarPropia,
  onEditarPropia,
  onEditarInline,
  onVolverAHeredar,
  editorAbierto,
  editorData,
  onCerrarEditor,
  correrEditor,
}: {
  leccion: NodoLeccionGrupo;
  indice: number;
  ocupado: boolean;
  onPersonalizar: () => void;
  onEliminarPropia: () => void;
  onEditarPropia: () => void;
  onEditarInline: () => void;
  onVolverAHeredar: () => void;
  editorAbierto: boolean;
  editorData: LeccionGrupoEditor | null;
  onCerrarEditor: () => void;
  correrEditor: (accion: () => Promise<void>) => void;
}) {
  const resaltar = leccion.personalizado || leccion.esPropio;
  const esConfig = TIPOS_CONFIG.has(leccion.tipo);
  // Confirmación inline para "volver a heredar" (descarta la copia → acción destructiva).
  const [confirmarHeredar, setConfirmarHeredar] = useState(false);
  const btnEditar =
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-bold transition-colors disabled:opacity-60';
  const btnBorde =
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-secondary transition-colors hover:bg-accent';
  return (
    <li
      className={`rounded-[9px] ${
        resaltar ? 'bg-[color:var(--info-surface)] shadow-[inset_3px_0_0_var(--info)]' : 'hover:bg-muted'
      }`}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className={`min-w-0 flex-1 text-[13px] leading-relaxed ${resaltar ? 'font-semibold' : ''}`}>
          {indice + 1}. {leccion.titulo}
        </span>

        {/* Sello. Editada = copy-on-write (Paso 2); en ÁMBAR si quedó DESFASADA del programa (Paso 3). */}
        {leccion.editada ? (
          leccion.desfasada ? (
            <span
              title="El programa cambió de versión desde que editaste esto."
              className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 text-[11px] font-bold text-amber-800"
            >
              <Info aria-hidden className="h-3 w-3" strokeWidth={2.2} /> Editada · desfasada
            </span>
          ) : (
            <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11px] font-bold text-[color:var(--info-foreground)]">
              <Pencil aria-hidden className="h-3 w-3" strokeWidth={2} /> Editada para este grupo
            </span>
          )
        ) : leccion.esPropio ? (
          <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11px] font-bold text-[color:var(--info-foreground)]">
            Propio
          </span>
        ) : (
          <Sello personalizado={leccion.personalizado} />
        )}

        {/* Acciones. Config (video/h5p/xapi/autoeval/tarea/foro) → editor INLINE (Paso 2);
            teoría conserva la ruta de autoría (su edición por-bloque es el Paso 4). */}
        {esConfig ? (
          <>
            {!leccion.esPropio && (
              <button type="button" onClick={onPersonalizar} className={`${btnBorde} ${focusRing}`}>
                Personalizar
              </button>
            )}
            <button
              type="button"
              onClick={onEditarInline}
              disabled={ocupado}
              aria-expanded={editorAbierto}
              className={`${btnEditar} ${focusRing} ${
                editorAbierto
                  ? 'bg-[color:var(--info)] text-white'
                  : 'bg-primary text-[color:var(--sidebar)] hover:bg-secondary hover:text-white'
              }`}
            >
              <Pencil aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.9} />
              {editorAbierto ? 'Editando…' : 'Editar'}
            </button>
            {leccion.editada ? (
              // Volver a heredar (Paso 3): descarta la copia → reaparece la heredada actual.
              confirmarHeredar ? (
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmarHeredar(false);
                      onVolverAHeredar();
                    }}
                    disabled={ocupado}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 text-[11.5px] font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60 ${focusRing}`}
                  >
                    <RefreshCw aria-hidden className="h-[13px] w-[13px]" strokeWidth={2} /> Descartar y heredar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarHeredar(false)}
                    className={`h-8 shrink-0 rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarHeredar(true)}
                  disabled={ocupado}
                  title="Descartar la copia del grupo y volver a heredar del programa (versión actual)."
                  className={`${btnBorde} ${focusRing}`}
                >
                  <RefreshCw aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.9} /> Volver a heredar
                </button>
              )
            ) : (
              leccion.esPropio && (
                <button
                  type="button"
                  onClick={onEliminarPropia}
                  disabled={ocupado}
                  aria-label="Eliminar lección del grupo"
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60 ${focusRing}`}
                >
                  <Trash2 aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
                </button>
              )
            )}
          </>
        ) : leccion.esPropio ? (
          <>
            <button type="button" onClick={onEditarPropia} className={`${btnBorde} ${focusRing}`}>
              <Pencil aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.9} /> Editar contenido
            </button>
            <button
              type="button"
              onClick={onEliminarPropia}
              disabled={ocupado}
              aria-label="Eliminar lección del grupo"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60 ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onPersonalizar}
            className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold transition-colors hover:bg-accent ${focusRing} ${
              leccion.personalizado ? 'text-[color:var(--info-foreground)]' : 'text-secondary'
            }`}
          >
            {leccion.personalizado ? 'Editar cambio' : 'Personalizar'}
          </button>
        )}
      </div>

      {/* Aviso de DESFASE (Paso 3): la copia se congeló sobre una versión anterior del programa. */}
      {leccion.editada && leccion.desfasada && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-[9px] border border-amber-200 bg-amber-50 px-3 py-2">
          <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" strokeWidth={2} />
          <p className="text-[11.5px] leading-relaxed text-amber-800">
            El programa avanzó de versión desde que editaste esta lección para el grupo. Tu copia no
            recibe esas correcciones. Revísala, o usa <span className="font-bold">Volver a heredar</span>{' '}
            para descartarla y adoptar la versión actual.
          </p>
        </div>
      )}

      {/* Editor INLINE sobre la copia propia (copy-on-write · Paso 2). */}
      {editorAbierto && editorData && (
        <div className="border-t border-border px-3 pb-3.5 pt-2.5">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className={`${kicker} text-secondary`}>
              Editando solo para este grupo · el programa y otros grupos no se tocan
            </span>
            <button
              type="button"
              onClick={onCerrarEditor}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
            >
              <X aria-hidden className="h-[13px] w-[13px]" strokeWidth={2} /> Cerrar
            </button>
          </div>
          <div className="rounded-[11px] border border-border bg-card p-4">
            <EditorDeLeccion
              programaId={editorData.programaId}
              leccionId={editorData.leccionId}
              tipo={editorData.tipo}
              titulo={editorData.titulo}
              config={editorData.config}
              bloques={editorData.bloques}
              correr={correrEditor}
            />
          </div>
        </div>
      )}
    </li>
  );
}

/* ───────────────────────── Hoja: personalizar (mutación = dominio) ───────────────────────── */

/** Selección del modal: overrides del dominio + 'heredar' + 'recurso' (reemplazo de fuente · 4b). */
type SeleccionModal = TipoOverride | 'heredar' | 'recurso';

type OpcionOverride = {
  k: SeleccionModal;
  icono: typeof Link2;
  t: string;
  d: string;
  /** Aún no soportado por el dominio (no se puede guardar todavía). */
  pendiente?: boolean;
};

const OPCIONES: OpcionOverride[] = [
  { k: 'heredar', icono: Link2, t: 'Mantener heredada', d: 'Sigue el programa base. Es el estado recomendado.' },
  { k: 'recurso', icono: Repeat2, t: 'Reemplazar un recurso', d: 'Cambia el video, imagen, PDF o galería de esta lección solo para este grupo; el resto sigue heredado.' },
  { k: 'reemplaza', icono: Pencil, t: 'Cambiar el título en este grupo', d: 'Renombra este nodo solo para este grupo; el resto sigue heredado.' },
  { k: 'oculta', icono: EyeOff, t: 'Ocultar en este grupo', d: 'El alumno no la verá ni contará en su avance. Nada se borra del programa.' },
  {
    k: 'fecha',
    icono: Calendar,
    t: 'Mover su fecha',
    d: 'Fecha de apertura propia del grupo. Antes de ese día el alumno ve el módulo bloqueado.',
  },
];

function HojaPersonalizar({
  grupoId,
  modulo,
  nodo,
  grupoNombre,
  modalidad,
  fechaAperturaActual,
  onCerrar,
  onGuardado,
}: {
  grupoId: string;
  modulo: string;
  nodo: { entidad: EntidadOverrideUI; entidadId: string; titulo: string; personalizado: boolean };
  grupoNombre: string;
  modalidad: 'sincrono' | 'asincrono';
  /** Fecha de apertura actual del módulo (ISO) para precargar el selector; '' si no tiene. */
  fechaAperturaActual: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [seleccion, setSeleccion] = useState<SeleccionModal>('heredar');
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [fechaSel, setFechaSel] = useState(fechaAperturaActual);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  // Opciones según el nodo: "Mover su fecha" solo en MÓDULOS síncronos (calendario · mig 0087);
  // "Reemplazar un recurso" solo en LECCIONES (ahí viven los recursos · 4b). Las que no aplican
  // se omiten (mock §4).
  const permiteFecha = nodo.entidad === 'modulo' && modalidad === 'sincrono';
  const opciones = OPCIONES.filter(
    (o) => (o.k !== 'fecha' || permiteFecha) && (o.k !== 'recurso' || nodo.entidad === 'leccion'),
  );

  // 'recurso' se guarda desde su propio panel (no por el botón genérico).
  const invalido =
    (seleccion === 'fecha' && !fechaSel.trim()) || (seleccion === 'reemplaza' && !nuevoTitulo.trim());

  function guardar() {
    setError(null);
    iniciar(async () => {
      let r: { ok: boolean; error?: string };
      if (seleccion === 'heredar') {
        r = await revertirOverride(grupoId, nodo.entidad, nodo.entidadId);
      } else if (seleccion === 'oculta') {
        r = await aplicarOverride(grupoId, { entidad: nodo.entidad, entidadId: nodo.entidadId, patch: { oculto: true } });
      } else if (seleccion === 'reemplaza') {
        const nom = nuevoTitulo.trim();
        if (!nom) {
          setError('Escribe el nuevo título para este grupo.');
          return;
        }
        r = await aplicarOverride(grupoId, { entidad: nodo.entidad, entidadId: nodo.entidadId, patch: { nombre: nom } });
      } else if (seleccion === 'fecha') {
        // Calendario de liberación (mig 0087), no override: upsert la fecha de apertura del módulo.
        if (!fechaSel.trim()) {
          setError('Elige la fecha de apertura.');
          return;
        }
        r = await fijarFechaApertura(grupoId, nodo.entidadId, fechaSel);
      } else {
        return;
      }
      if (!r.ok) {
        setError(r.error ?? 'No se pudo guardar la personalización.');
        return;
      }
      onGuardado();
      onCerrar();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personalizar en este grupo"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="w-full max-w-[600px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-[color:var(--info-foreground)]`}>Personalizar en este grupo</p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
              {modulo === nodo.titulo ? nodo.titulo : `${modulo} · ${nodo.titulo}`}
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

        <div className="px-6">
          <p className={`text-[13.5px] leading-relaxed ${softText}`}>
            Hoy este nodo es <span className="font-bold text-foreground">heredado</span>: cualquier
            corrección en el programa llega sola. Si lo personalizas, este grupo deja de recibir esos
            cambios aquí.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {opciones.map(({ k, icono: Icono, t, d, pendiente }) => {
              const on = k === seleccion;
              return (
                <label
                  key={k}
                  className={`flex items-start gap-3 rounded-[11px] border p-3.5 transition-colors ${
                    pendiente
                      ? 'cursor-not-allowed border-border opacity-55'
                      : on
                        ? 'cursor-pointer border-[color:var(--info)] bg-[color:var(--info-surface)]'
                        : 'cursor-pointer border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="override"
                    checked={on}
                    disabled={pendiente}
                    onChange={() => setSeleccion(k)}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[color:var(--info)]"
                  />
                  <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${on ? 'bg-[color:var(--info)] text-white' : 'bg-muted text-muted-foreground'}`}>
                    <Icono className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`flex items-center gap-1.5 text-[13.5px] font-bold leading-snug ${on ? 'text-[color:var(--info-foreground)]' : ''}`}>
                      {t}
                      {pendiente && (
                        <span className="inline-flex h-[18px] items-center rounded-full bg-muted px-1.5 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">
                          Próximamente
                        </span>
                      )}
                    </span>
                    <span className={`mt-1 block text-[12.5px] leading-relaxed ${on ? 'text-[color:var(--info-foreground)]' : 'text-muted-foreground'}`}>{d}</span>
                    {on && k === 'reemplaza' && (
                      <input
                        value={nuevoTitulo}
                        onChange={(e) => setNuevoTitulo(e.target.value)}
                        placeholder={`Nuevo título · antes: ${nodo.titulo}`}
                        className={`mt-2.5 h-9 w-full rounded-[9px] border border-border bg-card px-3 text-[13px] text-foreground outline-none focus:border-secondary ${focusRing}`}
                      />
                    )}
                    {on && k === 'fecha' && (
                      <span className="mt-2.5 flex h-9 w-full items-center gap-2 rounded-[9px] border border-border bg-card px-3">
                        <Calendar aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                        <input
                          type="date"
                          value={fechaSel}
                          onChange={(e) => setFechaSel(e.target.value)}
                          className={`${mono} w-full bg-transparent text-[13px] text-foreground outline-none`}
                        />
                      </span>
                    )}
                    {on && k === 'recurso' && (
                      <ReemplazarRecurso grupoId={grupoId} leccionId={nodo.entidadId} onCambio={onGuardado} />
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-medium text-[color:var(--destructive-foreground)]">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-start gap-3 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-3">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
            <p className="text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
              Solo se guarda la excepción, no una copia. Si el programa cambia aquí, te avisaremos para
              que decidas si re-sincronizas. <span className="font-bold">Mover su fecha</span> fija la
              apertura del módulo en este grupo (calendario de liberación).
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2.5 border-t border-border bg-muted px-6 py-4">
          <span className={`${mono} min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground`}>
            personalización de {grupoNombre}
          </span>
          <button
            type="button"
            onClick={onCerrar}
            className={`h-11 shrink-0 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Cerrar
          </button>
          {/* 'recurso' tiene su propio "Guardar reemplazo" por recurso (panel self-persist). */}
          {seleccion !== 'recurso' && (
            <button
              type="button"
              onClick={guardar}
              disabled={invalido || guardando}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
            >
              {guardando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />}
              Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Calendario de liberación (19b · mig 0087) ───────────────────────── */

/** Día UTC (yyyymmdd) para comparar `date` sin desfase (igual criterio que el consumidor). */
function diaUTCNum(d: Date): number {
  return d.getUTCFullYear() * 10000 + d.getUTCMonth() * 100 + d.getUTCDate();
}

/**
 * Lista de módulos con su fecha de apertura por grupo (solo síncrono · mock 19b). Una fila
 * por módulo: punto de estado (abierto/programado), "NN · título", date-picker inline y
 * botón de limpiar. Escribe vía las server actions `fijarFechaApertura`/`limpiarFechaApertura`
 * (upsert/delete en lxp.grupo_calendario). Sin fecha = abierto (candado de seguridad).
 */
function CalendarioLiberacion({
  grupoId,
  modulos,
  onCambio,
}: {
  grupoId: string;
  modulos: NodoModuloGrupo[];
  onCambio: () => void;
}) {
  const [guardando, iniciar] = useTransition();
  const hoy = diaUTCNum(new Date());

  function fijar(moduloId: string, fecha: string) {
    if (!fecha) return;
    iniciar(async () => {
      await fijarFechaApertura(grupoId, moduloId, fecha);
      onCambio();
    });
  }
  function limpiar(moduloId: string) {
    iniciar(async () => {
      await limpiarFechaApertura(grupoId, moduloId);
      onCambio();
    });
  }

  if (modulos.length === 0) {
    return (
      <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
        El programa base aún no tiene módulos que liberar.
      </p>
    );
  }

  return (
    <>
      <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
        Fija la fecha de apertura de cada módulo para este grupo. Antes de esa fecha el alumno lo ve
        bloqueado. Sin fecha = abierto desde el inicio.
      </p>
      <ul className="mt-3 flex flex-col gap-0.5">
        {modulos.map((m) => {
          const programado = m.fechaApertura !== null && diaUTCNum(new Date(m.fechaApertura)) > hoy;
          const iso = m.fechaApertura ? new Date(m.fechaApertura).toISOString().slice(0, 10) : '';
          // #3: una sola columna — nombre del módulo arriba, selector de fecha DEBAJO
          // (apilado, con espacio cómodo), no lado a lado (la columna es estrecha).
          return (
            <li key={m.id} className="flex flex-col gap-2 rounded-[9px] px-2.5 py-2.5 hover:bg-muted">
              <span className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className={`mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full ${programado ? 'bg-[color:var(--info)]' : 'bg-primary'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold leading-snug">
                    {m.clave} · {m.titulo}
                  </span>
                  <span className={`mt-0.5 block text-[10.5px] ${programado ? 'text-[color:var(--info-foreground)]' : 'text-muted-foreground'}`}>
                    {m.fechaApertura ? (programado ? `se abre el ${fechaCortaDia(new Date(m.fechaApertura))}` : 'abierto') : 'abierto por defecto'}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-1.5 pl-[17px]">
                <span className="flex h-9 flex-1 items-center gap-2 rounded-[9px] border border-border bg-card px-2.5">
                  <Calendar aria-hidden className="h-[14px] w-[14px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <input
                    type="date"
                    value={iso}
                    disabled={guardando}
                    onChange={(e) => fijar(m.id, e.target.value)}
                    aria-label={`Fecha de apertura de ${m.clave} · ${m.titulo}`}
                    className={`${mono} w-full bg-transparent text-[12px] text-foreground outline-none`}
                  />
                </span>
                {m.fechaApertura && (
                  <button
                    type="button"
                    onClick={() => limpiar(m.id)}
                    disabled={guardando}
                    aria-label={`Quitar fecha de ${m.clave}`}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60 ${focusRing}`}
                  >
                    {guardando ? <Loader2 aria-hidden className="h-[14px] w-[14px] animate-spin" strokeWidth={1.75} /> : <Trash2 aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.75} />}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
