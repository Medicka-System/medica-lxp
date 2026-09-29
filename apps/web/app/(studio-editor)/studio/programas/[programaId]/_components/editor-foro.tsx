'use client';

/**
 * Editor del tipo `foro` (§5C) — CONFIGURADOR del lado del diseñador.
 *
 * El diseñador configura la DISCUSIÓN CERRADA DEL GRUPO (§1, no el Ateneo): consigna,
 * reglas, ventana de apertura/cierre, modalidad síncrona/asíncrona y el valor de la
 * participación. Todo se guarda en `lecciones.config` (contrato · almacen 'config').
 *
 * NO reconstruye el foro: la acción `guardarConfigForo` enchufa esta config al MOTOR
 * que YA existe (Sprint 5 · `lxp.foro_mensajes`) mediante una actividad foro de
 * respaldo. El alumno entra al foro de su grupo, abre temas y comenta con el mismo
 * EditorRico — esa parte vive en el Campus (app/(campus)/foro), sin cambios de motor.
 *
 * Persistencia (Regla de Oro §2): server action `guardarConfigForo`, envuelta por
 * `correr` (indicador "guardado" del header). La consigna (texto rico) se persiste
 * con su propio botón; el resto de controles guardan al cambiar.
 */

import { useEffect, useRef, useState } from 'react';
import { CalendarClock, Check, MessageSquare, Plus, Radio, Save, X } from 'lucide-react';
import { EditorRico } from '@/components/editor-rico';
import { Select } from '@/components/ui/select';
import { kicker, softText, focusRing, mono } from '@/lib/studio/estilos';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import {
  comoConfigForo,
  estadoVentanaForo,
  type ConfigForo,
  type ModalidadForo,
} from '@/lib/studio/foro-config';
import { guardarConfigForo } from '@/lib/studio/acciones';
import { leerCatalogoRubricas } from '@/lib/studio/tarea-acciones';
import type { RubricaCatalogo } from '@/lib/studio/tarea-contrato';

/* ─────────────────────────── Átomos locales ─────────────────────────── */

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <p className="text-[14px] font-bold tracking-[-0.01em]">{titulo}</p>
      {descripcion && <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>{descripcion}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

const inputBase =
  'h-9 rounded-[9px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none focus:border-secondary';

/* ─────────────────────────── Editor ─────────────────────────── */

export function EditorForo({ programaId, leccionId, config, correr }: EditorLeccionProps) {
  const [cfg, setCfg] = useState<ConfigForo>(() => comoConfigForo(config));
  // La consigna (HTML del EditorRico) se lleva en un ref para poder incluirla en
  // CUALQUIER guardado (así un cambio de otro control no pierde el texto en curso).
  const instruccionesRef = useRef(cfg.instrucciones);
  const [reglaNueva, setReglaNueva] = useState('');

  // Catálogo de rúbricas tipo 'tareas' (la participación del foro se evalúa como tarea).
  const [catalogo, setCatalogo] = useState<RubricaCatalogo[] | null>(null);
  useEffect(() => {
    let vivo = true;
    leerCatalogoRubricas()
      .then((rs) => vivo && setCatalogo(rs.filter((r) => r.tipo === 'tareas')))
      .catch(() => vivo && setCatalogo([]));
    return () => {
      vivo = false;
    };
  }, []);

  // La ventana depende de la hora actual → se calcula tras montar para no romper la
  // hidratación (el server no conoce "ahora" del cliente).
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => setAhora(new Date()), [cfg.aperturaEn, cfg.cierreEn]);

  /** Mezcla un cambio con la config viva (incluida la consigna en curso) y persiste. */
  function aplicar(patch: Partial<ConfigForo>) {
    const next: ConfigForo = { ...cfg, instrucciones: instruccionesRef.current, ...patch };
    setCfg(next);
    correr(() => guardarConfigForo(programaId, leccionId, next));
  }

  function agregarRegla() {
    const r = reglaNueva.trim();
    if (!r) return;
    aplicar({ reglas: [...cfg.reglas, r] });
    setReglaNueva('');
  }

  const ventana = ahora ? estadoVentanaForo(cfg, ahora) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado del tipo */}
      <div className="flex items-start gap-3.5 rounded-xl border border-border bg-card p-5">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-sidebar text-sidebar-foreground"
        >
          <MessageSquare className="h-[21px] w-[21px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className={`${kicker} text-muted-foreground`}>Lección tipo Foro</p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.01em]">Configura la discusión del grupo</h2>
          <p className={`mt-1.5 max-w-[62ch] text-[13px] leading-relaxed ${softText}`}>
            Es la discusión <span className="font-semibold">cerrada del grupo</span> (no el Ateneo). Aquí defines la
            consigna y las reglas; cada grupo tiene su propio hilo. Los alumnos abren temas y comentan con el editor
            completo.
          </p>
        </div>
      </div>

      {/* Tema / pregunta del foro (el H1 que ve el alumno) */}
      <Seccion
        titulo="Tema del foro"
        descripcion="La pregunta que encabeza la discusión. Si lo dejas vacío, se usa el nombre de la lección."
      >
        <input
          type="text"
          defaultValue={cfg.tema}
          onBlur={(e) => {
            if (e.target.value !== cfg.tema) aplicar({ tema: e.target.value });
          }}
          placeholder="Ej.: ¿Qué los hace dudar entre grado II y III?"
          aria-label="Tema del foro"
          className={`${inputBase} w-full`}
        />
      </Seccion>

      {/* Consigna */}
      <Seccion
        titulo="Consigna del foro"
        descripcion="Lo que el alumno lee arriba del hilo. Da formato, inserta tablas, imágenes o fórmulas."
      >
        <EditorRico
          contenidoInicial={cfg.instrucciones}
          onChange={(html) => {
            instruccionesRef.current = html;
          }}
          minAlto={160}
          ariaLabel="Consigna del foro"
        />
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={() => aplicar({})}
            className={`inline-flex h-9 items-center gap-2 rounded-[9px] bg-primary px-3.5 text-[12.5px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={2} />
            Guardar consigna
          </button>
        </div>
      </Seccion>

      {/* Rúbrica de participación (del catálogo · como en la tarea) */}
      <Seccion
        titulo="Rúbrica de participación"
        descripcion="Cómo se evalúa la participación. Se toma del catálogo (no se redacta aquí); el alumno la ve antes de escribir."
      >
        <Select
          value={cfg.rubricaId ?? ''}
          onChange={(v) => aplicar({ rubricaId: v || null })}
          aria-label="Rúbrica de participación del foro"
          className={`flex h-9 w-full items-center gap-2 rounded-[9px] border border-border bg-muted px-2.5 text-[13px] text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
          placeholder="Sin rúbrica"
          options={[
            { value: '', label: 'Sin rúbrica' },
            ...(catalogo ?? []).map((r) => ({
              value: r.id,
              label: `${r.nombre} · ${r.criterios.length} criterio(s)${r.publicado ? '' : ' · borrador'}`,
            })),
          ]}
        />
        {catalogo === null && <p className={`mt-2 text-[12px] ${softText}`}>Cargando catálogo…</p>}
        {catalogo !== null && catalogo.length === 0 && (
          <p className={`mt-2 text-[12px] ${softText}`}>
            No hay rúbricas tipo «tareas» en el catálogo. Créalas en la sección de rúbricas.
          </p>
        )}
      </Seccion>

      {/* Modalidad */}
      <Seccion titulo="Modalidad" descripcion="Cómo transcurre la discusión.">
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              ['sincrono', 'Síncrona', 'En vivo, durante la clase o una ventana corta.'],
              ['asincrono', 'Asíncrona', 'A lo largo del tiempo, cada quien a su ritmo.'],
            ] as const
          ).map(([valor, rotulo, desc]) => {
            const activo = cfg.modalidad === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => aplicar({ modalidad: valor as ModalidadForo })}
                aria-pressed={activo}
                className={`flex items-start gap-2.5 rounded-[11px] border p-3 text-left transition-colors ${focusRing} ${
                  activo ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <Radio
                  aria-hidden
                  className={`mt-0.5 h-4 w-4 shrink-0 ${activo ? 'text-secondary' : 'text-muted-foreground'}`}
                  strokeWidth={activo ? 2.4 : 1.75}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold leading-snug">{rotulo}</span>
                  <span className={`mt-0.5 block text-[11.5px] leading-relaxed ${softText}`}>{desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Seccion>

      {/* Ventana de apertura/cierre */}
      <Seccion
        titulo="Ventana de participación"
        descripcion="Deja una fecha vacía para no limitar ese extremo."
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={`${kicker} text-muted-foreground`}>Apertura</span>
            <input
              type="datetime-local"
              value={cfg.aperturaEn ?? ''}
              onChange={(e) => aplicar({ aperturaEn: e.target.value || null })}
              aria-label="Fecha de apertura del foro"
              className={`${inputBase} ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`${kicker} text-muted-foreground`}>Cierre</span>
            <input
              type="datetime-local"
              value={cfg.cierreEn ?? ''}
              onChange={(e) => aplicar({ cierreEn: e.target.value || null })}
              aria-label="Fecha de cierre del foro"
              className={`${inputBase} ${focusRing}`}
            />
          </label>
          {ventana && <ChipVentana estado={ventana.estado} />}
        </div>
      </Seccion>

      {/* Reglas */}
      <Seccion
        titulo="Reglas de participación"
        descripcion="Lineamientos que el alumno verá junto a la consigna."
      >
        {cfg.reglas.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1.5">
            {cfg.reglas.map((r, i) => (
              <li
                key={`${i}-${r}`}
                className="flex items-start gap-2.5 rounded-[9px] border border-border bg-muted px-3 py-2"
              >
                <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed">{r}</span>
                <button
                  type="button"
                  aria-label={`Quitar regla: ${r}`}
                  onClick={() => aplicar({ reglas: cfg.reglas.filter((_, j) => j !== i) })}
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
                >
                  <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2.5">
          <input
            value={reglaNueva}
            onChange={(e) => setReglaNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregarRegla();
              }
            }}
            placeholder="Agrega una regla y pulsa Enter…"
            aria-label="Nueva regla de participación"
            className={`${inputBase} min-w-0 flex-1 ${focusRing}`}
          />
          <button
            type="button"
            onClick={agregarRegla}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] bg-accent px-3 text-[12.5px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.4} />
            Agregar
          </button>
        </div>
      </Seccion>

      {/* Participación / calificación */}
      <Seccion
        titulo="Valor de la participación"
        descripcion="Define si la participación cuenta para la calificación y cuánto se espera."
      >
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={cfg.participacion.califica}
            onChange={(e) =>
              aplicar({ participacion: { ...cfg.participacion, califica: e.target.checked } })
            }
            className="h-4 w-4 accent-[color:var(--primary)]"
          />
          <span className="text-[13px] font-semibold">La participación cuenta para la calificación</span>
        </label>

        <div className="mt-3.5 flex flex-wrap items-end gap-4">
          {cfg.participacion.califica && (
            <label className="flex flex-col gap-1.5">
              <span className={`${kicker} text-muted-foreground`}>Puntos / valor</span>
              <input
                type="number"
                min={0}
                step={1}
                value={cfg.participacion.puntos ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  aplicar({
                    participacion: {
                      ...cfg.participacion,
                      puntos: v !== null && Number.isFinite(v) && v >= 0 ? v : null,
                    },
                  });
                }}
                aria-label="Puntos o valor de la participación"
                className={`${inputBase} w-28 ${mono} ${focusRing}`}
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className={`${kicker} text-muted-foreground`}>Temas mínimos</span>
            <input
              type="number"
              min={0}
              step={1}
              value={cfg.participacion.minPosts}
              onChange={(e) =>
                aplicar({
                  participacion: {
                    ...cfg.participacion,
                    minPosts: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                  },
                })
              }
              aria-label="Temas propios mínimos para acreditar"
              className={`${inputBase} w-24 ${mono} ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`${kicker} text-muted-foreground`}>Comentarios mínimos</span>
            <input
              type="number"
              min={0}
              step={1}
              value={cfg.participacion.minComentarios}
              onChange={(e) =>
                aplicar({
                  participacion: {
                    ...cfg.participacion,
                    minComentarios: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                  },
                })
              }
              aria-label="Comentarios mínimos para acreditar"
              className={`${inputBase} w-24 ${mono} ${focusRing}`}
            />
          </label>
        </div>
      </Seccion>

      {/* Conexión al motor */}
      <div className="flex items-start gap-3 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-3.5">
        <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={2.4} />
        <p className="text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
          {cfg.actividadId ? (
            <>
              Foro <span className="font-bold">conectado</span>: los alumnos de cada grupo abren temas y comentan sobre
              esta consigna. Los mensajes viven en el foro del grupo (motor existente), no aquí.
            </>
          ) : (
            <>
              Guarda una vez para <span className="font-bold">conectar</span> el foro al motor del grupo. A partir de
              ahí los alumnos podrán abrir temas y comentar.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────── Chip de estado de la ventana ─────────────────────────── */

function ChipVentana({ estado }: { estado: ReturnType<typeof estadoVentanaForo>['estado'] }) {
  const mapa = {
    siempre: { texto: 'Siempre abierto', clase: 'bg-accent text-accent-foreground' },
    abierto: { texto: 'Abierto ahora', clase: 'bg-accent text-accent-foreground' },
    programado: {
      texto: 'Programado',
      clase: 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
    },
    cerrado: {
      texto: 'Cerrado',
      clase:
        'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
    },
  } as const;
  const { texto, clase } = mapa[estado];
  return (
    <span
      className={`inline-flex h-9 items-center gap-1.5 self-end whitespace-nowrap rounded-full px-3 text-[11.5px] font-bold ${clase}`}
    >
      <CalendarClock aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
      {texto}
    </span>
  );
}
