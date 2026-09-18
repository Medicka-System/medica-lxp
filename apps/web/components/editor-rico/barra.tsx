'use client';

/**
 * Barra de herramientas del EditorRico. Los botones reflejan el estado real de la
 * selección (activo/inactivo/deshabilitado) vía `useEditorState`, que re-renderiza
 * solo cuando cambia lo que observa. Iconografía Lucide (stroke 1.75 · §5A).
 *
 * Territorio: NO sube archivos de media (eso es del pipeline de media). La imagen y
 * el video se referencian por URL; el Word se convierte a HTML en el cliente.
 */
import { useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import {
  Bold,
  Code,
  Code2,
  FileUp,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Sigma,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline,
  Undo2,
  Youtube,
} from 'lucide-react';
import { focusRing } from '@/components/tokens';
import { EXT_WORD } from './importar-word';

export type AccionesBarra = {
  abrirEnlace: () => void;
  abrirImagen: () => void;
  abrirYoutube: () => void;
  abrirFormula: () => void;
  abrirHtml: () => void;
  importarWord: (archivo: File) => void;
};

const btn =
  'grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-foreground-soft transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent';
const btnActivo = 'bg-accent text-accent-foreground hover:bg-accent';

function Boton({
  titulo,
  onClick,
  activo,
  deshabilitado,
  children,
}: {
  titulo: string;
  onClick: () => void;
  activo?: boolean;
  deshabilitado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={activo}
      disabled={deshabilitado}
      onClick={onClick}
      className={`${btn} ${activo ? btnActivo : ''} ${focusRing}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

const ICONO = 'h-[17px] w-[17px]';

export function BarraHerramientas({
  editor,
  acciones,
}: {
  editor: Editor;
  acciones: AccionesBarra;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  // Estado observado: re-render solo cuando cambia alguno de estos flags.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      parrafo: e.isActive('paragraph'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      highlight: e.isActive('highlight'),
      enlace: e.isActive('link'),
      enTabla: e.isActive('table'),
      puedeDeshacer: e.can().undo(),
      puedeRehacer: e.can().redo(),
    }),
  });

  const c = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formato del contenido"
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-card px-2 py-1.5"
    >
      <Boton titulo="Deshacer" onClick={() => c().undo().run()} deshabilitado={!s.puedeDeshacer}>
        <Undo2 className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Rehacer" onClick={() => c().redo().run()} deshabilitado={!s.puedeRehacer}>
        <Redo2 className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Sep />

      <Boton titulo="Párrafo" onClick={() => c().setParagraph().run()} activo={s.parrafo}>
        <Pilcrow className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Título 1" onClick={() => c().toggleHeading({ level: 1 }).run()} activo={s.h1}>
        <Heading1 className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Título 2" onClick={() => c().toggleHeading({ level: 2 }).run()} activo={s.h2}>
        <Heading2 className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Título 3" onClick={() => c().toggleHeading({ level: 3 }).run()} activo={s.h3}>
        <Heading3 className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Sep />

      <Boton titulo="Negrita" onClick={() => c().toggleBold().run()} activo={s.bold}>
        <Bold className={ICONO} strokeWidth={2} />
      </Boton>
      <Boton titulo="Itálica" onClick={() => c().toggleItalic().run()} activo={s.italic}>
        <Italic className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Subrayado" onClick={() => c().toggleUnderline().run()} activo={s.underline}>
        <Underline className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Tachado" onClick={() => c().toggleStrike().run()} activo={s.strike}>
        <Strikethrough className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Resaltar" onClick={() => c().toggleHighlight().run()} activo={s.highlight}>
        <Highlighter className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Código en línea" onClick={() => c().toggleCode().run()} activo={s.code}>
        <Code className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Sep />

      <Boton titulo="Lista con viñetas" onClick={() => c().toggleBulletList().run()} activo={s.bullet}>
        <List className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Lista numerada" onClick={() => c().toggleOrderedList().run()} activo={s.ordered}>
        <ListOrdered className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Cita" onClick={() => c().toggleBlockquote().run()} activo={s.quote}>
        <Quote className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Línea divisoria" onClick={() => c().setHorizontalRule().run()}>
        <Minus className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Sep />

      <Boton titulo="Enlace" onClick={acciones.abrirEnlace} activo={s.enlace}>
        <Link2 className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Imagen (por URL)" onClick={acciones.abrirImagen}>
        <ImageIcon className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Video de YouTube" onClick={acciones.abrirYoutube}>
        <Youtube className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Fórmula (KaTeX)" onClick={acciones.abrirFormula}>
        <Sigma className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Insertar tabla" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} activo={s.enTabla}>
        <TableIcon className={ICONO} strokeWidth={1.75} />
      </Boton>

      {s.enTabla && (
        <>
          <Sep />
          <button
            type="button"
            onClick={() => c().addColumnAfter().run()}
            className={`h-8 rounded-[8px] px-2 text-[11.5px] font-semibold text-foreground-soft hover:bg-muted ${focusRing}`}
          >
            + Columna
          </button>
          <button
            type="button"
            onClick={() => c().addRowAfter().run()}
            className={`h-8 rounded-[8px] px-2 text-[11.5px] font-semibold text-foreground-soft hover:bg-muted ${focusRing}`}
          >
            + Fila
          </button>
          <button
            type="button"
            onClick={() => c().deleteColumn().run()}
            className={`h-8 rounded-[8px] px-2 text-[11.5px] font-semibold text-foreground-soft hover:bg-muted ${focusRing}`}
          >
            − Columna
          </button>
          <button
            type="button"
            onClick={() => c().deleteRow().run()}
            className={`h-8 rounded-[8px] px-2 text-[11.5px] font-semibold text-foreground-soft hover:bg-muted ${focusRing}`}
          >
            − Fila
          </button>
          <Boton titulo="Eliminar tabla" onClick={() => c().deleteTable().run()}>
            <Trash2 className={ICONO} strokeWidth={1.75} />
          </Boton>
        </>
      )}

      <Sep />
      <Boton titulo="Importar de Word (.docx)" onClick={() => fileRef.current?.click()}>
        <FileUp className={ICONO} strokeWidth={1.75} />
      </Boton>
      <Boton titulo="Ver / editar HTML" onClick={acciones.abrirHtml}>
        <Code2 className={ICONO} strokeWidth={1.75} />
      </Boton>

      <input
        ref={fileRef}
        type="file"
        accept={EXT_WORD}
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) acciones.importarWord(archivo);
          e.target.value = '';
        }}
      />
    </div>
  );
}
