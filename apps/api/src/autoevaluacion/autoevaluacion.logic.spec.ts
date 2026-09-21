import {
  calificarAutoevaluacion,
  scorePorDominioAutoeval,
  UMBRAL_APROBACION_AUTOEVAL,
  type ReactivoGradable,
} from '@campus/shared';

/** Banco de ejemplo con los 4 tipos (el mismo shape que siembra el seed demo). */
const REACTIVOS: ReactivoGradable[] = [
  { id: 'r1', tipo: 'opcion_multiple', correcta: 'b', puntaje: 1, dominio: 'interpretacion' },
  { id: 'r2', tipo: 'verdadero_falso', correcta: 'v', puntaje: 1, dominio: 'interpretacion' },
  { id: 'r3', tipo: 'multi', correcta: ['a', 'b'], puntaje: 2, dominio: 'adquisicion' },
  { id: 'r4', tipo: 'abierta', correcta: null, puntaje: 2, dominio: 'decision_medica' },
];

describe('calificarAutoevaluacion (autocalificación determinista · §7A)', () => {
  it('acierta opción múltiple y V/F, y compara multi como conjunto (sin importar orden)', () => {
    const res = calificarAutoevaluacion(REACTIVOS, {
      r1: 'b',
      r2: 'v',
      r3: ['b', 'a'], // orden invertido → sigue correcto
      r4: 'texto libre del alumno',
    });
    expect(res.resultados.find((x) => x.reactivoId === 'r1')?.veredicto).toBe('correcto');
    expect(res.resultados.find((x) => x.reactivoId === 'r2')?.veredicto).toBe('correcto');
    expect(res.resultados.find((x) => x.reactivoId === 'r3')?.veredicto).toBe('correcto');
    // La abierta NO se autocalifica: queda pendiente para el docente.
    expect(res.resultados.find((x) => x.reactivoId === 'r4')?.veredicto).toBe('pendiente');
    expect(res.objetivas).toBe(3);
    expect(res.correctas).toBe(3);
    expect(res.abiertas).toBe(1);
    expect(res.puntajeMax).toBe(4); // 1+1+2, la abierta no cuenta
    expect(res.puntajeObtenido).toBe(4);
    expect(res.escalado).toBe(1);
    expect(res.aprobado).toBe(true);
  });

  it('marca incorrecto el multi parcial (subconjunto no basta)', () => {
    const res = calificarAutoevaluacion(REACTIVOS, { r1: 'a', r2: 'f', r3: ['a'] });
    expect(res.resultados.find((x) => x.reactivoId === 'r1')?.veredicto).toBe('incorrecto');
    expect(res.resultados.find((x) => x.reactivoId === 'r3')?.veredicto).toBe('incorrecto');
    expect(res.correctas).toBe(0);
    expect(res.puntajeObtenido).toBe(0);
    expect(res.aprobado).toBe(false);
  });

  it('distingue "sin_responder" de "incorrecto" y lo cuenta como 0', () => {
    const res = calificarAutoevaluacion(REACTIVOS, { r1: 'b' }); // solo r1
    expect(res.resultados.find((x) => x.reactivoId === 'r1')?.veredicto).toBe('correcto');
    expect(res.resultados.find((x) => x.reactivoId === 'r2')?.veredicto).toBe('sin_responder');
    expect(res.resultados.find((x) => x.reactivoId === 'r3')?.veredicto).toBe('sin_responder');
    expect(res.puntajeObtenido).toBe(1);
    expect(res.escalado).toBeCloseTo(0.25);
  });

  it('respeta el umbral de aprobación', () => {
    // 2/4 = 0.5 < 0.6 → no aprueba
    const res = calificarAutoevaluacion(REACTIVOS, { r1: 'b', r2: 'v', r3: ['a'] });
    expect(res.escalado).toBeCloseTo(0.5);
    expect(res.aprobado).toBe(false);
    // con umbral más laxo, sí aprueba
    const laxo = calificarAutoevaluacion(REACTIVOS, { r1: 'b', r2: 'v', r3: ['a'] }, 0.4);
    expect(laxo.aprobado).toBe(true);
    expect(UMBRAL_APROBACION_AUTOEVAL).toBe(0.6);
  });

  it('escalado null y no aprobado si el examen es 100% abierto', () => {
    const soloAbiertas: ReactivoGradable[] = [
      { id: 'a1', tipo: 'abierta', correcta: null, puntaje: 2 },
    ];
    const res = calificarAutoevaluacion(soloAbiertas, { a1: 'mi respuesta' });
    expect(res.objetivas).toBe(0);
    expect(res.escalado).toBeNull();
    expect(res.aprobado).toBe(false);
    expect(res.abiertas).toBe(1);
  });

  it('normaliza mayúsculas/espacios de la clave elegida', () => {
    const res = calificarAutoevaluacion([REACTIVOS[0]!], { r1: '  B ' });
    expect(res.resultados[0]?.veredicto).toBe('correcto');
  });
});

describe('scorePorDominioAutoeval (señal de competencia al LRS · §7)', () => {
  it('agrega el puntaje objetivo por dominio e ignora abiertas/sin-dominio', () => {
    const res = calificarAutoevaluacion(REACTIVOS, { r1: 'b', r2: 'f', r3: ['a', 'b'] });
    const dominios = scorePorDominioAutoeval(REACTIVOS, res.resultados);
    const interp = dominios.find((d) => d.dominio === 'interpretacion');
    const adq = dominios.find((d) => d.dominio === 'adquisicion');
    // interpretacion: r1 correcto (1/1) + r2 incorrecto (0/1) = 1/2
    expect(interp).toEqual({ dominio: 'interpretacion', obtenido: 1, max: 2, escalado: 0.5 });
    // adquisicion: r3 correcto (2/2)
    expect(adq).toEqual({ dominio: 'adquisicion', obtenido: 2, max: 2, escalado: 1 });
    // decision_medica solo tiene la abierta → no aparece
    expect(dominios.find((d) => d.dominio === 'decision_medica')).toBeUndefined();
  });
});
