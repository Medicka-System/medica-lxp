'use client';

/**
 * Editores por SUB-TIPO de bloque de teoría (§5C). Cada rama es la UI de edición de un
 * `tipo_bloque` y REUSA los componentes que ya existen — no los reconstruye:
 *   · texto  → EditorRico (TipTap · KaTeX · Word · tablas)
 *   · video  → BloqueVideo (transcripción + hitos)
 *   · h5p    → BloqueH5P   (editor/player H5P · servidor PENDIENTE DE API)
 *   · xapi   → BloquePaquete (subir/reproducir paquete · ingesta PENDIENTE DE API)
 *   · caso   → VisorDicom  (visor Cornerstone3D · estudio anonimizado PENDIENTE 4.7)
 *   · imagen/galeria/html/link/pdf → campos simples (URL) + previsualización.
 *
 * Los editores son CONTROLADOS: exponen su estado por `onCambio(config)` y el contenedor
 * (`BloqueItem`) decide cuándo persistir (CRUD web→Supabase bajo RLS · Regla de Oro §2).
 * La resolución de URLs firmadas de media es del servicio de media (PENDIENTE DE API ·
 * `components/bloques/contratos.ts`): aquí el diseñador puede pegar una URL directa.
 */

import { Image as ImageIcon, Link as LinkIcon, Plus, ScanLine, Trash2 } from 'lucide-react';
import { EditorRico } from '@/components/editor-rico/editor-rico';
import { BloqueVideo } from '@/components/bloques/video/bloque-video';
import { BloqueH5P } from '@/components/bloques/h5p/bloque-h5p';
import { BloquePaquete } from '@/components/bloques/paquetes/bloque-paquete';
import { VisorDicom, type EstudioDicom } from '@/components/dicom';
import type { HitoVideo, PaqueteContenido } from '@/components/bloques/contratos';
import { mono, softText, focusRing } from '@/lib/studio/estilos';
import type {
  ConfigCaso,
  ConfigGaleria,
  ConfigH5p,
  ConfigHtml,
  ConfigImagen,
  ConfigLink,
  ConfigPdf,
  ConfigTexto,
  ConfigVideo,
  ConfigXapi,
  TipoBloqueTeoria,
} from './tipos-bloque';

/* ─────────────────────────── Campos base (estilo Studio · §5A) ─────────────────────────── */

const claseInput =
  'w-full rounded-[9px] border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-[color:var(--muted-foreground)] focus:border-secondary';

function Campo({
  etiqueta,
  valor,
  onCambio,
  placeholder,
  tipo = 'text',
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  placeholder?: string;
  tipo?: 'text' | 'url';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-muted-foreground">{etiqueta}</span>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        className={`${claseInput} ${focusRing}`}
      />
    </label>
  );
}

function Area({
  etiqueta,
  valor,
  onCambio,
  placeholder,
  filas = 5,
  mono: esMono = false,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  placeholder?: string;
  filas?: number;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-muted-foreground">{etiqueta}</span>
      <textarea
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        rows={filas}
        className={`${claseInput} resize-y leading-relaxed ${esMono ? mono : ''} ${focusRing}`}
      />
    </label>
  );
}

/** Aviso de contrato reutilizable (media/servidor/ingesta PENDIENTE DE API). */
function AvisoContrato({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
      <p className="text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">{children}</p>
    </div>
  );
}

/* ─────────────────────────── Editor por tipo ─────────────────────────── */

export type EditorBloqueProps = {
  tipo: TipoBloqueTeoria;
  config: Record<string, unknown>;
  onCambio: (config: Record<string, unknown>) => void;
};

export function EditorBloque({ tipo, config, onCambio }: EditorBloqueProps) {
  switch (tipo) {
    case 'texto':
      return <EditorTexto config={config as ConfigTexto} onCambio={onCambio} />;
    case 'imagen':
      return <EditorImagen config={config as ConfigImagen} onCambio={onCambio} />;
    case 'galeria':
      return <EditorGaleria config={config as ConfigGaleria} onCambio={onCambio} />;
    case 'video':
      return <EditorVideo config={config as ConfigVideo} onCambio={onCambio} />;
    case 'html':
      return <EditorHtml config={config as ConfigHtml} onCambio={onCambio} />;
    case 'link':
      return <EditorLink config={config as ConfigLink} onCambio={onCambio} />;
    case 'pdf':
      return <EditorPdf config={config as ConfigPdf} onCambio={onCambio} />;
    case 'caso':
      return <EditorCaso config={config as ConfigCaso} />;
    case 'h5p':
      return <EditorH5p config={config as ConfigH5p} onCambio={onCambio} />;
    case 'xapi':
      return <EditorXapi config={config as ConfigXapi} onCambio={onCambio} />;
    default:
      return null;
  }
}

/* ── Texto (EditorRico) ── */
function EditorTexto({ config, onCambio }: { config: ConfigTexto; onCambio: (c: Record<string, unknown>) => void }) {
  return (
    <EditorRico
      contenidoInicial={config.html ?? ''}
      placeholder="Escribe la teoría… (formato, listas, tablas, fórmulas KaTeX, importar Word)"
      onChange={(html) => onCambio({ html })}
      ariaLabel="Contenido del bloque de texto"
    />
  );
}

/* ── Imagen ── */
function EditorImagen({ config, onCambio }: { config: ConfigImagen; onCambio: (c: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-3">
      <Campo
        etiqueta="URL de la imagen"
        tipo="url"
        valor={config.src ?? ''}
        onCambio={(src) => onCambio({ ...config, src })}
        placeholder="https://… o URL firmada del servicio de media"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Texto alternativo (alt)" valor={config.alt ?? ''} onCambio={(alt) => onCambio({ ...config, alt })} />
        <Campo etiqueta="Pie de imagen" valor={config.pie ?? ''} onCambio={(pie) => onCambio({ ...config, pie })} />
      </div>
      {config.src ? (
        <figure className="overflow-hidden rounded-[10px] border border-border bg-muted">
          {/* <img> a propósito: la URL es arbitraria (externa / firmada), no un asset local de next/image. */}
          <img src={config.src} alt={config.alt ?? ''} className="max-h-[320px] w-full object-contain" />
          {config.pie && <figcaption className={`px-3 py-2 text-[12px] ${softText}`}>{config.pie}</figcaption>}
        </figure>
      ) : (
        <VacioMedia icono={ImageIcon} texto="Pega la URL de una imagen para previsualizarla." />
      )}
    </div>
  );
}

/* ── Galería ── */
function EditorGaleria({ config, onCambio }: { config: ConfigGaleria; onCambio: (c: Record<string, unknown>) => void }) {
  const imagenes = config.imagenes ?? [];
  const set = (imgs: ConfigGaleria['imagenes']) => onCambio({ imagenes: imgs });
  return (
    <div className="grid gap-3">
      {imagenes.map((img, i) => (
        <div key={i} className="grid gap-2 rounded-[10px] border border-border bg-muted p-3 sm:grid-cols-[1fr_1fr_auto]">
          <Campo
            etiqueta={`Imagen ${i + 1} · URL`}
            tipo="url"
            valor={img.src}
            onCambio={(src) => set(imagenes.map((x, j) => (j === i ? { ...x, src } : x)))}
          />
          <Campo
            etiqueta="Alt"
            valor={img.alt}
            onCambio={(alt) => set(imagenes.map((x, j) => (j === i ? { ...x, alt } : x)))}
          />
          <button
            type="button"
            onClick={() => set(imagenes.filter((_, j) => j !== i))}
            aria-label={`Quitar imagen ${i + 1}`}
            className={`mt-[22px] grid h-9 w-9 place-items-center self-start rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:text-destructive ${focusRing}`}
          >
            <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => set([...imagenes, { src: '', alt: '' }])}
        className={`inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-accent px-3 text-[12px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
      >
        <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
        Agregar imagen
      </button>
      {imagenes.some((x) => x.src) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {imagenes.filter((x) => x.src).map((img, i) => (
            // <img> a propósito: URL arbitraria del diseñador, no asset local de next/image.
            <img key={i} src={img.src} alt={img.alt} className="aspect-video w-full rounded-[9px] border border-border object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Video (BloqueVideo) ── */
function EditorVideo({ config, onCambio }: { config: ConfigVideo; onCambio: (c: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          etiqueta="URL del video"
          tipo="url"
          valor={config.src ?? ''}
          onCambio={(src) => onCambio({ ...config, src })}
          placeholder="URL firmada (Stream / object storage)"
        />
        <Campo etiqueta="Título" valor={config.titulo ?? ''} onCambio={(titulo) => onCambio({ ...config, titulo })} />
      </div>
      <BloqueVideo
        modo="editar"
        src={config.src || null}
        titulo={config.titulo}
        hitos={config.hitos ?? []}
        onCambioHitos={(hitos: HitoVideo[]) => onCambio({ ...config, hitos })}
      />
      <AvisoContrato>
        La transcripción y la resolución de URL firmada las provee el servicio de media —{' '}
        <span className="font-bold">pendiente de API</span> (GET /media/url · /media/transcripcion). Por ahora se
        acepta una URL directa.
      </AvisoContrato>
    </div>
  );
}

/* ── HTML embebido ── */
function EditorHtml({ config, onCambio }: { config: ConfigHtml; onCambio: (c: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-3">
      <Area
        etiqueta="HTML embebido"
        valor={config.html ?? ''}
        onCambio={(html) => onCambio({ html })}
        placeholder="<iframe …></iframe> · <div>…</div>"
        mono
        filas={6}
      />
      {config.html && (
        <div>
          <p className="mb-1 text-[11.5px] font-semibold text-muted-foreground">Previsualización</p>
          <div
            className="rounded-[10px] border border-border bg-card p-3 text-[13px]"
            // El HTML lo escribe el staff de autoría (RLS es_autoria); es contenido de confianza.
            dangerouslySetInnerHTML={{ __html: config.html }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Enlace ── */
function EditorLink({ config, onCambio }: { config: ConfigLink; onCambio: (c: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-3">
      <Campo
        etiqueta="URL"
        tipo="url"
        valor={config.url ?? ''}
        onCambio={(url) => onCambio({ ...config, url })}
        placeholder="https://…"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Título" valor={config.titulo ?? ''} onCambio={(titulo) => onCambio({ ...config, titulo })} />
        <Campo
          etiqueta="Descripción"
          valor={config.descripcion ?? ''}
          onCambio={(descripcion) => onCambio({ ...config, descripcion })}
        />
      </div>
      {config.url && (
        <a
          href={config.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-start gap-3 rounded-[10px] border border-border bg-card p-3.5 transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
        >
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
            <LinkIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-bold leading-snug">{config.titulo || config.url}</span>
            {config.descripcion && <span className={`mt-0.5 block text-[12px] ${softText}`}>{config.descripcion}</span>}
            <span className={`${mono} mt-0.5 block truncate text-[11px] text-muted-foreground`}>{config.url}</span>
          </span>
        </a>
      )}
    </div>
  );
}

/* ── PDF ── */
function EditorPdf({ config, onCambio }: { config: ConfigPdf; onCambio: (c: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          etiqueta="URL del PDF"
          tipo="url"
          valor={config.src ?? ''}
          onCambio={(src) => onCambio({ ...config, src })}
          placeholder="URL firmada (object storage)"
        />
        <Campo etiqueta="Título" valor={config.titulo ?? ''} onCambio={(titulo) => onCambio({ ...config, titulo })} />
      </div>
      {config.src ? (
        <object data={config.src} type="application/pdf" className="h-[420px] w-full rounded-[10px] border border-border bg-muted">
          <div className="grid h-full place-items-center p-6 text-center">
            <p className={`text-[12.5px] ${softText}`}>
              Tu navegador no puede incrustar este PDF.{' '}
              <a href={config.src} target="_blank" rel="noopener noreferrer" className="font-semibold text-secondary underline">
                Abrir en una pestaña
              </a>
              .
            </p>
          </div>
        </object>
      ) : (
        <AvisoContrato>
          Pega la URL del PDF (o insértalo desde la Biblioteca de Contenido). El servicio de media firma la URL —{' '}
          <span className="font-bold">pendiente de API</span>.
        </AvisoContrato>
      )}
    </div>
  );
}

/* ── Caso DICOM (VisorDicom) ── */
function EditorCaso({ config }: { config: ConfigCaso }) {
  // El estudio anonimizado del caso lo deja el worker `procesar-dicom` (PENDIENTE 4.7);
  // hasta entonces no hay estudio que montar y se muestra la catalogación + el aviso.
  // Cuando exista, esta rama monta el visor real sin tocar el resto del bloque.
  const estudio: EstudioDicom | null = null;

  if (!config.casoId) {
    return (
      <AvisoContrato>
        Este bloque referencia un caso del Banco de Casos. Usa <span className="font-bold">Insertar recurso</span>{' '}
        para elegir un caso curado.
      </AvisoContrato>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
          <ScanLine className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-snug">{config.titulo || 'Caso sin título'}</p>
          <p className={`text-[12px] ${softText}`}>
            {[config.organo, config.dominio].filter(Boolean).join(' · ') || 'Caso del Banco de Casos'}
          </p>
        </div>
      </div>
      {estudio ? (
        <VisorDicom estudio={estudio} soloLectura className="h-[360px] w-full rounded-[10px] border border-border" />
      ) : (
        <AvisoContrato>
          El visor DICOM (Cornerstone3D) se monta cuando el worker <span className="font-bold">procesar-dicom</span>{' '}
          deja el estudio anonimizado del caso — <span className="font-bold">pendiente (Sprint 4.7)</span>.
        </AvisoContrato>
      )}
    </div>
  );
}

/* ── H5P (BloqueH5P) ── */
function EditorH5p({ config, onCambio }: { config: ConfigH5p; onCambio: (c: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-3">
      <Campo etiqueta="Título" valor={config.titulo ?? ''} onCambio={(titulo) => onCambio({ ...config, titulo })} />
      <BloqueH5P
        modo="ver"
        contentId={config.contentId || undefined}
        servidorBase={null}
        titulo={config.titulo}
      />
    </div>
  );
}

/* ── xAPI (BloquePaquete) ── */
function EditorXapi({ config, onCambio }: { config: ConfigXapi; onCambio: (c: Record<string, unknown>) => void }) {
  const paquete: PaqueteContenido = {
    id: config.paqueteId || undefined,
    titulo: config.titulo,
    tipo: 'xapi',
    estado: config.paqueteId ? 'listo' : 'sin_subir',
  };
  return (
    <div className="grid gap-3">
      <Campo etiqueta="Título" valor={config.titulo ?? ''} onCambio={(titulo) => onCambio({ ...config, titulo })} />
      <BloquePaquete modo="ver" paquete={paquete} titulo={config.titulo} />
    </div>
  );
}

/* ── Estado vacío para media sin URL ── */
function VacioMedia({ icono: Icono, texto }: { icono: typeof ImageIcon; texto: string }) {
  return (
    <div className="grid place-items-center gap-2 rounded-[10px] border border-dashed border-border bg-muted py-8 text-center">
      <Icono aria-hidden className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
      <p className={`max-w-[36ch] text-[12px] ${softText}`}>{texto}</p>
    </div>
  );
}
