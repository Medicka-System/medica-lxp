'use client';

/**
 * EditorRico — editor de contenido rico REUTILIZABLE (§3/§5B). Un solo componente
 * que consumen el bloque de Teoría del course builder, el Foro del alumno y
 * cualquier bloque futuro. Basado en TipTap v3.
 *
 * Capacidades: texto con formato, encabezados, listas, cita, código; ENLACES,
 * IMÁGENES (por URL), TABLAS, embed de YOUTUBE, RESALTADO, FÓRMULAS KaTeX (inline y
 * bloque), CONTADOR de palabras/caracteres, ver/editar/pegar HTML e IMPORTAR Word.
 *
 * Modo lectura: con `editable={false}` se convierte en visor (sin barra ni pie),
 * renderizando el mismo HTML — así lo que se escribe es idéntico a lo que se ve, y
 * hereda el tema de lectura (claro/sepia/oscuro) del contenedor sin código extra.
 *
 * SSR (Next 16): `immediatelyRender:false` evita el desajuste de hidratación.
 */
import { useCallback, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { mono } from '@/components/tokens';
import { construirExtensiones } from './extensiones';
import { importarWord } from './importar-word';
import { BarraHerramientas } from './barra';
import {
  DialogoEnlace,
  DialogoFormula,
  DialogoHtml,
  DialogoImagen,
  DialogoYoutube,
} from './dialogos';
import './editor-rico.css';

export type EditorRicoProps = {
  /** HTML inicial del documento. */
  contenidoInicial?: string;
  /** Si es editable (barra + pie). En false actúa como visor. Default: true. */
  editable?: boolean;
  /** Texto guía cuando está vacío (solo en edición). */
  placeholder?: string;
  /** Alto mínimo del lienzo en px (solo edición). Default: 260. */
  minAlto?: number;
  /** Límite duro de caracteres (opcional). */
  limiteCaracteres?: number;
  /** Etiqueta accesible del área de edición. */
  ariaLabel?: string;
  /** Se llama con el HTML en cada cambio (solo edición). '' cuando queda vacío. */
  onChange?: (html: string) => void;
  className?: string;
};

type Dialogo = 'enlace' | 'imagen' | 'youtube' | 'formula' | 'html' | null;

/** HTML "limpio": TipTap deja `<p></p>` en un doc vacío → lo tratamos como ''. */
function htmlLimpio(editor: { isEmpty: boolean; getHTML: () => string }): string {
  return editor.isEmpty ? '' : editor.getHTML();
}

export function EditorRico({
  contenidoInicial = '',
  editable = true,
  placeholder = 'Escribe aquí…',
  minAlto = 260,
  limiteCaracteres,
  ariaLabel = 'Editor de contenido',
  onChange,
  className,
}: EditorRicoProps) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: construirExtensiones({ limiteCaracteres }),
    content: contenidoInicial,
    editorProps: {
      attributes: {
        class: 'editor-rico-prose',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': ariaLabel,
      },
    },
    onUpdate: ({ editor }) => onChange?.(htmlLimpio(editor)),
  });

  const manejarWord = useCallback(
    async (archivo: File) => {
      if (!editor) return;
      try {
        const { html, avisos } = await importarWord(archivo);
        editor.chain().focus().insertContent(html).run();
        setAviso(
          avisos.length
            ? `Documento importado (${avisos.length} aviso${avisos.length === 1 ? '' : 's'} de formato).`
            : 'Documento importado.',
        );
      } catch {
        setAviso('No se pudo importar el documento. ¿Es un .docx válido?');
      }
    },
    [editor],
  );

  // Estado observado para placeholder y contador (re-render solo si cambian).
  const estado = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            vacio: e.isEmpty,
            caracteres: e.storage.characterCount?.characters() ?? 0,
            palabras: e.storage.characterCount?.words() ?? 0,
          }
        : { vacio: true, caracteres: 0, palabras: 0 },
  }) ?? { vacio: true, caracteres: 0, palabras: 0 };

  if (!editor) {
    // Reserva de espacio mientras monta (evita salto de layout).
    return (
      <div
        className={cn('rounded-xl border border-border bg-card', className)}
        style={{ minHeight: editable ? minAlto + 44 : minAlto }}
        aria-busy="true"
      />
    );
  }

  // ── Visor (read-only) ──
  if (!editable) {
    return (
      <div className={className}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  // ── Editor ──
  const enlaceActual = (editor.getAttributes('link').href as string | undefined) ?? '';

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-rest', className)}>
      <BarraHerramientas
        editor={editor}
        acciones={{
          abrirEnlace: () => setDialogo('enlace'),
          abrirImagen: () => setDialogo('imagen'),
          abrirYoutube: () => setDialogo('youtube'),
          abrirFormula: () => setDialogo('formula'),
          abrirHtml: () => setDialogo('html'),
          importarWord: manejarWord,
        }}
      />

      <div className="editor-rico-lienzo relative px-4 py-3" style={{ ['--er-min-alto' as string]: `${minAlto}px` }}>
        {estado.vacio && (
          <span className="editor-rico-placeholder left-4 top-3 text-[15px]">{placeholder}</span>
        )}
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center gap-3 border-t border-border bg-muted px-4 py-2 text-[11.5px] text-muted-foreground">
        <span className={mono}>
          {estado.palabras} palabra{estado.palabras === 1 ? '' : 's'}
        </span>
        <span aria-hidden>·</span>
        <span className={mono}>
          {estado.caracteres}
          {limiteCaracteres ? ` / ${limiteCaracteres}` : ''} caracteres
        </span>
        {aviso && (
          <span className="ml-auto truncate font-semibold text-[color:var(--info-foreground)]" role="status">
            {aviso}
          </span>
        )}
      </div>

      {dialogo === 'enlace' && (
        <DialogoEnlace
          hrefInicial={enlaceActual}
          onCerrar={() => setDialogo(null)}
          onAplicar={(href) => {
            editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
            setDialogo(null);
          }}
          onQuitar={() => {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            setDialogo(null);
          }}
        />
      )}
      {dialogo === 'imagen' && (
        <DialogoImagen
          onCerrar={() => setDialogo(null)}
          onAplicar={(src, alt) => {
            editor.chain().focus().setImage({ src, alt }).run();
            setDialogo(null);
          }}
        />
      )}
      {dialogo === 'youtube' && (
        <DialogoYoutube
          onCerrar={() => setDialogo(null)}
          onAplicar={(src) => {
            editor.commands.setYoutubeVideo({ src });
            setDialogo(null);
          }}
        />
      )}
      {dialogo === 'formula' && (
        <DialogoFormula
          onCerrar={() => setDialogo(null)}
          onAplicar={(latex, bloque) => {
            if (bloque) editor.chain().focus().insertBlockMath({ latex }).run();
            else editor.chain().focus().insertInlineMath({ latex }).run();
            setDialogo(null);
          }}
        />
      )}
      {dialogo === 'html' && (
        <DialogoHtml
          htmlInicial={editor.getHTML()}
          onCerrar={() => setDialogo(null)}
          onAplicar={(html) => {
            editor.commands.setContent(html);
            onChange?.(htmlLimpio(editor));
            setDialogo(null);
          }}
        />
      )}
    </div>
  );
}
