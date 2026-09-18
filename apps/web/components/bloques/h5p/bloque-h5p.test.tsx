import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BloqueH5P } from './bloque-h5p';

// El lienzo H5P se carga con ssr:false (web components browser-only) y no monta en jsdom.
// Se prueba la ruta "servidor pendiente" (sin servidorBase): muestra el contrato de API.
describe('BloqueH5P', () => {
  it('muestra "servidor H5P pendiente" cuando no hay servidorBase', () => {
    render(<BloqueH5P modo="editar" titulo="Quiz de anatomía" />);
    expect(screen.getByText('Quiz de anatomía')).toBeInTheDocument();
    expect(screen.getByText(/pendiente de API/i)).toBeInTheDocument();
    expect(screen.getByText(/\/h5p\/editor/i)).toBeInTheDocument();
  });
});
