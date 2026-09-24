'use client';

/**
 * Studio · Detalle de un recurso — lo que ES y lo que AFECTA (§5B).
 * Izquierda: preview + metadatos + etiquetas. Derecha: "dónde se usa" (lecciones que
 * lo referencian, reales por RLS) + versiones del archivo.
 *
 * Reemplazar/eliminar declaran el alcance antes de ejecutar, pero son PIPELINE de
 * dominio (nueva versión servida en todas las lecciones / borrado con object storage)
 * → PENDIENTE DE API (contrato en lib/studio/contenido-contrato.ts). Aquí los diálogos
 * muestran el alcance real y quedan cableados a stubs.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Play,
  Presentation,
  Repeat2,
  SlidersHorizontal,
  Tag,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/lib/studio/estilos';
import type { RecursoDetalle, TipoRecurso } from '@/lib/studio/contenido-contrato';
import { eliminarRecurso } from '@/lib/studio/contenido-acciones';

const ICONO: Record<TipoRecurso, typeof Play> = {
  video: Play,
  h5p: SlidersHorizontal,
  scorm: Layers,
  xapi: Boxes,
  pdf: FileText,
  word: FileText,
  ppt: Presentation,
  imagen: ImageIcon,
};

export function DetalleRecurso({
  recurso,
  rutaBase = '/studio/contenido',
  soloLectura = false,
}: {
  recurso: RecursoDetalle;
  /** Base de "Volver": /studio/contenido (diseñador) o /docente/recursos (docente). */
  rutaBase?: string;
  /** El docente consulta; eliminar/reemplazar son del diseñador → se ocultan. */
  soloLectura?: boolean;
}) {
  const { id, nombre, tipo, duracion, reproduccion, metadatos, etiquetas, usos, versiones } = recurso;
  const router = useRouter();
  const [dialogo, setDialogo] = useState<null | 'reemplazar' | 'eliminar'>(null);
  const Icono = ICONO[tipo];
  const programas = [...new Set(usos.map((u) => u.programa))];
  const fondoOscuro = tipo !== 'pdf' && tipo !== 'word' && tipo !== 'ppt';

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={rutaBase}
          className={`inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
          Volver a Contenido
        </Link>
        {!soloLectura && (
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDialogo('eliminar')}
              className={`inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-[color:var(--destructive-border)] hover:bg-[color:var(--destructive-surface)] hover:text-destructive ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Eliminar
            </button>
            <button
              type="button"
              onClick={() => setDialogo('reemplazar')}
              className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Repeat2 aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
              Reemplazar archivo
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* ════════ Lo que ES ════════ */}
        <section className={`${card} min-w-0 overflow-hidden`}>
          <div
            className="relative grid w-full place-items-center"
            style={{ aspectRatio: '16 / 9', background: fondoOscuro ? 'var(--sidebar)' : 'var(--muted)' }}
          >
            {fondoOscuro && (
              <span
                aria-hidden
                className="absolute inset-0"
                style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)' }}
              />
            )}
            <span
              aria-hidden
              className={`relative grid place-items-center ${fondoOscuro ? 'h-[58px] w-[58px] rounded-full bg-white/[0.18] text-white' : 'text-muted-foreground'}`}
            >
              <Icono className={fondoOscuro ? 'h-[26px] w-[26px]' : 'h-[34px] w-[34px]'} strokeWidth={1.4} />
            </span>
            {duracion && (
              <span
                className={`${mono} absolute bottom-3 left-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white`}
                style={{ background: 'rgba(15,45,82,.82)' }}
              >
                {duracion}
              </span>
            )}
            {reproduccion && (
              <span className="absolute bottom-3 right-3 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-[color:var(--sidebar)]">
                {reproduccion}
              </span>
            )}
          </div>

          <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
                <Icono aria-hidden className="h-3 w-3" strokeWidth={1.6} />
                {tipo.toUpperCase()}
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
                <Link2 aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                <span className={mono}>{usos.length}</span> lecciones · {programas.length} programas
              </span>
            </div>
            <h1 className="mt-3 text-[22px] font-extrabold leading-tight tracking-[-0.02em]" style={{ textWrap: 'pretty' }}>
              {nombre}
            </h1>

            <dl className="mt-5 grid gap-3.5 sm:grid-cols-2">
              {metadatos.map((m) => (
                <div key={m.etiqueta}>
                  <dt className={`${kicker} text-muted-foreground`}>{m.etiqueta}</dt>
                  <dd className={`mt-1 text-[13px] font-semibold ${['Duración', 'Resolución', 'Peso'].includes(m.etiqueta) ? `${mono} font-bold` : ''}`}>
                    {m.valor}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <span className={`${kicker} text-muted-foreground`}>Etiquetas</span>
              {etiquetas.length === 0 && <span className="text-[12px] text-muted-foreground">sin etiquetas</span>}
              {etiquetas.map((t) => (
                <span key={t} className={`inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[12px] font-semibold ${softText}`}>
                  <Tag aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ Lo que AFECTA ════════ */}
        <aside className="flex min-w-0 flex-col gap-4">
          <section className={`${card} overflow-hidden`}>
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Dónde se usa</p>
                <span className={`${mono} ml-auto text-[13px] font-bold`}>{usos.length} lecciones</span>
              </div>
              <p className={`mt-2 text-[12.5px] leading-relaxed ${softText}`}>
                {usos.length === 0
                  ? 'Este recurso aún no se referencia en ninguna lección.'
                  : `Si reemplazas el archivo, estas ${usos.length} lecciones sirven el nuevo la próxima vez que un alumno entre.`}
              </p>
            </div>
            <ul className="max-h-[360px] overflow-y-auto">
              {usos.map((u, i) => (
                <li key={u.id} className={i ? 'border-t border-border' : ''}>
                  <div className="flex items-start gap-2.5 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold text-secondary">{u.programa}</span>
                        <span className={`${mono} text-[11px] text-muted-foreground`}>v{u.version}</span>
                        {u.estadoLeccion === 'borrador' && (
                          <span className="inline-flex h-[19px] items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
                            Borrador
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[12.5px] font-medium leading-snug">{u.ruta}</span>
                    </span>
                    <ChevronRight aria-hidden className="mt-0.5 h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={2} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} p-5`}>
            <p className={`${kicker} text-muted-foreground`}>Versiones del archivo</p>
            <ul className="mt-3 flex flex-col gap-0.5">
              {versiones.map((v) => (
                <li key={v.id} className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 ${v.actual ? 'bg-accent' : ''}`}>
                  <span
                    aria-hidden
                    className={`${mono} grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] text-[11px] font-bold ${
                      v.actual ? 'bg-primary text-[color:var(--sidebar)]' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {v.etiqueta}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold leading-snug">{v.nota}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
              Al reemplazar el archivo, todas las lecciones que lo referencian sirven el nuevo (no se
              copia). El historial detallado de versiones llegará con el versionado del programa.
            </p>
          </section>
        </aside>
      </div>

      {dialogo === 'reemplazar' && (
        <DialogoReemplazar
          recursoId={id}
          tipo={tipo}
          nombre={nombre}
          usos={usos.length}
          programas={programas.length}
          onCerrar={() => setDialogo(null)}
          onHecho={() => {
            setDialogo(null);
            router.refresh();
          }}
        />
      )}
      {dialogo === 'eliminar' && (
        <DialogoEliminar
          recursoId={id}
          usos={usos.length}
          onCerrar={() => setDialogo(null)}
          onEliminado={() => router.push('/studio/contenido')}
        />
      )}
    </div>
  );
}

/** accept del <input file> según el tipo del recurso (se reemplaza por uno del MISMO tipo). */
const ACEPTA_POR_TIPO: Record<TipoRecurso, string> = {
  video: '.mp4,.mov,.webm,.m4v,.mkv',
  imagen: '.jpg,.jpeg,.png,.webp,.gif',
  pdf: '.pdf',
  word: '.doc,.docx',
  ppt: '.ppt,.pptx',
  scorm: '.zip',
  xapi: '.zip',
  h5p: '.h5p',
};

function DialogoReemplazar({
  recursoId,
  tipo,
  nombre,
  usos,
  programas,
  onCerrar,
  onHecho,
}: {
  recursoId: string;
  tipo: TipoRecurso;
  nombre: string;
  usos: number;
  programas: number;
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [fase, setFase] = useState<'elige' | 'sube' | 'error'>('elige');
  const [mensaje, setMensaje] = useState('');
  const subiendo = fase === 'sube';

  async function elegir(f: File | null) {
    if (!f) return;
    setFase('sube');
    setMensaje('Subiendo…');
    try {
      const { reemplazarRecursoFlujo } = await import('../../_components/subir-flujo');
      const r = await reemplazarRecursoFlujo(f, tipo, recursoId, nombre, setMensaje);
      if (!r.ok) {
        setFase('error');
        setMensaje(r.error);
        return;
      }
      onHecho();
    } catch (e) {
      console.error('[DialogoReemplazar] fallo:', e);
      setFase('error');
      setMensaje('Ocurrió un error inesperado al reemplazar el archivo.');
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Reemplazar archivo" className="fixed inset-0 z-50 grid place-items-center p-9" style={{ background: 'rgba(15,45,82,.52)' }}>
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>Reemplazar archivo</p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
              {usos > 0
                ? `El nuevo archivo entrará en ${usos} ${usos === 1 ? 'lección' : 'lecciones'} de ${programas} ${programas === 1 ? 'programa' : 'programas'}`
                : 'Este recurso aún no se usa en ninguna lección'}
            </h2>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" disabled={subiendo} className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted disabled:opacity-40 ${focusRing}`}>
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-6">
          <p className={`text-[13.5px] leading-relaxed ${softText}`}>
            El recurso vive una sola vez: al reemplazarlo, todas las lecciones que lo referencian sirven el archivo nuevo. No se crean copias. Sube un archivo del mismo tipo ({tipo.toUpperCase()}).
          </p>
          {mensaje && (
            <div
              className={`mt-4 flex items-start gap-2.5 rounded-[11px] border px-3.5 py-3 ${
                fase === 'error'
                  ? 'border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-destructive'
                  : 'border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
              }`}
            >
              {fase === 'error' ? (
                <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              ) : (
                <Loader2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 animate-spin" strokeWidth={2} />
              )}
              <p className="text-[12.5px] leading-relaxed">{mensaje}</p>
            </div>
          )}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-border bg-muted px-6 py-4">
          <button type="button" onClick={onCerrar} disabled={subiendo} className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}>
            Cancelar
          </button>
          <label className={`inline-flex h-12 cursor-pointer items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${subiendo ? 'pointer-events-none opacity-50' : ''}`}>
            <input type="file" accept={ACEPTA_POR_TIPO[tipo]} className="sr-only" disabled={subiendo} onChange={(e) => elegir(e.target.files?.[0] ?? null)} />
            <Upload aria-hidden className="h-4 w-4" strokeWidth={2} />
            {subiendo ? 'Subiendo…' : 'Elegir archivo nuevo'}
          </label>
        </div>
      </div>
    </div>
  );
}

function DialogoEliminar({
  recursoId,
  usos,
  onCerrar,
  onEliminado,
}: {
  recursoId: string;
  usos: number;
  onCerrar: () => void;
  onEliminado: () => void;
}) {
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');
  const bloqueado = usos > 0;

  async function borrar(forzar: boolean) {
    setTrabajando(true);
    setError('');
    const r = await eliminarRecurso(recursoId, { forzar });
    if (!r.ok) {
      setTrabajando(false);
      setError(r.error);
      return;
    }
    if (r.datos.eliminado) {
      onEliminado();
      return;
    }
    // No se eliminó porque sigue en uso (se ofrece forzar).
    setTrabajando(false);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Eliminar recurso" className="fixed inset-0 z-50 grid place-items-center p-9" style={{ background: 'rgba(15,45,82,.52)' }}>
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="px-6 pb-5 pt-6">
          <p className={`${kicker} text-destructive`}>Eliminar recurso</p>
          <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
            {bloqueado ? `Está en uso en ${usos} ${usos === 1 ? 'lección' : 'lecciones'}` : 'Este recurso no está en uso'}
          </h2>
          <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
            {bloqueado
              ? 'Si lo eliminas, esas lecciones se quedan sin el recurso y el alumno verá un hueco. Quítalo de las lecciones o reemplázalo primero — o elimínalo de todos modos.'
              : 'Puedes eliminarlo sin afectar ninguna lección.'}
          </p>
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[11px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-3 text-destructive">
              <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <p className="text-[12.5px] leading-relaxed">{error}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-border bg-muted px-6 py-4">
          <button type="button" onClick={onCerrar} disabled={trabajando} className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => borrar(bloqueado)}
            disabled={trabajando}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[color:var(--destructive-border)] bg-destructive px-4 text-[13.5px] font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {trabajando && <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />}
            {bloqueado ? 'Eliminar de todos modos' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
