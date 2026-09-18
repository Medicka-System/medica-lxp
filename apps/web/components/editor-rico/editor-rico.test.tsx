import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { construirExtensiones } from './extensiones';
import { EditorRico } from './editor-rico';
import { ContenidoRico } from './contenido-rico';

// TipTap/ProseMirror en jsdom: algunas extensiones observan el layout. Polyfills
// mínimos aislados en este archivo (no tocamos el setup compartido).
beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    // @ts-expect-error polyfill de test
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('construirExtensiones', () => {
  it('arma el set compartido (starter + capacidades ricas)', () => {
    const nombres = construirExtensiones().map((e) => e.name);
    expect(nombres).toContain('starterKit');
    expect(nombres).toContain('image');
    expect(nombres).toContain('characterCount');
  });
});

describe('EditorRico', () => {
  it('renderiza el HTML en modo visor (read-only), sin barra', async () => {
    render(<ContenidoRico html="<p>Hallazgo <strong>renal</strong></p>" />);
    expect(await screen.findByText('renal')).toBeInTheDocument();
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('muestra la barra de formato y el placeholder cuando está vacío', async () => {
    render(<EditorRico placeholder="Escribe la teoría…" />);
    expect(await screen.findByRole('toolbar', { name: /formato/i })).toBeInTheDocument();
    expect(screen.getByText('Escribe la teoría…')).toBeInTheDocument();
    // El contador arranca en cero palabras.
    expect(screen.getByText(/0 palabras/)).toBeInTheDocument();
  });
});
