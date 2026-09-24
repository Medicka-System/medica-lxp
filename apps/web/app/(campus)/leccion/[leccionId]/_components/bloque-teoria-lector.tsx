'use client';

/**
 * Render de SOLO LECTURA de un bloque de teoría (modelo NUEVO · `lxp.bloques` · mig
 * 0023) del lado del ALUMNO. Espeja el editor del diseñador (teoria/editores-bloque)
 * pero sin controles de edición: reusa los MISMOS componentes de display en modo `ver`
 * (ContenidoRico, BloqueVideo/BloqueH5P/BloquePaquete). Los 10 sub-tipos (§5C):
 * texto · imagen · galeria · video · html · link · pdf · caso · h5p · xapi.
 *
 * El `config` llega crudo (jsonb): cada rama lee lo suyo de forma DEFENSIVA (el
 * esquema no conoce los sub-tipos · `tipo_bloque` es text). El HTML de texto/html lo
 * escribió el staff de autoría (RLS es_autoria) → contenido de confianza.
 */

import { useEffect, useState } from 'react';
import { Link as LinkIcon, ScanLine } from 'lucide-react';
import { ContenidoRico } from '@/components/editor-rico';
import { BloqueVideo } from '@/components/bloques/video/bloque-video';
import { BloqueH5P } from '@/components/bloques/h5p/bloque-h5p';
import { BloquePaquete } from '@/components/bloques/paquetes/bloque-paquete';
import type { CueTranscripcion, HitoVideo, PaqueteContenido } from '@/components/bloques/contratos';
import type { BloqueTeoriaVista } from '@/lib/campus/leccion-contrato';
import { firmarReproduccionAlumno } from '@/lib/campus/leccion-video-acciones';
import { firmarLecturaImagenAlumno } from '@/lib/campus/leccion-media-acciones';

/** Lectura defensiva de un string del config crudo. */
function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Prefijo del H5P server (§7 · api) para reproducir el interactivo del alumno. */
const H5P_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/h5p`
  : null;

export function BloqueTeoriaLector({ bloque }: { bloque: BloqueTeoriaVista }) {
  const c = bloque.config;

  switch (bloque.tipoBloque) {
    case 'texto':
      return (
        <div className="cuerpo-lectura">
          <ContenidoRico html={str(c.html)} />
        </div>
      );

    case 'html':
      return (
        <div
          className="rounded-xl border border-border bg-card p-4 text-[13.5px]"
          // Contenido de autoría (RLS es_autoria): HTML de confianza.
          dangerouslySetInnerHTML={{ __html: str(c.html) }}
        />
      );

    case 'imagen':
      return <ImagenBloqueLector c={c} />;

    case 'galeria': {
      const imgs = (Array.isArray(c.imagenes) ? c.imagenes : []) as { src?: unknown; alt?: unknown }[];
      const conSrc = imgs.filter((x) => str(x?.src));
      return conSrc.length ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {conSrc.map((img, i) => (
            <img
              key={i}
              src={str(img.src)}
              alt={str(img.alt)}
              className="aspect-video w-full rounded-[10px] border border-border object-cover"
            />
          ))}
        </div>
      ) : null;
    }

    case 'video':
      return <VideoBloqueLector c={c} />;

    case 'link':
      return str(c.url) ? (
        <a
          href={str(c.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-[12px] border border-border bg-card p-3.5 transition-colors hover:border-primary hover:bg-accent"
        >
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground"
          >
            <LinkIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-bold leading-snug">{str(c.titulo) || str(c.url)}</span>
            {str(c.descripcion) && (
              <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{str(c.descripcion)}</span>
            )}
          </span>
        </a>
      ) : null;

    case 'pdf':
      return str(c.src) ? (
        <object
          data={str(c.src)}
          type="application/pdf"
          className="h-[520px] w-full rounded-[12px] border border-border bg-muted"
        >
          <div className="grid h-full place-items-center p-6 text-center">
            <p className="text-[12.5px] text-muted-foreground">
              Tu navegador no puede incrustar este PDF.{' '}
              <a href={str(c.src)} target="_blank" rel="noopener noreferrer" className="font-semibold text-secondary underline">
                Abrir en una pestaña
              </a>
              .
            </p>
          </div>
        </object>
      ) : null;

    case 'caso':
      // El visor DICOM real (Cornerstone3D) monta el estudio anonimizado del caso; en la
      // lección se muestra la catalogación como tarjeta (el visor pesado vive en su vista).
      return (
        <div className="flex items-center gap-3 rounded-[12px] border border-border bg-card p-3.5">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground"
          >
            <ScanLine className="h-[20px] w-[20px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-snug">{str(c.titulo) || 'Caso del Banco'}</p>
            <p className="text-[12px] text-muted-foreground">
              {[str(c.organo), str(c.dominio)].filter(Boolean).join(' · ') || 'Caso DICOM curado'}
            </p>
          </div>
        </div>
      );

    case 'h5p': {
      const url = str(c.url);
      // Enlace externo: embebe el H5P alojado en otro host por su URL de incrustación.
      if (url) {
        return (
          <div className="overflow-hidden rounded-[12px] border border-border bg-[color:var(--sidebar)]">
            <iframe
              src={url}
              title={str(c.titulo) || 'Interactivo H5P'}
              className="aspect-video w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              allow="fullscreen"
            />
          </div>
        );
      }
      return (
        <BloqueH5P
          modo="ver"
          contentId={str(c.contentId) || undefined}
          servidorBase={H5P_BASE}
          titulo={str(c.titulo) || undefined}
        />
      );
    }

    case 'xapi': {
      const url = str(c.url);
      const id = str(c.contenidoId) || str(c.paqueteId);
      const paquete: PaqueteContenido = {
        id: id || undefined,
        titulo: str(c.titulo) || undefined,
        tipo: str(c.tipo) === 'scorm' ? 'scorm12' : 'xapi',
        // Enlace externo → lanzador embebible directo; paquete ingerido → estado listo
        // (el lanzador servido por el dominio queda pendiente, como en la lección xAPI).
        estado: url || id ? 'listo' : 'sin_subir',
        lanzadorUrl: url || null,
      };
      return <BloquePaquete modo="ver" paquete={paquete} titulo={str(c.titulo) || undefined} />;
    }

    default:
      return null;
  }
}

/**
 * Bloque de IMAGEN del alumno — enlace directo (`src`) tal cual, o firma la lectura de la
 * imagen SUBIDA y anonimizada (`ref` → `media/imagenes/…`) con vida corta (§2/§10).
 */
function ImagenBloqueLector({ c }: { c: Record<string, unknown> }) {
  const src = str(c.src);
  const ref = str(c.ref);
  const alt = str(c.alt);
  const pie = str(c.pie);
  const [url, setUrl] = useState<string | null>(src || null);

  useEffect(() => {
    let vivo = true;
    if (src) {
      setUrl(src);
      return;
    }
    if (!ref) {
      setUrl(null);
      return;
    }
    firmarLecturaImagenAlumno(ref).then((r) => {
      if (vivo) setUrl(r.ok ? r.url : null);
    });
    return () => {
      vivo = false;
    };
  }, [src, ref]);

  if (!url) return null;
  return (
    <figure className="overflow-hidden rounded-[12px] border border-border bg-muted">
      {/* <img> a propósito: URL arbitraria (externa / firmada), no asset local de next/image. */}
      <img src={url} alt={alt} className="max-h-[480px] w-full object-contain" />
      {pie && <figcaption className="px-3.5 py-2 text-[12px] text-muted-foreground">{pie}</figcaption>}
    </figure>
  );
}

/**
 * Bloque de VIDEO del alumno — mismo player, transcripción e hitos que la LECCIÓN de
 * video. Deriva la fuente: enlace directo (`url`, o `src` de bloques viejos) tal cual, o
 * firma la lectura de la subida a videoteca (`videotecaId`) con vida corta (§2/§6).
 */
function VideoBloqueLector({ c }: { c: Record<string, unknown> }) {
  const url = str(c.url) || str(c.src);
  const videotecaId = str(c.videotecaId);
  const titulo = str(c.titulo) || undefined;
  const hitos = (Array.isArray(c.hitos) ? c.hitos : []) as HitoVideo[];
  const transcripcion = (Array.isArray(c.transcripcion) ? c.transcripcion : []) as CueTranscripcion[];

  const [src, setSrc] = useState<string | null>(url || null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    if (url) {
      setSrc(url);
      return;
    }
    if (!videotecaId) {
      setSrc(null);
      return;
    }
    firmarReproduccionAlumno(videotecaId).then((r) => {
      if (!vivo) return;
      if (r.ok) setSrc(r.url);
      else {
        setSrc(null);
        setAviso(r.error);
      }
    });
    return () => {
      vivo = false;
    };
  }, [url, videotecaId]);

  return (
    <>
      <BloqueVideo
        modo="ver"
        src={src}
        titulo={titulo}
        hitos={hitos}
        transcripcion={transcripcion}
        cargando={!src && !!videotecaId && !url && !aviso}
      />
      {aviso && !src && <p className="mt-2 text-[12px] text-muted-foreground">{aviso}</p>}
    </>
  );
}
