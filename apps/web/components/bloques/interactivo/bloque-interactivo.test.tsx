import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BloqueInteractivo } from './bloque-interactivo';
import type { Hotspot } from '@/components/bloques/contratos';

// El canvas (react-konva) se carga con ssr:false y no monta en jsdom; se prueba la
// capa DOM: aviso de media pendiente y la lista/edición de hotspots (a11y).
describe('BloqueInteractivo', () => {
  it('muestra el aviso de media pendiente sin imagen base', () => {
    render(<BloqueInteractivo src={null} titulo="Anatomía hepática" />);
    expect(screen.getByText('Anatomía hepática')).toBeInTheDocument();
    expect(screen.getByText(/GET \/media\/url/i)).toBeInTheDocument();
  });

  it('lista los hotspots como campos editables en modo editar', () => {
    const hotspots: Hotspot[] = [
      { id: 'a', x: 0.3, y: 0.4, etiqueta: 'Vena porta' },
      { id: 'b', x: 0.6, y: 0.5, etiqueta: 'Vesícula' },
    ];
    render(
      <BloqueInteractivo src="/img/higado.png" modo="editar" hotspots={hotspots} onCambio={() => {}} />,
    );
    expect(screen.getByDisplayValue('Vena porta')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Vesícula')).toBeInTheDocument();
    // La instrucción de edición confirma el modo editar activo.
    expect(screen.getByText(/Haz clic sobre la imagen/i)).toBeInTheDocument();
  });
});
