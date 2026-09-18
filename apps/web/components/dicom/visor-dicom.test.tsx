import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { crearMotorFake, serieMock } from './mock';
import type { EstudioDicom } from './types';
import { VisorDicom } from './visor-dicom';

function estudioFijo(): EstudioDicom {
  return {
    id: 'estudio-fijo',
    series: [
      serieMock('Estática — Long', 1, { id: 's-estatica' }),
      serieMock('Cine — 4C', 12, { id: 's-cine', fps: 12 }),
    ],
  };
}

describe('<VisorDicom />', () => {
  it('muestra un placeholder si el estudio no tiene series', () => {
    render(<VisorDicom estudio={{ id: 'x', series: [] }} crearMotor={() => crearMotorFake()} />);
    expect(screen.getByText('Sin imágenes DICOM')).toBeInTheDocument();
  });

  it('renderiza toolbar, stage y selector de series', async () => {
    render(<VisorDicom estudio={estudioFijo()} crearMotor={() => crearMotorFake()} />);
    expect(screen.getByRole('toolbar', { name: /herramientas/i })).toBeInTheDocument();
    expect(screen.getByTestId('visor-stage')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: /series/i })).toBeInTheDocument();
    // Dos series → dos tabs.
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    // El overlay de carga desaparece cuando el motor termina.
    await waitFor(() =>
      expect(screen.queryByText(/cargando estudio/i)).not.toBeInTheDocument(),
    );
  });

  it('seleccionar una herramienta la marca como activa', async () => {
    const user = userEvent.setup();
    render(<VisorDicom estudio={estudioFijo()} crearMotor={() => crearMotorFake()} />);
    const longitud = screen.getByRole('button', { name: 'Longitud' });
    expect(longitud).toHaveAttribute('aria-pressed', 'false');
    await user.click(longitud);
    expect(longitud).toHaveAttribute('aria-pressed', 'true');
  });

  it('no muestra controles de cine en una serie estática', () => {
    render(
      <VisorDicom
        estudio={estudioFijo()}
        serieInicial="s-estatica"
        crearMotor={() => crearMotorFake()}
      />,
    );
    expect(screen.queryByRole('button', { name: /reproducir/i })).not.toBeInTheDocument();
  });

  it('muestra controles de cine en una serie multi-frame', async () => {
    render(
      <VisorDicom
        estudio={estudioFijo()}
        serieInicial="s-cine"
        crearMotor={() => crearMotorFake()}
      />,
    );
    expect(screen.getByRole('button', { name: /reproducir/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /posición del cine/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/cargando estudio/i)).not.toBeInTheDocument(),
    );
  });

  it('en solo-lectura oculta la barra de herramientas', () => {
    render(
      <VisorDicom estudio={estudioFijo()} soloLectura crearMotor={() => crearMotorFake()} />,
    );
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('cambiar de serie por el selector actualiza la selección', async () => {
    const user = userEvent.setup();
    render(<VisorDicom estudio={estudioFijo()} crearMotor={() => crearMotorFake()} />);
    const tablist = screen.getByRole('tablist', { name: /series/i });
    const tabCine = within(tablist).getByRole('tab', { name: /cine/i });
    await user.click(tabCine);
    await waitFor(() => expect(tabCine).toHaveAttribute('aria-selected', 'true'));
    // Al pasar a una serie multi-frame aparecen los controles de cine.
    expect(screen.getByRole('button', { name: /reproducir/i })).toBeInTheDocument();
  });
});
