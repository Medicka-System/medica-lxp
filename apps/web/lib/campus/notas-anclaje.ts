'use client';

/**
 * Anclaje de notas al TEXTO de la lección (§5A · subrayado tipo Kindle + "guardar
 * como nota"). El texto de teoría se renderiza con ContenidoRico (TipTap/ProseMirror
 * en modo lectura), que GESTIONA su propio DOM: inyectar <mark> lo pelearía. Por eso
 * el subrayado se pinta con la CSS Custom Highlight API (`CSS.highlights` + Range), que
 * NO muta el DOM. Si el navegador no la soporta, degrada (la nota se guarda igual y
 * aparece en el panel; solo no se pinta el resaltado).
 *
 * El ancla se guarda como offsets de carácter [inicio, fin) sobre el textContent del
 * bloque (`data-bloque-id`) + un snapshot del texto para re-localizar si el contenido
 * cambió (fallback por búsqueda).
 */

import type { AnclaTexto } from './notas-contrato';

/** Índice de carácter de un punto (nodo, offset) dentro del contenedor. */
function indiceDeCaracter(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let actual = walker.nextNode() as Text | null;
  while (actual) {
    if (actual === node) return total + offset;
    total += actual.length;
    actual = walker.nextNode() as Text | null;
  }
  // El punto cae en un nodo ELEMENTO (frontera entre nodos): mide el texto hasta ahí.
  const r = document.createRange();
  r.selectNodeContents(container);
  try {
    r.setEnd(node, offset);
  } catch {
    return total;
  }
  return r.toString().length;
}

/** Construye un Range a partir de offsets de carácter dentro del contenedor. */
function rangoDeIndices(container: HTMLElement, inicio: number, fin: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let start: [Text, number] | null = null;
  let end: [Text, number] | null = null;
  let n = walker.nextNode() as Text | null;
  while (n) {
    const len = n.length;
    if (!start && inicio <= total + len) start = [n, inicio - total];
    if (start && fin <= total + len) {
      end = [n, fin - total];
      break;
    }
    total += len;
    n = walker.nextNode() as Text | null;
  }
  if (!start || !end) return null;
  const r = document.createRange();
  try {
    r.setStart(start[0], start[1]);
    r.setEnd(end[0], end[1]);
  } catch {
    return null;
  }
  return r;
}

/**
 * Deriva el ancla de la selección actual del usuario dentro del contenedor de lectura.
 * Devuelve null si la selección está vacía o no cae dentro de un bloque anotable.
 */
export function anclaDeSeleccion(
  root: HTMLElement,
): { ancla: AnclaTexto; rect: DOMRect } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const rango = sel.getRangeAt(0);
  const texto = rango.toString().trim();
  if (!texto) return null;

  // El bloque anotable más cercano que contiene la selección.
  const nodo = rango.commonAncestorContainer;
  const el = (nodo.nodeType === Node.ELEMENT_NODE ? (nodo as Element) : nodo.parentElement) ?? null;
  const bloque = el?.closest<HTMLElement>('[data-bloque-id]');
  if (!bloque || !root.contains(bloque)) return null;

  const inicio = indiceDeCaracter(bloque, rango.startContainer, rango.startOffset);
  const fin = indiceDeCaracter(bloque, rango.endContainer, rango.endOffset);
  if (fin <= inicio) return null;

  const bloqueId = bloque.dataset.bloqueId ?? '';
  const rect = rango.getBoundingClientRect();
  return { ancla: { bloqueId, inicio, fin, texto: rango.toString() }, rect };
}

/** Registro de highlights de la CSS Custom Highlight API (tipado mínimo). */
type RegistroHighlights = { set(nombre: string, h: object): void; delete(nombre: string): void };
type CtorHighlight = new (...rangos: Range[]) => { add(r: Range): void };

function registroHighlights(): RegistroHighlights | null {
  if (typeof CSS === 'undefined') return null;
  const reg = (CSS as unknown as { highlights?: RegistroHighlights }).highlights;
  return reg ?? null;
}

/**
 * Pinta los subrayados guardados sobre el contenido, sin mutar el DOM (CSS Highlight
 * API). Re-localiza por texto si los offsets ya no calzan. No-op silencioso si el
 * navegador no soporta la API.
 */
export function pintarSubrayados(root: HTMLElement, subrayados: AnclaTexto[]): void {
  const reg = registroHighlights();
  const Ctor = (window as unknown as { Highlight?: CtorHighlight }).Highlight;
  if (!reg || !Ctor) return;

  const hl = new Ctor();
  let algo = false;
  for (const s of subrayados) {
    const bloque = root.querySelector<HTMLElement>(`[data-bloque-id="${CSS.escape(s.bloqueId)}"]`);
    if (!bloque) continue;
    let r = rangoDeIndices(bloque, s.inicio, s.fin);
    if ((!r || r.toString() !== s.texto) && s.texto) {
      // Fallback: el contenido cambió de posición → busca el texto exacto.
      const idx = (bloque.textContent ?? '').indexOf(s.texto);
      if (idx >= 0) r = rangoDeIndices(bloque, idx, idx + s.texto.length);
    }
    if (r) {
      hl.add(r);
      algo = true;
    }
  }
  if (algo) reg.set('nota-subrayado', hl as object);
  else reg.delete('nota-subrayado');
}
