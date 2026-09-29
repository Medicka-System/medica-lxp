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

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Image as ImageIcon,
  Info,
  Link2,
  Loader2,
  Lock,
  Pencil,
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
  EstadoGrupo,
  GrupoDetalle,
  NodoLeccionGrupo,
  NodoModuloGrupo,
} from '@/lib/studio/datos';
import type { TipoOverride } from '@/lib/studio/herencia-contrato';
import { Select } from '@/components/ui/select';
import { actualizarGrupo } from '@/lib/studio/acciones';
import { firmarSubidaImagenContenido } from '@/lib/studio/media-acciones';
import { aplicarOverride, revertirOverride, type EntidadOverrideUI } from '@/lib/studio/herencia-acciones';

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

  return (
    <div className="flex h-dvh flex-col bg-background font-sans text-foreground antialiased">
      {/* ───── Header contextual ───── */}
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
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
      <div className="flex h-[52px] shrink-0 items-center gap-5 overflow-x-auto border-b border-border bg-card px-6">
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
              <img src={portadaUrl} alt="Portada del grupo" className="aspect-[16/9] w-full object-cover" />
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
          <div className="mt-2.5 flex items-start gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 py-2.5">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
            <p className="text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
              La liberación por módulo (fecha de apertura de cada módulo en este grupo) aún{' '}
              <span className="font-bold">no existe</span>: el dominio de herencia (
              <span className={mono}>validarPatch</span>) todavía no admite un campo de fecha
              (whitelist: nombre/descripción/orden/horas/oculto) y el esquema solo guarda inicio/fin
              del grupo. Falta el override tipo <span className={mono}>fecha</span> punta a punta.
            </p>
          </div>
        </aside>

        {/* ════════ Contenido: heredado vs personalizado ════════ */}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
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

          {/* nota de resync (la detección real es del dominio) */}
          <div className="mt-3.5 flex items-start gap-3 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] p-3.5">
            <RefreshCw aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--warning-foreground)]" strokeWidth={2} />
            <p className="text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
              Cuando el programa base cambie en un nodo que este grupo personalizó, aquí aparecerá el
              aviso de <span className="font-bold">re-sincronización</span> (ver la diferencia /
              re-sincronizar). Esa detección la resuelve el dominio (apps/api) —{' '}
              <span className="font-bold">pendiente de API</span>.
            </p>
          </div>

          {/* temario */}
          <ul className="mt-4 flex flex-col gap-2.5">
            {grupo.temario.map((m) => (
              <ModuloNodo
                key={m.id}
                modulo={m}
                abierto={abierto.includes(m.id)}
                onAlternar={() =>
                  setAbierto((a) => (a.includes(m.id) ? a.filter((x) => x !== m.id) : [...a, m.id]))
                }
                onPersonalizar={(nodo) => setHoja({ modulo: m.titulo, nodo })}
              />
            ))}
          </ul>

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

          <p className={`${kicker} mt-6 text-muted-foreground`}>Personalizaciones de este grupo</p>
          {grupo.overrides.length === 0 ? (
            <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
              Este grupo sigue el programa base sin cambios. Personaliza un nodo del temario para
              apartarlo de las correcciones futuras.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {grupo.overrides.map((o) => (
                <li
                  key={o.id}
                  className="flex gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 py-2.5"
                >
                  <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--info)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold leading-snug text-[color:var(--info-foreground)]">
                      {ETIQUETA_ENTIDAD[o.entidad] ?? o.entidad} personalizado
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-[color:var(--info-foreground)]">
                      {tituloDeNodo.get(o.entidadId) ?? o.entidadId}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* ───── Hoja: personalizar un nodo (mutación = dominio) ───── */}
      {hoja && (
        <HojaPersonalizar
          grupoId={grupo.id}
          modulo={hoja.modulo}
          nodo={hoja.nodo}
          grupoNombre={grupo.nombre}
          onCerrar={() => setHoja(null)}
          onGuardado={() => router.refresh()}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Módulo del temario del grupo ───────────────────────── */

function ModuloNodo({
  modulo,
  abierto,
  onAlternar,
  onPersonalizar,
}: {
  modulo: NodoModuloGrupo;
  abierto: boolean;
  onAlternar: () => void;
  onPersonalizar: (nodo: { entidad: EntidadOverrideUI; entidadId: string; titulo: string; personalizado: boolean }) => void;
}) {
  return (
    <li className={`overflow-hidden rounded-xl border bg-card ${modulo.personalizado ? 'border-[color:var(--info-border)]' : 'border-border'}`}>
      <div className={`flex items-center gap-3 px-4 py-3.5 ${modulo.personalizado ? 'bg-[color:var(--info-surface)]' : ''} ${abierto ? 'border-b border-border' : ''}`}>
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
              modulo.personalizado ? 'bg-[color:var(--info)] text-white' : 'bg-muted text-muted-foreground'
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
        <Sello personalizado={modulo.personalizado} />
        <button
          type="button"
          onClick={() => onPersonalizar({ entidad: 'modulo', entidadId: modulo.id, titulo: `${modulo.clave} · ${modulo.titulo}`, personalizado: modulo.personalizado })}
          className={`h-[34px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
        >
          {modulo.personalizado ? 'Editar cambio' : 'Personalizar'}
        </button>
      </div>

      {abierto && modulo.lecciones.length > 0 && (
        <ul className="px-2 pb-2.5 pt-1.5">
          {modulo.lecciones.map((l, i) => (
            <LeccionNodo key={l.id} leccion={l} indice={i} onPersonalizar={() => onPersonalizar({ entidad: 'leccion', entidadId: l.id, titulo: l.titulo, personalizado: l.personalizado })} />
          ))}
        </ul>
      )}
    </li>
  );
}

function LeccionNodo({
  leccion,
  indice,
  onPersonalizar,
}: {
  leccion: NodoLeccionGrupo;
  indice: number;
  onPersonalizar: () => void;
}) {
  return (
    <li
      className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 ${
        leccion.personalizado
          ? 'bg-[color:var(--info-surface)] shadow-[inset_3px_0_0_var(--info)]'
          : 'hover:bg-muted'
      }`}
    >
      <span className={`min-w-0 flex-1 text-[13px] leading-relaxed ${leccion.personalizado ? 'font-semibold' : ''}`}>
        {indice + 1}. {leccion.titulo}
      </span>
      <Sello personalizado={leccion.personalizado} />
      <button
        type="button"
        onClick={onPersonalizar}
        className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[11.5px] font-semibold transition-colors hover:bg-accent ${focusRing} ${
          leccion.personalizado ? 'text-[color:var(--info-foreground)]' : 'text-secondary'
        }`}
      >
        {leccion.personalizado ? 'Editar cambio' : 'Personalizar'}
      </button>
    </li>
  );
}

/* ───────────────────────── Hoja: personalizar (mutación = dominio) ───────────────────────── */

type OpcionOverride = {
  k: TipoOverride | 'heredar';
  icono: typeof Link2;
  t: string;
  d: string;
  /** Aún no soportado por el dominio (no se puede guardar todavía). */
  pendiente?: boolean;
};

const OPCIONES: OpcionOverride[] = [
  { k: 'heredar', icono: Link2, t: 'Mantener heredada', d: 'Sigue el programa base. Es el estado recomendado.' },
  { k: 'reemplaza', icono: Repeat2, t: 'Cambiar el título en este grupo', d: 'Renombra este nodo solo para este grupo; el resto sigue heredado.' },
  { k: 'oculta', icono: EyeOff, t: 'Ocultar en este grupo', d: 'El alumno no la verá ni contará en su avance. Nada se borra del programa.' },
  {
    k: 'fecha',
    icono: Calendar,
    t: 'Mover su fecha',
    d: 'Fecha de apertura propia del grupo. Aún no disponible: el dominio no admite override de fecha.',
    pendiente: true,
  },
];

function HojaPersonalizar({
  grupoId,
  modulo,
  nodo,
  grupoNombre,
  onCerrar,
  onGuardado,
}: {
  grupoId: string;
  modulo: string;
  nodo: { entidad: EntidadOverrideUI; entidadId: string; titulo: string; personalizado: boolean };
  grupoNombre: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [seleccion, setSeleccion] = useState<TipoOverride | 'heredar'>(nodo.personalizado ? 'reemplaza' : 'heredar');
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  const invalido =
    seleccion === 'fecha' || (seleccion === 'reemplaza' && !nuevoTitulo.trim());

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
      } else {
        return; // 'fecha' es pendiente: el botón está deshabilitado
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
            {OPCIONES.map(({ k, icono: Icono, t, d, pendiente }) => {
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
              Al guardar, el dominio (apps/api) valida el patch (<span className={mono}>validarPatch</span>) y
              sella la versión del programa en ese nodo. <span className="font-bold">Mover su fecha</span> aún
              no está disponible (el dominio no admite override de fecha todavía).
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
          <button
            type="button"
            onClick={guardar}
            disabled={invalido || guardando}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
          >
            {guardando ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
