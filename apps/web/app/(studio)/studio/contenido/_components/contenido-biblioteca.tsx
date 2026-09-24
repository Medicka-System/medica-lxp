'use client';

/**
 * Studio · Contenido — biblioteca de recursos reutilizables (§5B). Es el ALMACÉN:
 * un recurso se sube una vez y las lecciones lo REFERENCIAN (no lo copian); por eso
 * el dato protagonista es "en cuántas lecciones vive". DICOM y casos clínicos NO van
 * aquí (viven en Casos).
 *
 * Lecturas reales por RLS contra lxp.recursos; mientras esa tabla y el pipeline de
 * ingesta no existan (PENDIENTE DE DB/API — ver lib/studio/contenido-contrato.ts),
 * la vista degrada con un aviso y "Subir recurso" explica el pendiente.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  FileText,
  Image as ImageIcon,
  Info,
  Layers,
  Link2,
  MoreHorizontal,
  Play,
  Presentation,
  SlidersHorizontal,
  Tag,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { fechaCorta } from '@/lib/format';
import { ES_DOCUMENTO, type FamiliaFiltro, type Recurso, type TipoRecurso } from '@/lib/studio/contenido-contrato';

const TIPO: Record<
  TipoRecurso,
  { etiqueta: string; icono: typeof Play; chip: string; fondoOscuro: boolean; ext?: string }
> = {
  video: { etiqueta: 'Video', icono: Play, chip: 'bg-accent text-accent-foreground', fondoOscuro: true },
  h5p: {
    etiqueta: 'H5P',
    icono: SlidersHorizontal,
    chip: 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
    fondoOscuro: true,
  },
  scorm: { etiqueta: 'SCORM', icono: Layers, chip: 'bg-sidebar text-sidebar-foreground', fondoOscuro: true, ext: '.zip' },
  xapi: { etiqueta: 'xAPI', icono: Boxes, chip: 'border border-sidebar bg-card text-sidebar', fondoOscuro: true, ext: '.zip' },
  pdf: { etiqueta: 'PDF', icono: FileText, chip: 'border border-border bg-muted text-foreground-soft', fondoOscuro: false, ext: 'PDF' },
  word: { etiqueta: 'Word', icono: FileText, chip: 'border border-border bg-muted text-foreground-soft', fondoOscuro: false, ext: 'DOCX' },
  ppt: { etiqueta: 'PowerPoint', icono: Presentation, chip: 'border border-border bg-muted text-foreground-soft', fondoOscuro: false, ext: 'PPTX' },
  imagen: { etiqueta: 'Imagen', icono: ImageIcon, chip: 'border border-border bg-muted text-foreground-soft', fondoOscuro: true },
};

const FAMILIAS: [FamiliaFiltro, string][] = [
  ['todos', 'Todos'],
  ['video', 'Videos'],
  ['h5p', 'H5P'],
  ['scorm', 'SCORM'],
  ['xapi', 'xAPI'],
  ['documentos', 'Documentos'],
  ['imagen', 'Imágenes'],
];

function enFamilia(r: Recurso, f: FamiliaFiltro): boolean {
  if (f === 'todos') return true;
  if (f === 'documentos') return ES_DOCUMENTO.includes(r.tipo);
  return r.tipo === f;
}

function ChipUso({ usos, programas }: { usos: number; programas: number }) {
  if (usos === 0) {
    return (
      <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
        Sin usar
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
      <Link2 aria-hidden className="h-3 w-3" strokeWidth={1.75} />
      <span className={mono}>{usos}</span>
      {usos === 1 ? 'lección' : 'lecciones'}
      {programas ? ` · ${programas} prog.` : ''}
    </span>
  );
}

export function ContenidoBiblioteca({
  recursos,
  pendienteDb,
}: {
  recursos: Recurso[];
  pendienteDb: boolean;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState<FamiliaFiltro>('todos');
  const [tags, setTags] = useState<string[]>([]);
  const [subir, setSubir] = useState(false);

  const etiquetas = useMemo(
    () => [...new Set(recursos.flatMap((r) => r.etiquetas))].sort(),
    [recursos],
  );
  const conteos = useMemo(() => {
    const c = {} as Record<FamiliaFiltro, number>;
    for (const [f] of FAMILIAS) c[f] = recursos.filter((r) => enFamilia(r, f)).length;
    return c;
  }, [recursos]);
  const sinUsar = recursos.filter((r) => r.usos === 0 && !r.procesando).length;

  const visibles = useMemo(
    () =>
      recursos.filter(
        (r) =>
          enFamilia(r, tipo) &&
          (tags.length === 0 || r.etiquetas.some((t) => tags.includes(t)) || r.procesando) &&
          (!busca.trim() ||
            r.nombre.toLowerCase().includes(busca.trim().toLowerCase()) ||
            r.etiquetas.some((t) => t.includes(busca.trim().toLowerCase()))),
      ),
    [recursos, tipo, tags, busca],
  );

  const alternarTag = (t: string) => setTags((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]));

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Contenido</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Biblioteca reutilizable: sube una vez, referencia en cualquier lección. Los casos con
            DICOM viven en Casos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSubir(true)}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Upload aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          Subir recurso
        </button>
      </div>

      {pendienteDb && (
        <div className="flex items-start gap-3 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3.5">
          <TriangleAlert aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--warning-foreground)]" strokeWidth={1.75} />
          <p className="text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
            No se pudo leer la biblioteca ahora mismo. Revisa que la base de datos esté disponible y
            recarga.
          </p>
        </div>
      )}

      {/* tipo + búsqueda */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[300px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <span className="sr-only">Buscar recurso</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nombre o etiqueta…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-[3px]">
          {FAMILIAS.map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTipo(id)}
              aria-pressed={tipo === id}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                tipo === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${tipo === id ? 'text-white/70' : 'text-muted-foreground'}`}>
                {conteos[id]}
              </span>
            </button>
          ))}
        </div>
        {sinUsar > 0 && (
          <span className="ml-auto inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3 text-[12px] font-semibold text-[color:var(--warning-foreground)]">
            <TriangleAlert aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            {sinUsar} sin usar
          </span>
        )}
      </div>

      {/* etiquetas */}
      {etiquetas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${kicker} text-muted-foreground`}>Etiquetas</span>
          {etiquetas.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => alternarTag(t)}
                aria-pressed={on}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                  on ? 'border-transparent bg-accent text-accent-foreground' : `border-border bg-card ${softText} hover:bg-muted`
                }`}
              >
                <Tag aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                {t}
              </button>
            );
          })}
        </div>
      )}

      {recursos.length === 0 ? (
        <div className="rounded-[14px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-10 py-14 text-center">
          <span aria-hidden className="inline-grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground">
            <Upload className="h-[26px] w-[26px]" strokeWidth={2} />
          </span>
          <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.015em]">Sube el primer recurso</h2>
          <p className={`mx-auto mt-2.5 max-w-[52ch] text-[13.5px] leading-relaxed ${softText}`}>
            Video, H5P, paquete SCORM o xAPI, PDF, Word, PowerPoint o imagen. Se guarda una sola vez
            y desde ahí lo referencia cualquier lección de cualquier programa.
          </p>
          <p className="mt-5 text-[12px] text-muted-foreground">
            Los casos clínicos con DICOM no se suben aquí: viven en{' '}
            <span className="font-bold text-foreground">Casos</span>.
          </p>
        </div>
      ) : (
        <>
          <span className={`${mono} text-[12px] text-muted-foreground`}>
            {visibles.length} de {recursos.length} · usados primero
          </span>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibles.map((r) => {
              const cfg = TIPO[r.tipo];
              const Icono = cfg.icono;
              return (
                <li key={r.id}>
                  <article
                    className={`overflow-hidden rounded-xl border bg-card shadow-rest transition-colors ${
                      r.procesando ? 'border-[color:var(--info-border)]' : 'border-border hover:border-primary'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => !r.procesando && router.push(`/studio/contenido/${r.id}`)}
                      disabled={r.procesando}
                      aria-label={`Abrir ${r.nombre}`}
                      className={`relative grid w-full place-items-center ${focusRing}`}
                      style={{ aspectRatio: '16 / 9', background: cfg.fondoOscuro ? 'var(--sidebar)' : 'var(--muted)' }}
                    >
                      {cfg.fondoOscuro && (
                        <span
                          aria-hidden
                          className="absolute inset-0"
                          style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)' }}
                        />
                      )}
                      <span
                        aria-hidden
                        className={`relative grid place-items-center ${cfg.fondoOscuro ? 'h-[38px] w-[38px] rounded-full bg-white/[0.16] text-white' : 'text-muted-foreground'}`}
                      >
                        <Icono className={cfg.fondoOscuro ? 'h-[18px] w-[18px]' : 'h-[26px] w-[26px]'} strokeWidth={1.6} />
                      </span>
                      {r.procesando && (
                        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                          <span className="block h-full bg-[color:var(--info)]" style={{ width: `${r.progreso ?? 0}%` }} />
                        </span>
                      )}
                    </button>

                    <div className="px-3.5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[10.5px] font-bold ${cfg.chip}`}>
                          <Icono aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                          {cfg.etiqueta}
                        </span>
                        {r.procesando ? (
                          <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                            Procesando
                          </span>
                        ) : (
                          r.reproduccion && (
                            <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full bg-accent px-2 text-[10px] font-bold text-accent-foreground">
                              {r.reproduccion}
                            </span>
                          )
                        )}
                        <button
                          type="button"
                          aria-label={`Más acciones de ${r.nombre}`}
                          className={`ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                        >
                          <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                      <p className="mt-2.5 text-[13.5px] font-bold leading-relaxed" style={{ textWrap: 'pretty' }}>
                        {r.nombre}
                      </p>
                      <p className={`${mono} mt-1 text-[11.5px] text-muted-foreground`}>
                        {r.meta}
                        {r.peso ? ` · ${r.peso}` : ''} · {fechaCorta(r.fecha)}
                      </p>
                      <div className="mt-3 border-t border-border pt-3">
                        <ChipUso usos={r.usos} programas={r.programas} />
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* el punto de valor */}
      <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-border bg-card px-5 py-3.5">
        <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
          <Link2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </span>
        <p className={`min-w-[280px] flex-1 text-[12.5px] leading-relaxed ${softText}`}>
          Las lecciones no guardan copias: apuntan a estos recursos. Por eso cada tarjeta dice en
          cuántas se usa —y reemplazar o eliminar avisa el alcance antes de hacerlo.
        </p>
      </div>

      {subir && (
        <DialogoSubir
          onCerrar={() => setSubir(false)}
          onSubido={() => {
            setSubir(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Diálogo: subir (ingesta real · api + CRUD) ───────────────────────── */

/** Extensión → tipo de recurso. `.zip` es SCORM/xAPI (el api decide cuál por manifiesto). */
function tipoPorExtension(nombre: string): TipoRecurso | 'zip' | null {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? '';
  if (['mp4', 'mov', 'webm', 'm4v', 'mkv'].includes(ext)) return 'video';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'imagen';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (ext === 'h5p') return 'h5p';
  if (ext === 'zip') return 'zip';
  return null;
}

const ACEPTA = '.mp4,.mov,.webm,.m4v,.mkv,.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx,.h5p,.zip';

function DialogoSubir({ onCerrar, onSubido }: { onCerrar: () => void; onSubido: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombre, setNombre] = useState('');
  const [tags, setTags] = useState('');
  const [fase, setFase] = useState<'elige' | 'sube' | 'error'>('elige');
  const [mensaje, setMensaje] = useState('');

  const tipoDetectado = archivo ? tipoPorExtension(archivo.name) : null;

  function elegir(f: File | null) {
    if (!f) return;
    setArchivo(f);
    setNombre((n) => n || f.name.replace(/\.[^.]+$/, ''));
    setFase('elige');
    setMensaje('');
  }

  async function subir() {
    if (!archivo) return;
    const tipo = tipoPorExtension(archivo.name);
    if (!tipo) {
      setFase('error');
      setMensaje('Tipo de archivo no soportado. Usa video, imagen, PDF, Word, PowerPoint, .h5p o .zip (SCORM/xAPI).');
      return;
    }
    const etiquetas = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const nom = nombre.trim() || archivo.name;
    setFase('sube');
    setMensaje('Subiendo…');

    try {
      const { subirRecursoFlujo } = await import('./subir-flujo');
      const r = await subirRecursoFlujo(archivo, tipo, nom, etiquetas, setMensaje);
      if (!r.ok) {
        setFase('error');
        setMensaje(r.error);
        return;
      }
      onSubido();
    } catch (e) {
      console.error('[DialogoSubir] fallo inesperado:', e);
      setFase('error');
      setMensaje('Ocurrió un error inesperado al subir el recurso.');
    }
  }

  const subiendo = fase === 'sube';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Subir recurso"
      className="fixed inset-0 z-50 grid place-items-center p-9"
      style={{ background: 'rgba(15,45,82,.52)' }}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            <p className={`${kicker} text-secondary`}>Subir recurso</p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
              Un recurso, muchas lecciones
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            disabled={subiendo}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted disabled:opacity-40 ${focusRing}`}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-6">
          <label
            className={`block cursor-pointer rounded-xl border-[1.5px] border-dashed p-6 text-center transition-colors ${
              archivo ? 'border-primary bg-accent' : 'border-[color:var(--track)] bg-muted hover:border-secondary'
            } ${subiendo ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              type="file"
              accept={ACEPTA}
              className="sr-only"
              disabled={subiendo}
              onChange={(e) => elegir(e.target.files?.[0] ?? null)}
            />
            <span aria-hidden className="inline-grid h-[42px] w-[42px] place-items-center rounded-full bg-card text-secondary">
              <Upload className="h-5 w-5" strokeWidth={2} />
            </span>
            {archivo ? (
              <>
                <p className="mt-2.5 text-[13.5px] font-bold" style={{ textWrap: 'pretty' }}>{archivo.name}</p>
                <p className={`${mono} mt-1 text-[11.5px] text-muted-foreground`}>
                  {(archivo.size / 1024 / 1024).toFixed(1)} MB
                  {tipoDetectado ? ` · ${tipoDetectado === 'zip' ? 'SCORM/xAPI' : TIPO[tipoDetectado].etiqueta}` : ' · tipo no soportado'}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2.5 text-[13.5px] font-bold">Video · H5P · SCORM/xAPI · PDF · Word · PPT · Imagen</p>
                <p className={`${mono} mt-1 text-[11.5px] text-muted-foreground`}>
                  Haz clic para elegir un archivo · SCORM/xAPI → .zip
                </p>
              </>
            )}
          </label>

          {archivo && (
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className={`${kicker} text-muted-foreground`}>Nombre</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={subiendo}
                  className={`h-10 rounded-[9px] border border-border bg-card px-3 text-[13px] outline-none focus:border-secondary ${focusRing}`}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={`${kicker} text-muted-foreground`}>Etiquetas (separadas por coma)</span>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={subiendo}
                  placeholder="pocus, abdomen, fast"
                  className={`h-10 rounded-[9px] border border-border bg-card px-3 text-[13px] outline-none focus:border-secondary placeholder:text-muted-foreground ${focusRing}`}
                />
              </label>
            </div>
          )}

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
                <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              )}
              <p className="text-[12.5px] leading-relaxed">{mensaje}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-border bg-muted px-6 py-4">
          <button
            type="button"
            onClick={onCerrar}
            disabled={subiendo}
            className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={subir}
            disabled={!archivo || !tipoDetectado || subiendo}
            className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload aria-hidden className="h-4 w-4" strokeWidth={2} />
            {subiendo ? 'Subiendo…' : 'Subir a la biblioteca'}
          </button>
        </div>
      </div>
    </div>
  );
}
