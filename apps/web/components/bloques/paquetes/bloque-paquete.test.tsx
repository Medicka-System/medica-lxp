import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BloquePaquete } from './bloque-paquete';

// Cubre las rutas DOM del bloque (la descompresión/validación es del api):
// zona de subida con contrato, reproducción por iframe y estado "sin lanzador".
describe('BloquePaquete', () => {
  it('editar sin onSubir: ofrece elegir .zip y avisa que la subida está pendiente de API', () => {
    render(<BloquePaquete modo="editar" titulo="Curso Rise POCUS" />);
    expect(screen.getByText(/Elige el paquete \.zip/i)).toBeInTheDocument();
    expect(screen.getByText(/POST \/paquetes/i)).toBeInTheDocument();
  });

  it('ver sin lanzador: avisa que el player está pendiente de API', () => {
    render(<BloquePaquete modo="ver" paquete={{ estado: 'sin_subir' }} />);
    expect(screen.getByText(/\/scorm\/play/i)).toBeInTheDocument();
  });

  it('listo: embebe el lanzador en un iframe', () => {
    render(
      <BloquePaquete
        modo="ver"
        titulo="Módulo interactivo"
        paquete={{ estado: 'listo', tipo: 'xapi', lanzadorUrl: 'https://cdn/paquete/index.html' }}
      />,
    );
    const iframe = screen.getByTitle('Módulo interactivo');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toContain('index.html');
    expect(screen.getByText(/reporta la actividad al LRS/i)).toBeInTheDocument();
  });
});
