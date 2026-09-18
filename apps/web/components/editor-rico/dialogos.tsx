'use client';

/**
 * Diálogos del EditorRico: enlace, imagen (por URL), YouTube, fórmula KaTeX y
 * el editor de HTML crudo (ver/editar/pegar HTML). Son modales ligeros y
 * accesibles (rol dialog, Esc para cerrar, foco al abrir) — sin dependencias de
 * UI extra (§3). Estilo con tokens (§5A).
 *
 * NOTA de alcance: la imagen se inserta por URL. La SUBIDA de archivos de imagen a
 * object storage la resuelve el pipeline de media (otro territorio · §2/§9): aquí
 * solo se referencia una URL ya existente.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import katex from 'katex';
import { focusRing } from '@/components/tokens';

/* ── Modal base ── */
function ModalRico({
  titulo,
  descripcion,
  onCerrar,
  children,
  pie,
}: {
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  children: React.ReactNode;
  pie: React.ReactNode;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-50 grid place-items-center p-6"
      style={{ background: 'rgba(15,45,82,.52)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-start gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold tracking-[-0.01em]">{titulo}</h2>
            {descripcion && (
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{descripcion}</p>
            )}
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
        <div className="px-5 pb-2">{children}</div>
        <div className="mt-3 flex items-center justify-end gap-2.5 border-t border-border bg-muted px-5 py-3.5">
          {pie}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-[9px] border border-border bg-card px-3 py-2 text-[13.5px] outline-none focus:border-secondary';
const botonPrimario =
  'inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-secondary hover:text-white';
const botonSecundario =
  'inline-flex h-10 items-center rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground';
const botonPeligro =
  'inline-flex h-10 items-center rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-4 text-[13.5px] font-semibold text-[color:var(--destructive-foreground)]';

function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-2 block">
      <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {etiqueta}
      </span>
      {children}
    </label>
  );
}

/* ── Enlace ── */
export function DialogoEnlace({
  hrefInicial,
  onCerrar,
  onAplicar,
  onQuitar,
}: {
  hrefInicial: string;
  onCerrar: () => void;
  onAplicar: (href: string) => void;
  onQuitar: () => void;
}) {
  const [href, setHref] = useState(hrefInicial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  function aplicar() {
    const v = href.trim();
    if (v) onAplicar(v);
  }

  return (
    <ModalRico
      titulo="Enlace"
      descripcion="Pega la dirección. El enlace abre en una pestaña nueva."
      onCerrar={onCerrar}
      pie={
        <>
          {hrefInicial && (
            <button type="button" onClick={onQuitar} className={`${botonPeligro} mr-auto`}>
              Quitar enlace
            </button>
          )}
          <button type="button" onClick={onCerrar} className={botonSecundario}>
            Cancelar
          </button>
          <button type="button" onClick={aplicar} className={botonPrimario}>
            {hrefInicial ? 'Actualizar' : 'Aplicar'}
          </button>
        </>
      }
    >
      <Campo etiqueta="Dirección (URL)">
        <input
          ref={ref}
          value={href}
          onChange={(e) => setHref(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && aplicar()}
          placeholder="https://…"
          className={inputCls}
          inputMode="url"
        />
      </Campo>
    </ModalRico>
  );
}

/* ── Imagen (por URL) ── */
export function DialogoImagen({
  onCerrar,
  onAplicar,
}: {
  onCerrar: () => void;
  onAplicar: (src: string, alt: string) => void;
}) {
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  function aplicar() {
    const v = src.trim();
    if (v) onAplicar(v, alt.trim());
  }

  return (
    <ModalRico
      titulo="Insertar imagen"
      descripcion="Referencia una imagen por su URL. La subida de archivos vive en el pipeline de media."
      onCerrar={onCerrar}
      pie={
        <>
          <button type="button" onClick={onCerrar} className={botonSecundario}>
            Cancelar
          </button>
          <button type="button" onClick={aplicar} className={botonPrimario}>
            Insertar
          </button>
        </>
      }
    >
      <Campo etiqueta="URL de la imagen">
        <input
          ref={ref}
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          placeholder="https://…/imagen.png"
          className={inputCls}
          inputMode="url"
        />
      </Campo>
      <Campo etiqueta="Texto alternativo (accesibilidad)">
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && aplicar()}
          placeholder="Describe la imagen"
          className={inputCls}
        />
      </Campo>
    </ModalRico>
  );
}

/* ── YouTube ── */
export function DialogoYoutube({
  onCerrar,
  onAplicar,
}: {
  onCerrar: () => void;
  onAplicar: (url: string) => void;
}) {
  const [url, setUrl] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  function aplicar() {
    const v = url.trim();
    if (v) onAplicar(v);
  }

  return (
    <ModalRico
      titulo="Insertar video de YouTube"
      descripcion="Pega el enlace del video; se embebe en modo sin cookies."
      onCerrar={onCerrar}
      pie={
        <>
          <button type="button" onClick={onCerrar} className={botonSecundario}>
            Cancelar
          </button>
          <button type="button" onClick={aplicar} className={botonPrimario}>
            Insertar
          </button>
        </>
      }
    >
      <Campo etiqueta="Enlace de YouTube">
        <input
          ref={ref}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && aplicar()}
          placeholder="https://www.youtube.com/watch?v=…"
          className={inputCls}
          inputMode="url"
        />
      </Campo>
    </ModalRico>
  );
}

/* ── Fórmula KaTeX ── */
export function DialogoFormula({
  onCerrar,
  onAplicar,
}: {
  onCerrar: () => void;
  onAplicar: (latex: string, bloque: boolean) => void;
}) {
  const [latex, setLatex] = useState('');
  const [bloque, setBloque] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const previewId = useId();
  useEffect(() => ref.current?.focus(), []);

  let previewHtml = '';
  try {
    previewHtml = latex.trim()
      ? katex.renderToString(latex, { throwOnError: false, displayMode: bloque })
      : '';
  } catch {
    previewHtml = '';
  }

  function aplicar() {
    const v = latex.trim();
    if (v) onAplicar(v, bloque);
  }

  return (
    <ModalRico
      titulo="Fórmula (KaTeX)"
      descripcion="Escribe la fórmula en LaTeX. También puedes teclear $…$ (inline) o $$…$$ (bloque) directo en el texto."
      onCerrar={onCerrar}
      pie={
        <>
          <button type="button" onClick={onCerrar} className={botonSecundario}>
            Cancelar
          </button>
          <button type="button" onClick={aplicar} className={botonPrimario}>
            Insertar
          </button>
        </>
      }
    >
      <Campo etiqueta="LaTeX">
        <textarea
          ref={ref}
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) aplicar();
          }}
          placeholder="\\frac{a}{b} = c^2"
          rows={3}
          className={`${inputCls} font-mono resize-y`}
          spellCheck={false}
        />
      </Campo>
      <label className="mt-2 flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
        <input
          type="checkbox"
          checked={bloque}
          onChange={(e) => setBloque(e.target.checked)}
          className="h-4 w-4 accent-[color:var(--primary)]"
        />
        Mostrar como bloque (centrada, en su propia línea)
      </label>
      <div className="mt-3">
        <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Vista previa
        </span>
        <div
          id={previewId}
          aria-live="polite"
          className="editor-rico-prose grid min-h-[46px] place-items-center rounded-[9px] border border-border bg-muted px-3 py-2"
        >
          {previewHtml ? (
            <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <span className="text-[12.5px] text-muted-foreground">La fórmula aparecerá aquí.</span>
          )}
        </div>
      </div>
    </ModalRico>
  );
}

/* ── HTML crudo (ver / editar / pegar HTML) ── */
export function DialogoHtml({
  htmlInicial,
  onCerrar,
  onAplicar,
}: {
  htmlInicial: string;
  onCerrar: () => void;
  onAplicar: (html: string) => void;
}) {
  const [html, setHtml] = useState(htmlInicial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <ModalRico
      titulo="Código HTML"
      descripcion="Revisa o edita el HTML del contenido. Al aplicar, reemplaza el documento actual."
      onCerrar={onCerrar}
      pie={
        <>
          <button type="button" onClick={onCerrar} className={botonSecundario}>
            Cancelar
          </button>
          <button type="button" onClick={() => onAplicar(html)} className={botonPrimario}>
            Aplicar HTML
          </button>
        </>
      }
    >
      <textarea
        ref={ref}
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        rows={14}
        spellCheck={false}
        aria-label="Código HTML del contenido"
        className={`${inputCls} font-mono text-[12.5px] leading-relaxed resize-y`}
      />
    </ModalRico>
  );
}
