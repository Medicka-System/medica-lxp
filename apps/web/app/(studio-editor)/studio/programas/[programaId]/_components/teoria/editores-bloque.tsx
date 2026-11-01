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

import { useState, useTransition } from 'react';
import {
  AudioLines,
  Check,
  Link as LinkIcon,
  Link2,
  Loader2,
  Pencil,
  Plus,
  ScanLine,
  Trash2,
  Upload,
} from 'lucide-react';
import { EditorRico } from '@/components/editor-rico/editor-rico';
import { CapturaRecurso } from './captura-recurso';
import { EditorVideoAutoria } from '@/components/bloques/video/editor-video-autoria';
import { BloqueH5P } from '@/components/bloques/h5p/bloque-h5p';
import { BloquePaquete } from '@/components/bloques/paquetes/bloque-paquete';
import { VisorEstudio } from '@/components/casos/visor-estudio';
import type { FuenteVideoConfig, PaqueteContenido } from '@/components/bloques/contratos';
import { mono, softText, focusRing } from '@/lib/studio/estilos';
import { ingestarPaquete } from '@/lib/studio/media-acciones';
import { generarNarracionBloque } from '@/lib/studio/acciones';

/**
 * Prefijo del H5P server (§7 · api). El editor/player de H5P corren en el navegador y
 * pegan directo al `api` (CORS habilitado), por eso se usa la URL PÚBLICA. Mismo patrón
 * que la lección tipo H5P (`_editores/editor-h5p.tsx`).
 */
const H5P_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/h5p`
  : null;
import type {
  ConfigCaso,
  ConfigEncuesta,
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
import { comoEncuestaConfig } from '@/lib/studio/encuesta-contrato';
import { ConstructorEncuesta } from '../_editores/constructor-encuesta';

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
  /** Lección destino (necesaria para subir media/paquetes al dominio · §2). */
  leccionId: string;
};

export function EditorBloque({ tipo, config, onCambio, leccionId }: EditorBloqueProps) {
  switch (tipo) {
    case 'texto':
      return <EditorTexto config={config as ConfigTexto} onCambio={onCambio} />;
    case 'imagen':
      return <EditorImagen config={config as ConfigImagen} onCambio={onCambio} />;
    case 'galeria':
      return <EditorGaleria config={config as ConfigGaleria} onCambio={onCambio} />;
    case 'video':
      return <EditorVideo config={config as ConfigVideo} onCambio={onCambio} leccionId={leccionId} />;
    case 'html':
      return <EditorHtml config={config as ConfigHtml} onCambio={onCambio} />;
    case 'link':
      return <EditorLink config={config as ConfigLink} onCambio={onCambio} />;
    case 'pdf':
      return <EditorPdf config={config as ConfigPdf} onCambio={onCambio} />;
    case 'caso':
      return <EditorCaso config={config as ConfigCaso} />;
    case 'h5p':
      return <EditorH5p config={config as ConfigH5p} onCambio={onCambio} leccionId={leccionId} />;
    case 'xapi':
      return <EditorXapi config={config as ConfigXapi} onCambio={onCambio} leccionId={leccionId} />;
    case 'encuesta':
      return <EditorEncuestaBloque config={config as ConfigEncuesta} onCambio={onCambio} />;
    default:
      return null;
  }
}

/* ── Encuesta (bloque) — mismo constructor que la lección tipo encuesta (no califica) ── */
function EditorEncuestaBloque({
  config,
  onCambio,
}: {
  config: ConfigEncuesta;
  onCambio: (c: Record<string, unknown>) => void;
}) {
  const normalizado = comoEncuestaConfig(config as Record<string, unknown>);
  return (
    <ConstructorEncuesta
      config={normalizado}
      onCambio={(next) => onCambio(next as unknown as Record<string, unknown>)}
    />
  );
}

/* ── Texto (EditorRico + narración TTS) ── */
function EditorTexto({ config, onCambio }: { config: ConfigTexto; onCambio: (c: Record<string, unknown>) => void }) {
  const [generando, iniciarGeneracion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const tieneNarracion = Boolean(config.narracion?.audioId);

  function generar() {
    setError(null);
    iniciarGeneracion(async () => {
      const r = await generarNarracionBloque(config.html ?? '');
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // Preserva el html; agrega/actualiza la referencia de narración (audioId).
      onCambio({ ...config, narracion: { audioId: r.audioId } });
    });
  }

  return (
    <div className="grid gap-3">
      <EditorRico
        contenidoInicial={config.html ?? ''}
        // Preserva `narracion` al editar el texto (onCambio reemplaza todo el config).
        onChange={(html) => onCambio({ ...config, html })}
        ariaLabel="Contenido del bloque de texto"
      />

      {/* Narración TTS: Eco/worker sintetizan el texto; el alumno la escucha en la lección. */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border bg-muted/40 px-3 py-2.5">
        <button
          type="button"
          onClick={generar}
          disabled={generando}
          className={`inline-flex h-9 items-center gap-2 rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
        >
          {generando ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <AudioLines aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          )}
          {generando ? 'Generando…' : tieneNarracion ? 'Regenerar narración' : 'Generar narración'}
        </button>

        {tieneNarracion && !generando && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-secondary">
            <Check aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            Narración generada — guarda el bloque para publicarla.
          </span>
        )}
        {!tieneNarracion && !generando && !error && (
          <span className={`text-[11.5px] ${softText}`}>
            Eco lee el texto y genera el audio (hoy mock silencioso; voz real por env · §3).
          </span>
        )}
        {error && <span className="text-[12px] font-semibold text-destructive">{error}</span>}
      </div>
    </div>
  );
}

/* ── Imagen (SUBIR directo · contenido educativo sin PII · o ENLACE) — captura unificada ── */

function EditorImagen({ config, onCambio }: { config: ConfigImagen; onCambio: (c: Record<string, unknown>) => void }) {
  // Captura unificada (subir/enlace); el RENDER (figure+img) y los campos alt/pie son el
  // envoltorio propio del bloque de imagen. El contrato de fuente es `{ ref | src }`.
  return (
    <CapturaRecurso
      familia="imagen"
      valor={{ ref: config.ref, src: config.src }}
      onCambio={(f) => onCambio({ ...config, ref: f.ref, src: f.src ?? '' })}
      renderPreview={(url) => (
        <figure className="overflow-hidden rounded-[10px] border border-border bg-muted">
          {/* <img> a propósito: URL arbitraria (externa) o firmada, no asset local de next/image. */}
          <img src={url} alt={config.alt ?? ''} className="max-h-[320px] w-full object-contain" />
          {config.pie && <figcaption className={`px-3 py-2 text-[12px] ${softText}`}>{config.pie}</figcaption>}
        </figure>
      )}
      extras={
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Texto alternativo (alt)" valor={config.alt ?? ''} onCambio={(alt) => onCambio({ ...config, alt })} />
          <Campo etiqueta="Pie de imagen" valor={config.pie ?? ''} onCambio={(pie) => onCambio({ ...config, pie })} />
        </div>
      }
    />
  );
}


/* ── Galería (N× CapturaRecurso familia imagen · subir o enlace por ítem) ── */
function EditorGaleria({ config, onCambio }: { config: ConfigGaleria; onCambio: (c: Record<string, unknown>) => void }) {
  const imagenes = config.imagenes ?? [];
  const set = (imgs: ConfigGaleria['imagenes']) => onCambio({ imagenes: imgs });
  return (
    <div className="grid gap-3">
      {imagenes.map((img, i) => (
        <div key={i} className="rounded-[10px] border border-border bg-muted p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-muted-foreground">Imagen {i + 1}</span>
            <button
              type="button"
              onClick={() => set(imagenes.filter((_, j) => j !== i))}
              aria-label={`Quitar imagen ${i + 1}`}
              className={`grid h-9 w-9 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:text-destructive ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <CapturaRecurso
            familia="imagen"
            valor={{ ref: img.ref, src: img.src }}
            onCambio={(f) => set(imagenes.map((x, j) => (j === i ? { ...x, ref: f.ref, src: f.src ?? '' } : x)))}
            renderPreview={(url) => (
              // <img> a propósito: URL arbitraria (externa / firmada), no asset local de next/image.
              <img src={url} alt={img.alt} className="aspect-video w-full rounded-[9px] border border-border object-cover" />
            )}
            extras={
              <Campo
                etiqueta="Texto alternativo (alt)"
                valor={img.alt}
                onCambio={(alt) => set(imagenes.map((x, j) => (j === i ? { ...x, alt } : x)))}
              />
            }
          />
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
    </div>
  );
}

/* ── Video (EditorVideoAutoria · MISMA autoría que la lección de video) ── */
function EditorVideo({
  config,
  onCambio,
  leccionId,
}: {
  config: ConfigVideo;
  onCambio: (c: Record<string, unknown>) => void;
  leccionId: string;
}) {
  // Compat: un bloque viejo guardaba la fuente directa en `src` → trátala como enlace.
  const fuente: FuenteVideoConfig =
    config.videotecaId || config.url
      ? config
      : config.src
        ? { url: config.src, estado: 'listo', hitos: config.hitos ?? [], transcripcion: config.transcripcion ?? [] }
        : config;

  return (
    <div className="grid gap-3">
      <Campo etiqueta="Título" valor={config.titulo ?? ''} onCambio={(titulo) => onCambio({ ...config, titulo })} />
      <EditorVideoAutoria
        titulo={config.titulo || 'Video'}
        leccionId={leccionId}
        config={fuente}
        onCambio={(f) =>
          // Conserva el título/recurso del bloque; `src` viejo se descarta al fijar fuente nueva.
          onCambio({ titulo: config.titulo ?? '', recursoId: config.recursoId, ...f })
        }
      />
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
  // Captura unificada (subir PDF a storage → `ref`, o enlace → `src`); el render es el
  // visor `<object>` embebido (envoltorio propio del bloque). Título como campo del bloque.
  return (
    <CapturaRecurso
      familia="archivo"
      valor={{ ref: config.ref, src: config.src }}
      onCambio={(f) => onCambio({ ...config, ref: f.ref, src: f.src ?? '' })}
      renderPreview={(url) => (
        <object data={url} type="application/pdf" className="h-[420px] w-full rounded-[10px] border border-border bg-muted">
          <div className="grid h-full place-items-center p-6 text-center">
            <p className={`text-[12.5px] ${softText}`}>
              Tu navegador no puede incrustar este PDF.{' '}
              <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-secondary underline">
                Abrir en una pestaña
              </a>
              .
            </p>
          </div>
        </object>
      )}
      extras={<Campo etiqueta="Título" valor={config.titulo ?? ''} onCambio={(titulo) => onCambio({ ...config, titulo })} />}
    />
  );
}

/* ── Caso DICOM (VisorEstudio real · el mismo de bitácora/biblioteca · §4.7) ── */
function EditorCaso({ config }: { config: ConfigCaso }) {
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
      {/* Visor Cornerstone3D real del estudio anonimizado del caso curado (tabla
          casos_biblioteca). Se monta bajo demanda; si el caso no tiene estudio DICOM,
          VisorEstudio degrada con dignidad ("No se pudo abrir el estudio"). soloLectura:
          en el constructor solo se previsualiza el caso, no se anota. */}
      <VisorEstudio
        casoId={config.casoId}
        tabla="casos_biblioteca"
        soloLectura
        className="h-[60vh] min-h-[440px] w-full"
      />
    </div>
  );
}

/* ── Selector de fuente (Subir/autorar | Pegar enlace) reutilizable para H5P y xAPI ── */
function SelectorFuenteSubirEnlace({
  modo,
  onModo,
  etiquetaSubir,
}: {
  modo: 'subir' | 'enlace';
  onModo: (m: 'subir' | 'enlace') => void;
  etiquetaSubir: string;
}) {
  return (
    <div className="inline-flex rounded-[10px] border border-border bg-muted p-0.5">
      {(
        [
          ['subir', etiquetaSubir, Upload],
          ['enlace', 'Pegar enlace', Link2],
        ] as const
      ).map(([id, etiqueta, Icono]) => {
        const on = modo === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onModo(id)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-bold transition-colors ${focusRing} ${
              on ? 'bg-card text-foreground shadow-rest' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icono aria-hidden className="h-3.5 w-3.5" strokeWidth={1.9} />
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/** Campo de enlace + botón; previsualiza el embed en iframe (H5P/xAPI por link externo). */
function EnlaceEmbebido({
  url,
  onUrl,
  onVincular,
  titulo,
  ayuda,
}: {
  url: string;
  onUrl: (v: string) => void;
  onVincular: () => void;
  titulo?: string;
  ayuda: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          placeholder="https://…"
          className={`h-10 min-w-[220px] flex-1 rounded-[9px] border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground ${focusRing}`}
        />
        <button
          type="button"
          onClick={onVincular}
          disabled={!url.trim()}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[9px] bg-primary px-4 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          <Link2 aria-hidden className="h-4 w-4" strokeWidth={2} />
          Vincular enlace
        </button>
      </div>
      <p className={`text-[11.5px] leading-relaxed ${softText}`}>{ayuda}</p>
      {/^https?:\/\/\S+/i.test(url) && (
        <div className="overflow-hidden rounded-[10px] border border-border bg-[color:var(--sidebar)]">
          <iframe
            src={url}
            title={titulo || 'Contenido embebido'}
            className="aspect-video w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            allow="fullscreen"
          />
        </div>
      )}
    </div>
  );
}

/* ── H5P (BloqueH5P · autorar en el servidor real, o enlace externo) ── */
function EditorH5p({
  config,
  onCambio,
  leccionId,
}: {
  config: ConfigH5p;
  onCambio: (c: Record<string, unknown>) => void;
  leccionId: string;
}) {
  const [modoFuente, setModoFuente] = useState<'subir' | 'enlace'>(config.url ? 'enlace' : 'subir');
  const [enlace, setEnlace] = useState(config.url ?? '');

  return (
    <div className="grid gap-3">
      <Campo etiqueta="Título" valor={config.titulo ?? ''} onCambio={(titulo) => onCambio({ ...config, titulo })} />
      <SelectorFuenteSubirEnlace modo={modoFuente} onModo={setModoFuente} etiquetaSubir="Autorar / subir H5P" />

      {modoFuente === 'subir' ? (
        <BloqueH5P
          modo="editar"
          contentId={config.contentId || undefined}
          servidorBase={H5P_BASE}
          leccionId={leccionId}
          titulo={config.titulo}
          contexto="Interactivo H5P · se autora y previsualiza en el Studio (subir .h5p o crear)"
          onGuardado={(id) => onCambio({ ...config, contentId: id, url: undefined })}
        />
      ) : (
        <EnlaceEmbebido
          url={enlace}
          onUrl={setEnlace}
          onVincular={() => {
            const u = enlace.trim();
            if (/^https?:\/\/\S+/i.test(u)) onCambio({ ...config, url: u, contentId: '' });
          }}
          titulo={config.titulo}
          ayuda="Embebe un H5P alojado en otro sitio (H5P.com u otro host) por su URL de incrustación."
        />
      )}
    </div>
  );
}

/* ── xAPI (BloquePaquete · ingesta real del .zip, o enlace externo) ── */
function EditorXapi({
  config,
  onCambio,
  leccionId,
}: {
  config: ConfigXapi;
  onCambio: (c: Record<string, unknown>) => void;
  leccionId: string;
}) {
  const [modoFuente, setModoFuente] = useState<'subir' | 'enlace'>(config.url ? 'enlace' : 'subir');
  const [enlace, setEnlace] = useState(config.url ?? '');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compat: bloques viejos guardaban `paqueteId`; hoy la ingesta devuelve `contenidoId`.
  const cargado = !!config.contenidoId || !!config.paqueteId;

  async function subir(file: File) {
    setError(null);
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.set('archivo', file);
      fd.set('leccionId', leccionId);
      if (config.titulo) fd.set('titulo', config.titulo);
      const r = await ingestarPaquete(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onCambio({
        ...config,
        contenidoId: r.datos.contenidoId,
        tipo: r.datos.tipo,
        titulo: config.titulo || r.datos.titulo,
        entryPoint: r.datos.entryPoint,
        url: undefined,
        paqueteId: undefined,
      });
    } finally {
      setSubiendo(false);
    }
  }

  const paquete: PaqueteContenido = {
    id: config.contenidoId || config.paqueteId || undefined,
    titulo: config.titulo,
    tipo: config.tipo === 'scorm' ? 'scorm12' : 'xapi',
    estado: cargado ? 'listo' : 'sin_subir',
  };

  return (
    <div className="grid gap-3">
      <Campo etiqueta="Título" valor={config.titulo ?? ''} onCambio={(titulo) => onCambio({ ...config, titulo })} />
      <SelectorFuenteSubirEnlace modo={modoFuente} onModo={setModoFuente} etiquetaSubir="Subir paquete .zip" />

      {error && (
        <div
          role="alert"
          className="rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-medium text-[color:var(--destructive-foreground)]"
        >
          {error}
        </div>
      )}

      {modoFuente === 'subir' ? (
        subiendo ? (
          <div className="flex items-center gap-3 rounded-[11px] border border-border bg-card px-5 py-6">
            <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-secondary" strokeWidth={2} />
            <p className={`text-[13px] leading-relaxed ${softText}`}>
              Subiendo el paquete y validando el manifiesto en el dominio… no cierres esta pantalla.
            </p>
          </div>
        ) : cargado ? (
          <div className="grid gap-2">
            <BloquePaquete modo="ver" paquete={paquete} titulo={config.titulo} />
            <button
              type="button"
              onClick={() => onCambio({ ...config, contenidoId: undefined, paqueteId: undefined, entryPoint: null })}
              className={`inline-flex h-9 w-fit items-center gap-2 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
            >
              <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Reemplazar paquete
            </button>
          </div>
        ) : (
          <BloquePaquete
            modo="editar"
            titulo={config.titulo}
            contexto="Paquete SCORM / xAPI · exportado de Articulate Rise / Storyline"
            onSubir={subir}
          />
        )
      ) : (
        <EnlaceEmbebido
          url={enlace}
          onUrl={setEnlace}
          onVincular={() => {
            const u = enlace.trim();
            if (/^https?:\/\/\S+/i.test(u)) onCambio({ ...config, url: u, contenidoId: undefined, paqueteId: undefined });
          }}
          titulo={config.titulo}
          ayuda="Embebe un lanzador xAPI/SCORM ya alojado (Articulate 360, Rise share, otro LMS) por su URL."
        />
      )}
    </div>
  );
}

