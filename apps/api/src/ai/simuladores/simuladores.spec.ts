import { SimuladorService } from './simulador.service';
import { mapearFeedback, titularDe, lecturaDe } from './simulador.mapper';
import { comoLista } from './simulador.repositorio';
import type { CasoVerdad } from './simulador.tipos';
import type { PropuestaEco } from '../pipeline/tipos';
import type { EvaluacionPipeline } from '../pipeline/evaluacion.pipeline';
import type { DbService } from '../../db/db.service';
import type { XapiService } from '../../xapi/xapi.service';
import type { ColasProducer } from '../../colas/colas-producer';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const CASO: CasoVerdad = {
  id: 'caso-1',
  titulo: 'FAST positivo — Morrison',
  organo: 'Abdomen',
  dominioIaim: 'interpretacion',
  hallazgosClave: ['Líquido anecoico en receso hepatorrenal', 'Ausencia de peristalsis'],
  diagnosticoCorrecto: 'Hemoperitoneo (FAST positivo)',
  puntosAprendizaje: ['Barrer todo el receso'],
  erroresComunes: ['Confundir grasa perirrenal con líquido'],
};

function propuesta(over: Partial<PropuestaEco> = {}): PropuestaEco {
  return {
    objetoTipo: 'caso',
    objetoId: CASO.id,
    notaSugerida: 82,
    feedbackBorrador: 'Buena lectura; te faltó graduar el hallazgo.',
    confianza: 0.9,
    clasificacion: 'listo',
    detalle: {
      pasos: ['recopilar', 'rag', 'sonnet:mock'],
      proveedor: 'mock',
      modelo: 'claude-sonnet (mock)',
      autoCalificado: false,
      normalizadoConHaiku: false,
      criterios: [
        { criterio: 'Identificación de hallazgos', puntaje: 90, comentario: 'Vio el líquido.' },
        { criterio: 'Impresión diagnóstica', puntaje: 55, comentario: 'Parcial.' },
        { criterio: 'Técnica y precisión', puntaje: 20, comentario: 'Sin medir.' },
      ],
      omisiones: ['No graduó el hallazgo'],
    },
    ...over,
  };
}

// ── Mapper (puro) ────────────────────────────────────────────────────────────
describe('mapearFeedback (§7A · simuladores)', () => {
  it('separa criterios en aciertos / precisiones / omisiones por puntaje', () => {
    const f = mapearFeedback(propuesta(), CASO, 'interpretacion');
    expect(f.aciertos.map((a) => a.titulo)).toEqual(['Identificación de hallazgos']);
    expect(f.precisiones.map((p) => p.titulo)).toEqual(['Impresión diagnóstica']);
    // Omisiones: la reportada por Eco + el criterio flojo (< 40).
    expect(f.omisiones.map((o) => o.titulo)).toEqual(
      expect.arrayContaining(['No graduó el hallazgo', 'Técnica y precisión']),
    );
  });

  it('revela la verdad del caso (diagnóstico + lectura de referencia)', () => {
    const f = mapearFeedback(propuesta(), CASO, 'interpretacion');
    expect(f.diagnostico).toBe('Hemoperitoneo (FAST positivo)');
    expect(f.lecturaDocente).toContain('receso hepatorrenal');
    expect(f.puntosAprendizaje).toEqual(['Barrer todo el receso']);
  });

  it('detecta que Eco corrió en MOCK', () => {
    expect(mapearFeedback(propuesta(), CASO, 'reporte').eco.mock).toBe(true);
    const real = propuesta({
      detalle: { ...propuesta().detalle, proveedor: 'anthropic', modelo: 'claude-sonnet-4-6' },
      feedbackBorrador: 'Feedback real.',
    });
    expect(mapearFeedback(real, CASO, 'reporte').eco.mock).toBe(false);
  });

  it('sin nota (juicio no parseable) → puntaje null, titular prudente', () => {
    const f = mapearFeedback(propuesta({ notaSugerida: null }), CASO, 'interpretacion');
    expect(f.puntaje).toBeNull();
    expect(f.titular.toLowerCase()).toContain('docente');
  });

  it('titularDe escala con el puntaje', () => {
    expect(titularDe(90)).toMatch(/sólida/i);
    expect(titularDe(75)).toMatch(/buena/i);
    expect(titularDe(55)).toMatch(/encaminado/i);
    expect(titularDe(30)).toMatch(/repasar/i);
    expect(titularDe(null)).toMatch(/docente/i);
  });

  it('lecturaDe cae al diagnóstico si no hay hallazgos curados', () => {
    expect(lecturaDe({ ...CASO, hallazgosClave: [] })).toBe('Hemoperitoneo (FAST positivo)');
  });
});

describe('comoLista (normalización jsonb)', () => {
  it('acepta arrays, strings y descarta vacíos', () => {
    expect(comoLista(['a', 'b'])).toEqual(['a', 'b']);
    expect(comoLista('sola')).toEqual(['sola']);
    expect(comoLista(['a', '', '  '])).toEqual(['a']);
    expect(comoLista(null)).toEqual([]);
    expect(comoLista(42)).toEqual([]);
  });
});

// ── Service (con dobles) ─────────────────────────────────────────────────────
type Fakes = {
  service: SimuladorService;
  evaluar: jest.Mock;
  encolarXapi: jest.Mock;
  encolarCola: jest.Mock;
  sqlCalls: string[];
};

function crearService(casoExiste = true): Fakes {
  const evaluar = jest.fn(async () => propuesta());
  const pipeline = { evaluar } as unknown as EvaluacionPipeline;

  const sqlCalls: string[] = [];
  // `sql` es un tag template: registra la 1ª línea de la query y responde según el destino.
  const sql = ((strings: TemplateStringsArray) => {
    const q = strings.join(' ');
    sqlCalls.push(q);
    if (q.includes('from lxp.casos_biblioteca')) {
      return Promise.resolve(
        casoExiste
          ? [
              {
                id: CASO.id,
                titulo: CASO.titulo,
                organo: CASO.organo,
                dominio_iaim: CASO.dominioIaim,
                hallazgos_clave: CASO.hallazgosClave,
                diagnostico_correcto: CASO.diagnosticoCorrecto,
                puntos_aprendizaje: CASO.puntosAprendizaje,
                errores_comunes: CASO.erroresComunes,
              },
            ]
          : [],
      );
    }
    if (q.includes('insert into lxp.sesiones_simulador')) {
      return Promise.resolve([{ id: 'sesion-9' }]);
    }
    return Promise.resolve([]);
  }) as unknown as {
    (strings: TemplateStringsArray, ...v: unknown[]): Promise<unknown>;
    json: (v: unknown) => unknown;
  };
  // `sql.json(...)` y `sql\`...\`` (fragmentos) que usa el repositorio.
  (sql as unknown as { json: (v: unknown) => unknown }).json = (v: unknown) => v;

  const db = { sql } as unknown as DbService;
  const encolarXapi = jest.fn(async () => 'xapi-job');
  const xapi = { encolar: encolarXapi } as unknown as XapiService;
  const encolarCola = jest.fn(async () => 'repaso-job');
  const colas = { encolar: encolarCola } as unknown as ColasProducer;

  return {
    service: new SimuladorService(db, pipeline, xapi, colas),
    evaluar,
    encolarXapi,
    encolarCola,
    sqlCalls,
  };
}

describe('SimuladorService.evaluarInterpretacion', () => {
  it('evalúa contra la verdad, registra la sesión, emite xAPI y agenda repaso', async () => {
    const f = crearService();
    const r = await f.service.evaluarInterpretacion('alumno-1', CASO.id, {
      hallazgos: 'Líquido en Morrison',
      impresion: 'FAST positivo',
      seguridad: 'Algo',
    });

    expect(r.sesionId).toBe('sesion-9');
    expect(r.feedback.diagnostico).toBe('Hemoperitoneo (FAST positivo)');
    expect(r.dominioIaim).toBe('interpretacion');
    expect(r.repasoJobId).toBe('repaso-job');

    // El pipeline recibió verdad + rúbrica (tools-first ya resuelto).
    const item = f.evaluar.mock.calls[0][0];
    expect(item.verdad.diagnostico_correcto).toBe('Hemoperitoneo (FAST positivo)');
    expect(item.rubrica.length).toBeGreaterThan(0);

    // xAPI: caso + dominio (dos statements de `experimentó`).
    expect(f.encolarXapi).toHaveBeenCalledTimes(2);
    // Repaso agendado en la cola de dominio.
    expect(f.encolarCola).toHaveBeenCalledWith(
      'programar-repaso',
      expect.objectContaining({ alumnoId: 'alumno-1', dominio_iaim: 'interpretacion' }),
    );
    // Registró la sesión.
    expect(f.sqlCalls.some((q) => q.includes('insert into lxp.sesiones_simulador'))).toBe(true);
  });

  it('caso inexistente/no publicado → NotFound', async () => {
    const f = crearService(false);
    await expect(
      f.service.evaluarInterpretacion('alumno-1', 'nope', { hallazgos: 'x', impresion: 'y' }),
    ).rejects.toThrow(/no existe|publicado/i);
  });
});

describe('SimuladorService.evaluarReporte', () => {
  it('arma el texto del reporte y evalúa; sin dominio no agenda repaso', async () => {
    const f = crearService();
    // Fuerza un caso sin dominio para probar la rama de repaso nulo.
    f.evaluar.mockResolvedValueOnce(propuesta());
    const originalService = f.service;

    const r = await originalService.evaluarReporte('alumno-2', CASO.id, {
      secciones: [
        { titulo: 'Hígado y vía biliar', texto: 'Vesícula con lito de 12 mm.' },
        { titulo: 'Impresión', texto: 'Colelitiasis.' },
      ],
    });

    expect(r.feedback.tipo).toBe('reporte');
    const item = f.evaluar.mock.calls[0][0];
    expect(item.respuesta.texto).toContain('Hígado y vía biliar');
    expect(item.respuesta.texto).toContain('Colelitiasis');
  });
});
