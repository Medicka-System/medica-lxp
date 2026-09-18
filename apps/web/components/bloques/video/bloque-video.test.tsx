import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BloqueVideo } from './bloque-video';

// Smoke test del bloque VIDEO. Se ejercita la ruta `src=null` (media pendiente):
// valida que los imports de Vidstack + CSS resuelven y que el aviso de contrato
// (GET /media/url) se muestra sin montar el custom element del player en jsdom.
describe('BloqueVideo', () => {
  it('muestra el aviso de media pendiente cuando no hay fuente', () => {
    render(<BloqueVideo src={null} titulo="Ecografía FAST" contexto="POCUS · Módulo 2" />);
    expect(screen.getByText('Ecografía FAST')).toBeInTheDocument();
    expect(screen.getByText('POCUS · Módulo 2')).toBeInTheDocument();
    expect(screen.getByText(/pendiente de API/i)).toBeInTheDocument();
    expect(screen.getByText(/GET \/media\/url/i)).toBeInTheDocument();
  });
});
