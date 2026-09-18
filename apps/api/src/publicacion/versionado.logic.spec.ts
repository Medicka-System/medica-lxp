import {
  accionesPosibles,
  esVisibleParaAlumno,
  requiereNuevaVersion,
  requiereSnapshot,
  transicionar,
  TransicionInvalidaError,
  type AccionPublicacion,
  type EstadoPublicacion,
} from './versionado.logic';

describe('transicionar (máquina de estados de publicación)', () => {
  it('recorre el flujo feliz borrador → revisión → publicado', () => {
    expect(transicionar('borrador', 'enviar_a_revision')).toBe('revision');
    expect(transicionar('revision', 'publicar')).toBe('publicado');
  });

  it('permite devolver de revisión a borrador', () => {
    expect(transicionar('revision', 'devolver')).toBe('borrador');
  });

  it('reabre y archiva desde publicado', () => {
    expect(transicionar('publicado', 'reabrir')).toBe('borrador');
    expect(transicionar('publicado', 'archivar')).toBe('archivado');
  });

  it('reactiva desde archivado a borrador', () => {
    expect(transicionar('archivado', 'reactivar')).toBe('borrador');
  });

  it('rechaza transiciones inválidas con TransicionInvalidaError', () => {
    expect(() => transicionar('borrador', 'publicar')).toThrow(
      TransicionInvalidaError,
    );
    expect(() => transicionar('publicado', 'publicar')).toThrow(
      TransicionInvalidaError,
    );
    expect(() => transicionar('borrador', 'devolver')).toThrow(
      /No se puede 'devolver' desde el estado 'borrador'/,
    );
  });

  it('no permite saltarse la revisión (borrador no publica directo)', () => {
    expect(() => transicionar('borrador', 'publicar')).toThrow();
  });
});

describe('accionesPosibles', () => {
  it('lista solo las acciones válidas por estado', () => {
    expect(accionesPosibles('borrador')).toEqual(['enviar_a_revision']);
    expect(accionesPosibles('revision').sort()).toEqual(['devolver', 'publicar']);
    expect(accionesPosibles('publicado').sort()).toEqual(['archivar', 'reabrir']);
    expect(accionesPosibles('archivado')).toEqual(['reactivar']);
  });

  it('toda acción listada es realmente aplicable (coherencia interna)', () => {
    const estados: EstadoPublicacion[] = [
      'borrador',
      'revision',
      'publicado',
      'archivado',
    ];
    for (const estado of estados) {
      for (const accion of accionesPosibles(estado)) {
        expect(() => transicionar(estado, accion)).not.toThrow();
      }
    }
  });
});

describe('efectos de las transiciones', () => {
  it('solo publicar congela snapshot', () => {
    expect(requiereSnapshot('publicar')).toBe(true);
    const otras: AccionPublicacion[] = [
      'enviar_a_revision',
      'devolver',
      'reabrir',
      'archivar',
      'reactivar',
    ];
    for (const a of otras) expect(requiereSnapshot(a)).toBe(false);
  });

  it('reabrir y reactivar abren una nueva versión de trabajo', () => {
    expect(requiereNuevaVersion('reabrir')).toBe(true);
    expect(requiereNuevaVersion('reactivar')).toBe(true);
    expect(requiereNuevaVersion('publicar')).toBe(false);
    expect(requiereNuevaVersion('enviar_a_revision')).toBe(false);
  });
});

describe('esVisibleParaAlumno', () => {
  it('solo el estado publicado es visible para el alumno', () => {
    expect(esVisibleParaAlumno('publicado')).toBe(true);
    expect(esVisibleParaAlumno('borrador')).toBe(false);
    expect(esVisibleParaAlumno('revision')).toBe(false);
    expect(esVisibleParaAlumno('archivado')).toBe(false);
  });
});
