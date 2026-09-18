import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { crearMotorFake, estudioMock } from './mock';
import { useVisorDicom } from './use-visor-dicom';

/**
 * Adjunta un contenedor para disparar el montaje del motor. El montaje es
 * fire-and-forget (async); el `waitFor` posterior de cada test flushea la
 * cadena de estados. Envolvemos la llamada en `act` para el commit síncrono.
 */
function montar(result: { current: { contenedorRef: (el: HTMLDivElement | null) => void } }) {
  const el = document.createElement('div');
  act(() => {
    result.current.contenedorRef(el);
  });
  return el;
}

describe('useVisorDicom', () => {
  it('monta el motor y carga la primera serie', async () => {
    const motor = crearMotorFake();
    const estudio = estudioMock();
    const { result } = renderHook(() =>
      useVisorDicom({ estudio, crearMotor: () => motor }),
    );
    montar(result);
    await waitFor(() => expect(result.current.listo).toBe(true));

    expect(motor.registro.montado).toBe(true);
    expect(motor.registro.seriesCargadas).toHaveLength(1);
    expect(motor.registro.seriesCargadas[0][0]).toMatch(/^mock:/);
    // La herramienta inicial se activó al montar.
    expect(motor.registro.herramientas).toContain('ventana');
  });

  it('cambiar de serie la carga en el motor', async () => {
    const motor = crearMotorFake();
    const estudio = estudioMock();
    const { result } = renderHook(() =>
      useVisorDicom({ estudio, crearMotor: () => motor }),
    );
    montar(result);
    await waitFor(() => expect(result.current.listo).toBe(true));

    const segunda = estudio.series[1].id;
    await act(async () => {
      result.current.seleccionarSerie(segunda);
    });
    await waitFor(() => expect(motor.registro.seriesCargadas).toHaveLength(2));
    expect(result.current.serieActivaId).toBe(segunda);
    expect(result.current.esCine).toBe(true); // la 2ª serie es multi-frame
  });

  it('activar una herramienta la propaga al motor', async () => {
    const motor = crearMotorFake();
    const { result } = renderHook(() =>
      useVisorDicom({ estudio: estudioMock(), crearMotor: () => motor }),
    );
    montar(result);
    await waitFor(() => expect(result.current.listo).toBe(true));

    act(() => result.current.activarHerramienta('longitud'));
    expect(result.current.herramienta).toBe('longitud');
    expect(motor.registro.herramientas).toContain('longitud');
  });

  it('limpiar y reencuadrar delegan en el motor', async () => {
    const motor = crearMotorFake();
    const { result } = renderHook(() =>
      useVisorDicom({ estudio: estudioMock(), crearMotor: () => motor }),
    );
    montar(result);
    await waitFor(() => expect(result.current.listo).toBe(true));

    act(() => result.current.limpiarAnotaciones());
    act(() => result.current.reencuadrar());
    expect(motor.registro.anotacionesLimpiadas).toBe(1);
    expect(motor.registro.reencuadres).toBe(1);
  });

  it('expone error si el motor falla al montar', async () => {
    const { result } = renderHook(() =>
      useVisorDicom({
        estudio: estudioMock(),
        crearMotor: () => crearMotorFake({ fallaMontaje: true }),
      }),
    );
    montar(result);
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.listo).toBe(false);
  });

  it('estudio vacío no rompe (serieActiva undefined)', () => {
    const motor = crearMotorFake();
    const { result } = renderHook(() =>
      useVisorDicom({ estudio: { id: 'vacio', series: [] }, crearMotor: () => motor }),
    );
    expect(result.current.serieActiva).toBeUndefined();
    expect(result.current.esCine).toBe(false);
  });
});
