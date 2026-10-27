'use client';

/**
 * CapturaRecurso — pieza ÚNICA de CAPTURA de un recurso de media simple (§5C). Unifica los
 * tres gestos: SUBIR (archivo → PUT firmado directo a storage) · ENLACE (URL directa) ·
 * BIBLIOTECA (elegir uno existente · se habilita en un paso posterior). Produce un contrato
 * de fuente único `{ ref | src }` y lo entrega por `onCambio`; el RENDER/envoltorio (cómo se
 * previsualiza: <img>, <object>…) lo aporta cada editor por `renderPreview` — eso NO se unifica.
 *
 * Extraída del patrón que ya funcionaba en el editor de imagen de teoría (FuenteImagen +
 * firmarSubidaImagenContenido): mismo comportamiento, ahora reutilizable por imagen, galería y
 * PDF sin duplicar el patrón. REUSA las primitivas de subida existentes (no crea uploaders).
 *
 * `familia` selecciona las acciones y los `accept`:
 *   · imagen  → firmarSubidaImagenContenido / firmarLecturaImagenContenido (ref `media/imagenes/…`)
 *   · archivo → (se cablea en el sub-paso de PDF: firmarSubidaMediaArchivo / lectura de archivo)
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FolderOpen, Link2, Loader2, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { softText, focusRing } from '@/lib/studio/estilos';
import {
  firmarSubidaImagenContenido,
  firmarLecturaImagenContenido,
  firmarLecturaArchivoContenido,
} from '@/lib/studio/media-acciones';
import { firmarSubidaMediaArchivo } from '@/lib/studio/contenido-acciones';
import type { Recurso, TipoRecurso } from '@/lib/studio/contenido-contrato';
import { buscarRecursosBiblioteca, resolverFuenteRecursoAutor } from './recursos-acciones';

export type FuenteMedia = { ref?: string; src?: string };
export type FamiliaCaptura = 'imagen' | 'archivo';

/** Resultado homogéneo de firmar la SUBIDA (imagen y archivo comparten forma). */
type SubidaFirmada = { ref: string; urlSubida: string; urlLectura: string };

/** Config por familia: acciones de subida/lectura + accept + etiqueta + aceptación de MIME. */
type ConfigFamilia = {
  accept: string;
  etiquetaSubir: string;
  /** Firma la subida (devuelve ref + urls) a partir de la extensión. */
  firmarSubida: (ext: string) => Promise<{ ok: true; datos: SubidaFirmada } | { ok: false; error: string }>;
  /** Firma la LECTURA de una ref para el preview de vida corta (null si no se puede). */
  firmarLectura: (ref: string) => Promise<string | null>;
  /** content-type por defecto para el PUT cuando el archivo no lo trae. */
  ctDefault: string;
  /** Tipos de `lxp.recursos` que ofrece la pestaña Biblioteca para esta familia. */
  tiposBiblioteca: TipoRecurso[];
};

const FAMILIAS: Record<FamiliaCaptura, ConfigFamilia> = {
  imagen: {
    accept: 'image/png,image/jpeg,image/webp',
    etiquetaSubir: 'Subir imagen',
    firmarSubida: (ext) => firmarSubidaImagenContenido(ext),
    firmarLectura: async (ref) => {
      const r = await firmarLecturaImagenContenido([ref]);
      return r.ok ? (r.datos.urls[ref] ?? null) : null;
    },
    ctDefault: 'image/jpeg',
    tiposBiblioteca: ['imagen'],
  },
  archivo: {
    accept: 'application/pdf,.pdf',
    etiquetaSubir: 'Subir PDF',
    firmarSubida: (ext) => firmarSubidaMediaArchivo(ext),
    firmarLectura: async (ref) => {
      const r = await firmarLecturaArchivoContenido([ref]);
      return r.ok ? (r.datos.urls[ref] ?? null) : null;
    },
    ctDefault: 'application/pdf',
    tiposBiblioteca: ['pdf', 'word', 'ppt'],
  },
};

function extDe(nombre: string): string {
  return nombre.split('.').pop()?.toLowerCase() ?? '';
}

export function CapturaRecurso({
  familia,
  valor,
  onCambio,
  renderPreview,
  extras,
  biblioteca = true,
}: {
  familia: FamiliaCaptura;
  valor: FuenteMedia;
  onCambio: (f: FuenteMedia) => void;
  /** Envoltorio de previsualización (cómo se muestra la fuente ya resuelta) — NO se unifica. */
  renderPreview: (url: string) => React.ReactNode;
  /** Campos propios del bloque que acompañan al preview (alt/pie/título). */
  extras?: React.ReactNode;
  /** Muestra la pestaña "Elegir de biblioteca" (recursos ya existentes). Default: sí. */
  biblioteca?: boolean;
}) {
  const cfg = FAMILIAS[familia];
  const [modoFuente, setModoFuente] = useState<'subir' | 'enlace' | 'biblioteca'>(valor.ref ? 'subir' : 'enlace');
  const [enlace, setEnlace] = useState(valor.src ?? '');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reemplazando, setReemplazando] = useState(false);
  // Preview de la fuente SUBIDA: URL firmada de vida corta (la ref no es pública).
  const [previewRef, setPreviewRef] = useState<string | null>(null);

  const tieneFuente = !!valor.ref || !!valor.src;
  const mostrarPicker = !tieneFuente || reemplazando;

  useEffect(() => {
    let vivo = true;
    if (!valor.ref) {
      setPreviewRef(null);
      return;
    }
    cfg.firmarLectura(valor.ref).then((url) => {
      if (vivo) setPreviewRef(url);
    });
    return () => {
      vivo = false;
    };
  }, [valor.ref, cfg]);

  async function subir(file: File) {
    setError(null);
    setSubiendo(true);
    try {
      const sol = await cfg.firmarSubida(extDe(file.name));
      if (!sol.ok) {
        setError(sol.error);
        return;
      }
      const put = await fetch(sol.datos.urlSubida, {
        method: 'PUT',
        headers: { 'content-type': file.type || cfg.ctDefault },
        body: file,
      }).catch(() => null);
      if (!put || !put.ok) {
        setError('No se pudo subir el archivo al almacenamiento (URL firmada). Reintenta.');
        return;
      }
      // Subida DIRECTA: contenido educativo (sin PII), no pasa por el redactor (§10).
      setPreviewRef(sol.datos.urlLectura);
      onCambio({ ref: sol.datos.ref, src: '' });
      setReemplazando(false);
    } finally {
      setSubiendo(false);
    }
  }

  function vincularEnlace() {
    setError(null);
    const u = enlace.trim();
    if (!/^https?:\/\/\S+/i.test(u)) {
      setError('Pega una URL válida (http/https).');
      return;
    }
    onCambio({ src: u, ref: undefined });
    setReemplazando(false);
  }

  function quitar() {
    setEnlace('');
    setPreviewRef(null);
    onCambio({ src: '', ref: undefined });
    setReemplazando(false);
  }

  async function elegirBiblioteca(recursoId: string) {
    setError(null);
    const fuente = await resolverFuenteRecursoAutor(recursoId);
    if (!fuente) {
      setError('Ese recurso todavía no tiene archivo disponible.');
      return;
    }
    // Las familias de captura (imagen/archivo) resuelven a `ref`; el lector firma su lectura.
    if (fuente.campo === 'src') onCambio({ src: fuente.valor, ref: undefined });
    else onCambio({ ref: fuente.valor, src: '' });
    setReemplazando(false);
  }

  const urlPreview = valor.ref ? previewRef : valor.src || null;

  return (
    <div className="grid gap-3">
      {error && (
        <div
          role="alert"
          className="rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-medium text-[color:var(--destructive-foreground)]"
        >
          {error}
        </div>
      )}

      {tieneFuente && !reemplazando && (
        <>
          {urlPreview ? (
            renderPreview(urlPreview)
          ) : (
            <div className="grid place-items-center gap-2 rounded-[10px] border border-dashed border-border bg-muted py-8 text-center">
              <Loader2 aria-hidden className="h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
              <p className={`max-w-[36ch] text-[12px] ${softText}`}>Cargando la vista previa…</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border bg-card p-3">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
              {valor.ref ? <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.9} /> : <Link2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            </span>
            <p className="min-w-0 flex-1 text-[12.5px] font-semibold">
              {valor.ref ? 'Archivo subido' : 'Por enlace'}
              {!valor.ref && valor.src && <span className={`ml-1 truncate font-normal ${softText}`}>· {valor.src}</span>}
            </p>
            <button
              type="button"
              onClick={() => {
                setReemplazando(true);
                setModoFuente(valor.ref ? 'subir' : 'enlace');
              }}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
            >
              <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Reemplazar
            </button>
            <button
              type="button"
              onClick={quitar}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-[color:var(--track)] hover:text-destructive ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Quitar
            </button>
          </div>

          {extras}
        </>
      )}

      {mostrarPicker && (
        <FuentePicker
          cfg={cfg}
          biblioteca={biblioteca}
          modo={modoFuente}
          onModo={setModoFuente}
          subiendo={subiendo}
          enlace={enlace}
          onEnlace={setEnlace}
          onArchivo={subir}
          onVincular={vincularEnlace}
          onElegirBiblioteca={elegirBiblioteca}
          reemplazando={reemplazando}
          onCancelar={() => {
            setReemplazando(false);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Picker (subir | enlace | biblioteca) — generalizado de FuenteImagen ── */
function FuentePicker({
  cfg,
  biblioteca,
  modo,
  onModo,
  subiendo,
  enlace,
  onEnlace,
  onArchivo,
  onVincular,
  onElegirBiblioteca,
  reemplazando,
  onCancelar,
}: {
  cfg: ConfigFamilia;
  biblioteca: boolean;
  modo: 'subir' | 'enlace' | 'biblioteca';
  onModo: (m: 'subir' | 'enlace' | 'biblioteca') => void;
  subiendo: boolean;
  enlace: string;
  onEnlace: (v: string) => void;
  onArchivo: (file: File) => void;
  onVincular: () => void;
  onElegirBiblioteca: (recursoId: string) => void;
  reemplazando: boolean;
  onCancelar: () => void;
}) {
  const tabs = [
    ['subir', cfg.etiquetaSubir, Upload] as const,
    ['enlace', 'Pegar enlace', Link2] as const,
    ...(biblioteca ? [['biblioteca', 'Biblioteca', FolderOpen] as const] : []),
  ];
  return (
    <div className="rounded-[11px] border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-[10px] border border-border bg-muted p-0.5">
          {tabs.map(([id, etiqueta, Icono]) => {
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
        {reemplazando && (
          <button
            type="button"
            onClick={onCancelar}
            className={`ml-auto rounded-[8px] border border-border bg-card px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-accent ${focusRing}`}
          >
            Cancelar
          </button>
        )}
      </div>

      {modo === 'biblioteca' ? (
        <ListaBiblioteca tipos={cfg.tiposBiblioteca} onElegir={onElegirBiblioteca} />
      ) : modo === 'subir' ? (
        <label
          className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] bg-muted px-6 py-7 text-center transition-colors hover:border-primary hover:bg-accent ${
            subiendo ? 'pointer-events-none opacity-60' : ''
          } ${focusRing}`}
        >
          <input
            type="file"
            accept={cfg.accept}
            className="sr-only"
            disabled={subiendo}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onArchivo(f);
              e.target.value = '';
            }}
          />
          <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground">
            {subiendo ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} /> : <Upload className="h-5 w-5" strokeWidth={1.6} />}
          </span>
          <span className="text-[13px] font-bold">{subiendo ? 'Subiendo…' : 'Arrastra o elige un archivo'}</span>
          <span className={`text-[11.5px] ${softText}`}>Se sube directo al almacenamiento (sin PII · §10).</span>
        </label>
      ) : (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={enlace}
              onChange={(e) => onEnlace(e.target.value)}
              placeholder="https://…"
              className={`h-10 min-w-[220px] flex-1 rounded-[9px] border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground ${focusRing}`}
            />
            <button
              type="button"
              onClick={onVincular}
              disabled={!enlace.trim()}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[9px] bg-primary px-4 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
            >
              <Link2 aria-hidden className="h-4 w-4" strokeWidth={2} />
              Usar enlace
            </button>
          </div>
          <p className={`mt-2 text-[11.5px] leading-relaxed ${softText}`}>
            El enlace se usa tal cual (recurso ya público) o sube el archivo directo al almacenamiento.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Lista ligera de la Biblioteca, filtrada por familia (reusa buscarRecursosBiblioteca) ── */
/** Exportada para reusarla como picker SOLO-biblioteca (p. ej. reemplazo de H5P · 4c). */
export function ListaBiblioteca({
  tipos,
  onElegir,
}: {
  tipos: TipoRecurso[];
  onElegir: (recursoId: string) => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [pendienteDb, setPendienteDb] = useState(false);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    buscarRecursosBiblioteca()
      .then((bib) => {
        if (!vivo) return;
        setRecursos(bib.recursos.filter((r) => tipos.includes(r.tipo)));
        setPendienteDb(bib.pendienteDb);
      })
      .catch((e) => console.error('[CapturaRecurso/ListaBiblioteca] fallo:', e))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
    // `tipos` es estable por familia (literal del cfg) → carga única al abrir la pestaña.
  }, []);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return recursos;
    return recursos.filter((r) => r.nombre.toLowerCase().includes(t) || r.etiquetas.some((e) => e.toLowerCase().includes(t)));
  }, [recursos, q]);

  if (cargando) {
    return (
      <div className="mt-3 grid place-items-center gap-2 py-8 text-center">
        <Loader2 aria-hidden className="h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.75} />
        <p className={`text-[12px] ${softText}`}>Cargando la biblioteca…</p>
      </div>
    );
  }
  if (pendienteDb) {
    return (
      <div className="mt-3 rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-3.5">
        <p className="text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
          La Biblioteca de Contenido aún no está disponible. Mientras tanto, sube el archivo o pega un enlace.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-3 grid gap-2.5">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en la biblioteca…"
          aria-label="Buscar recurso"
          className={`h-9 w-full rounded-[9px] border border-border bg-card pl-8 pr-3 text-[12.5px] outline-none focus:border-secondary ${focusRing}`}
        />
      </div>
      {filtrados.length === 0 ? (
        <p className={`px-2 py-6 text-center text-[13px] ${softText}`}>No hay recursos de este tipo en la biblioteca.</p>
      ) : (
        <ul className="grid max-h-[300px] gap-2 overflow-y-auto">
          {filtrados.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onElegir(r.id)}
                className={`flex w-full items-center gap-3 rounded-[11px] border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
              >
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
                  <FolderOpen className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold leading-snug">{r.nombre}</span>
                  <span className={`block truncate text-[11.5px] ${softText}`}>{r.meta}</span>
                </span>
                <span className="shrink-0 text-[10.5px] uppercase text-muted-foreground">{r.tipo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
