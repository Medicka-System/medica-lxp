'use client';

/**
 * Tarea de la lección (§5C) — lado del alumno. Ve los lineamientos, la rúbrica con la
 * que se le evaluará y el valor; entrega su trabajo (texto en línea con el EditorRico
 * y/o un archivo adjunto). La entrega queda `enviada`, pendiente de la revisión del
 * docente — reutiliza el flujo de `entregas`/validación existente (Eco asiste · §7A).
 *
 * La entrega es CRUD directo bajo RLS (Regla de Oro §2 · `entregarTarea` corre como el
 * alumno). El binario del adjunto sube directo a object storage con una URL que firma
 * el `api` (§3) — nunca pasa por aquí. Vive dentro del shell del Campus.
 */
import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  ListChecks,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { EditorRico, ContenidoRico } from '@/components/editor-rico';
import { CascaraLeccion } from '@/components/campus/cascara-leccion';
import { FichaMeta } from '@/components/campus/ficha-meta';
import { card, kicker, softText, focusRing, mono } from '@/components/tokens';
import { haceCuanto } from '@/lib/format';
import type { EstadoEntregaTarea, TareaData } from '@/lib/campus/tarea-datos';
import {
  entregarTarea,
  solicitarSubidaArchivo,
  urlLecturaArchivo,
  type ArchivoEntrega,
} from '@/lib/campus/tarea-acciones';

export function VistaTarea({ data, puedeEntregar }: { data: TareaData; puedeEntregar: boolean }) {
  const { contexto, entrega, formato } = data;
  const calificada = entrega?.estado === 'calificada';
  const yaEntrego = !!entrega && (entrega.texto !== null || entrega.archivo !== null);

  return (
    <CascaraLeccion
      overline={`${contexto.programa} · ${contexto.modulo}`}
      titulo={data.titulo}
      anterior={data.anterior ? { href: `/leccion/${data.anterior.id}` } : null}
      siguiente={data.siguiente ? { href: `/leccion/${data.siguiente.id}` } : null}
    >
      {/* Metadatos APARTE, en card (valor · formato · estado · fecha de entrega). */}
      <FichaMeta
        filas={[
          { etiqueta: 'Valor', valor: data.valor !== null ? `${data.valor} pts` : null },
          { etiqueta: 'Formato', valor: ROTULO_FORMATO[formato] },
          { etiqueta: 'Estado', valor: entrega ? <ChipEstado estado={entrega.estado} /> : null },
          { etiqueta: 'Entregada', valor: yaEntrego && entrega ? haceCuanto(entrega.creadaEn) : null },
        ]}
      />

      {/* Lineamientos (HTML del diseñador). */}
      {data.lineamientos.trim() ? (
        <div className="mt-4 max-w-[66ch]">
          <ContenidoRico html={data.lineamientos} />
        </div>
      ) : (
        <p className={`mt-4 text-[13.5px] ${softText}`}>
          Tu docente aún no publicó los lineamientos de esta tarea.
        </p>
      )}

      {/* Rúbrica con la que se evalúa (solo lectura). */}
      {data.rubrica && (
        <section className={`${card} mt-5 p-4`}>
          <p className={`${kicker} flex items-center gap-1.5 text-secondary`}>
            <ListChecks aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            Cómo se evalúa · {data.rubrica.nombre}
          </p>
          {data.rubrica.descripcion && (
            <p className={`mt-1.5 text-[12.5px] ${softText}`}>{data.rubrica.descripcion}</p>
          )}
          {data.rubrica.criterios.length > 0 && (
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {data.rubrica.criterios.map((c, i) => (
                <li key={`${i}-${c.criterio}`} className="flex items-start gap-3 py-2.5 first:pt-0">
                  <ClipboardCheck
                    aria-hidden
                    className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-snug">{c.criterio || 'Criterio'}</p>
                    {c.descripcion && (
                      <p className={`mt-0.5 text-[12px] leading-relaxed ${softText}`}>{c.descripcion}</p>
                    )}
                  </div>
                  {c.peso !== null && (
                    <span className={`${mono} shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-secondary`}>
                      {c.peso}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Resultado de la evaluación (cuando el docente ya calificó). */}
      {calificada && entrega && (
        <section className="mt-6 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <CheckCircle2 aria-hidden className="h-5 w-5 text-[color:var(--info-foreground)]" strokeWidth={2} />
            <p className="text-[14px] font-bold text-[color:var(--info-foreground)]">Entrega calificada</p>
            {entrega.nota !== null && (
              <span className="ml-auto inline-flex items-baseline gap-1 rounded-full bg-card px-3 py-1">
                <span className="text-[18px] font-extrabold text-secondary">{entrega.nota}</span>
                <span className={`${mono} text-[11px] text-muted-foreground`}>/ 10</span>
              </span>
            )}
          </div>
          {entrega.feedback && (
            <div className="mt-3 rounded-[10px] bg-card p-3.5">
              <p className={`${kicker} text-muted-foreground`}>Retroalimentación del docente</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground">{entrega.feedback}</p>
            </div>
          )}
        </section>
      )}

      {/* Lo que entregó el alumno (siempre visible si ya entregó). */}
      {yaEntrego && entrega && (
        <TuEntrega entrega={entrega} />
      )}

      {/* Composer de entrega / reenvío. */}
      <section className={`${card} mt-6 p-4`}>
        <p className="text-[13.5px] font-bold">
          {calificada ? 'Tu entrega' : yaEntrego ? 'Actualiza tu entrega' : 'Entrega tu tarea'}
        </p>
        <div className="mt-3">
          {calificada ? (
            <div className="flex items-start gap-2.5 rounded-[11px] border border-border bg-muted px-3.5 py-3">
              <Ban aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <p className={`text-[12.5px] ${softText}`}>
                Esta entrega ya fue calificada; no se puede reenviar. Si necesitas otra oportunidad,
                escríbele a tu docente.
              </p>
            </div>
          ) : puedeEntregar ? (
            <Composer
              leccionId={data.leccionId}
              formato={formato}
              textoInicial={entrega?.texto ?? ''}
              reenvio={yaEntrego}
            />
          ) : (
            <div className="rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3">
              <p className="text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">
                Tu acceso está en pausa. Ponte al corriente para entregar la tarea.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Navegación para continuar el recorrido. */}
      <nav className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
        {data.anterior ? (
          <Link
            href={`/leccion/${data.anterior.id}`}
            className={`inline-flex h-11 items-center gap-2 rounded-control border border-border bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
          >
            <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
            Anterior
          </Link>
        ) : (
          <span />
        )}
        {data.siguiente ? (
          <Link
            href={`/leccion/${data.siguiente.id}`}
            className={`inline-flex h-11 items-center gap-2 rounded-control bg-secondary px-4 text-[13px] font-semibold text-secondary-foreground transition-colors hover:opacity-90 ${focusRing}`}
          >
            Siguiente
            <ChevronRight aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </CascaraLeccion>
  );
}

/* ── Lo que el alumno ya entregó (texto + adjunto) ── */
function TuEntrega({ entrega }: { entrega: NonNullable<TareaData['entrega']> }) {
  return (
    <section className={`${card} mt-6 p-4`}>
      <div className="flex items-center gap-2">
        <p className={`${kicker} text-muted-foreground`}>Tu entrega</p>
        <span className={`${mono} ml-auto flex items-center gap-1 text-[11px] text-muted-foreground`}>
          <Clock aria-hidden className="h-3 w-3" strokeWidth={2} />
          {haceCuanto(entrega.creadaEn)}
        </span>
      </div>
      {entrega.texto && (
        <div className="mt-2.5">
          <ContenidoRico html={entrega.texto} />
        </div>
      )}
      {entrega.archivo && <ArchivoAdjunto archivo={entrega.archivo} />}
    </section>
  );
}

/* ── Chip de descarga del adjunto (firma la lectura al vuelo) ── */
function ArchivoAdjunto({ archivo }: { archivo: NonNullable<TareaData['entrega']>['archivo'] }) {
  const [cargando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!archivo) return null;

  function abrir() {
    setError(null);
    iniciar(async () => {
      const r = await urlLecturaArchivo(archivo!.key);
      if (r.ok) window.open(r.datos.url, '_blank', 'noopener,noreferrer');
      else setError(r.error);
    });
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={abrir}
        disabled={cargando}
        className={`inline-flex items-center gap-2.5 rounded-[10px] border border-border bg-muted px-3.5 py-2.5 text-left transition-colors hover:bg-accent disabled:opacity-60 ${focusRing}`}
      >
        {cargando ? (
          <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin text-secondary" strokeWidth={2} />
        ) : (
          <Download aria-hidden className="h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} />
        )}
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-foreground">{archivo.nombre}</span>
          <span className={`${mono} text-[11px] text-muted-foreground`}>Descargar mi archivo</span>
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Composer de entrega (texto y/o archivo, según formato) ── */
function Composer({
  leccionId,
  formato,
  textoInicial,
  reenvio,
}: {
  leccionId: string;
  formato: TareaData['formato'];
  textoInicial: string;
  reenvio: boolean;
}) {
  const conTexto = formato === 'texto' || formato === 'ambos';
  const conArchivo = formato === 'archivo' || formato === 'ambos';

  const [html, setHtml] = useState(textoInicial);
  const [clave] = useState(0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [fase, setFase] = useState<'idle' | 'subiendo' | 'enviando'>('idle');
  const [pendiente, iniciar] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trabajando = pendiente || fase !== 'idle';

  function enviar() {
    setError(null);
    setOk(false);
    const texto = conTexto ? html.trim() : '';
    if (conTexto && !conArchivo && !texto) {
      setError('Escribe tu respuesta antes de entregar.');
      return;
    }
    if (conArchivo && !conTexto && !archivo) {
      setError('Adjunta el archivo antes de entregar.');
      return;
    }
    if (conTexto && conArchivo && !texto && !archivo) {
      setError('Escribe tu respuesta o adjunta un archivo antes de entregar.');
      return;
    }

    iniciar(async () => {
      let ref: ArchivoEntrega | null = null;
      // 1) Si hay archivo nuevo: firmar → subir directo a object storage → guardar la ref.
      if (conArchivo && archivo) {
        setFase('subiendo');
        const firma = await solicitarSubidaArchivo({
          leccionId,
          nombre: archivo.name,
          tipo: archivo.type || undefined,
        });
        if (!firma.ok) {
          setFase('idle');
          setError(firma.error);
          return;
        }
        try {
          const put = await fetch(firma.datos.urlSubida, {
            method: 'PUT',
            headers: archivo.type ? { 'content-type': archivo.type } : undefined,
            body: archivo,
          });
          if (!put.ok) throw new Error(`PUT ${put.status}`);
        } catch (e) {
          console.error('[Composer] subida del archivo falló:', e);
          setFase('idle');
          setError('No se pudo subir el archivo a object storage. Revisa tu conexión e inténtalo de nuevo.');
          return;
        }
        ref = { key: firma.datos.key, nombre: archivo.name, tipo: archivo.type || null };
      }

      // 2) Registrar la entrega (CRUD bajo RLS · queda `enviada`).
      setFase('enviando');
      const r = await entregarTarea(leccionId, {
        texto: conTexto ? texto : undefined,
        archivo: ref,
      });
      setFase('idle');
      if (r.ok) {
        setOk(true);
        setArchivo(null);
        if (inputRef.current) inputRef.current.value = '';
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div>
      {conTexto && (
        <EditorRico
          key={clave}
          contenidoInicial={textoInicial}
          onChange={setHtml}
          minAlto={180}
          ariaLabel="Tu respuesta de la tarea"
        />
      )}

      {conArchivo && (
        <div className={conTexto ? 'mt-3' : ''}>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            id="tarea-archivo"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
          {archivo ? (
            <div className="flex items-center gap-2.5 rounded-[11px] border border-border bg-muted px-3.5 py-2.5">
              <Paperclip aria-hidden className="h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                {archivo.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setArchivo(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                aria-label="Quitar el archivo"
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-card ${focusRing}`}
              >
                <X aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <label
              htmlFor="tarea-archivo"
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-dashed border-[color:var(--track)] bg-muted px-4 py-4 text-[13px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
            >
              <Upload aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Seleccionar archivo
            </label>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">
          {error}
        </p>
      )}
      {ok && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-secondary">
          <CheckCircle2 aria-hidden className="h-4 w-4" strokeWidth={2} />
          Entrega enviada a revisión.
        </p>
      )}

      <div className="mt-2.5 flex justify-end">
        <button
          type="button"
          onClick={enviar}
          disabled={trabajando}
          className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          {trabajando ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : reenvio ? (
            <RotateCcw aria-hidden className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Send aria-hidden className="h-4 w-4" strokeWidth={2} />
          )}
          {fase === 'subiendo'
            ? 'Subiendo archivo…'
            : fase === 'enviando'
              ? 'Enviando…'
              : reenvio
                ? 'Reenviar entrega'
                : 'Entregar tarea'}
        </button>
      </div>
    </div>
  );
}

/* ── Chips ── */
const ROTULO_FORMATO: Record<TareaData['formato'], string> = {
  archivo: 'Archivo adjunto',
  texto: 'Texto en línea',
  ambos: 'Archivo y/o texto',
};

function ChipEstado({ estado }: { estado: EstadoEntregaTarea }) {
  const mapa: Record<EstadoEntregaTarea, { texto: string; clase: string; icono: typeof Clock }> = {
    pendiente: {
      texto: 'Sin entregar',
      clase: 'border border-border bg-muted text-muted-foreground',
      icono: Clock,
    },
    enviada: {
      texto: 'En revisión',
      clase:
        'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
      icono: Clock,
    },
    calificada: {
      texto: 'Calificada',
      clase: 'bg-accent text-accent-foreground',
      icono: CheckCircle2,
    },
    devuelta: {
      texto: 'Devuelta',
      clase:
        'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
      icono: RotateCcw,
    },
  };
  const { texto, clase, icono: Icono } = mapa[estado];
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${clase}`}>
      <Icono aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
      {texto}
    </span>
  );
}
