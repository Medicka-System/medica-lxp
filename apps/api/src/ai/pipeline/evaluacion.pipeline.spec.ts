import {
  EvaluacionPipeline,
  parsearJuicio,
  requiereNormalizacion,
  UMBRAL_TEXTO_LIBRE,
} from './evaluacion.pipeline';
import type { EcoConfigService } from '../config/eco-config.service';
import type { ProveedorFactory } from '../proveedores/proveedor.factory';
import type { LLMProvider, SolicitudLLM } from '../proveedores/proveedor.interface';
import type { EcoConfig } from '../config/eco-config.tipos';
import type { ItemEvaluable } from './tipos';

// ── Config y factory de mentira, controlables ────────────────────────────────
const CONFIG: EcoConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  nombre: 'test',
  activo: true,
  systemPrompt: 'sys',
  userPromptTemplate: '{{verdad}}|{{rubrica}}|{{respuesta}}',
  temperatura: 0.2,
  maxTokens: 512,
  umbralConfianza: 0.8,
  modelos: {
    clasificador: { proveedor: 'mock', modelo: 'haiku' },
    juicio: { proveedor: 'mock', modelo: 'sonnet' },
    excepcion: { proveedor: 'mock', modelo: 'opus' },
  },
  version: 1,
};

function fakeConfigService(): jest.Mocked<Pick<EcoConfigService, 'activa' | 'renderizarUserPrompt'>> {
  return {
    activa: jest.fn().mockResolvedValue(CONFIG),
    renderizarUserPrompt: jest.fn(async (vars: Record<string, unknown>) => ({
      texto: JSON.stringify(vars),
      faltantes: [],
    })),
  } as never;
}

/** Provider que responde distinto para Haiku (normaliza) vs Sonnet (juzga). */
function fakeProvider(juicioTexto: string): LLMProvider {
  return {
    nombre: 'fake',
    generar: jest.fn(async (s: SolicitudLLM) => ({
      texto: s.system.includes('Normaliza') ? 'RESP NORMALIZADA' : juicioTexto,
      proveedor: 'fake',
      modelo: s.modelo,
    })),
  };
}

function crear(provider: LLMProvider): {
  pipeline: EvaluacionPipeline;
  config: ReturnType<typeof fakeConfigService>;
  obtener: jest.Mock;
} {
  const config = fakeConfigService();
  const obtener = jest.fn(() => provider);
  const factory = { obtener } as unknown as ProveedorFactory;
  return {
    pipeline: new EvaluacionPipeline(config as never, factory),
    config,
    obtener,
  };
}

const juicioListo = JSON.stringify({
  nota_sugerida: 88,
  confianza: 0.92,
  feedback_borrador: 'Bien.',
  criterios: [],
  omisiones: [],
});
const juicioDudoso = JSON.stringify({
  nota_sugerida: 60,
  confianza: 0.4,
  feedback_borrador: 'Dudoso.',
});

describe('EvaluacionPipeline (tools-first · §7A)', () => {
  it('AUTO-CALIFICABLE: resuelve con el tool, SIN llamar a ningún LLM', async () => {
    const provider = fakeProvider(juicioListo);
    const { pipeline, obtener } = crear(provider);
    const item: ItemEvaluable = {
      tipo: 'entrega',
      id: 'e1',
      actividadTipo: 'autoevaluacion',
      respuesta: { respuestas: { q1: 'a' } },
      claveObjetiva: { correctas: { q1: 'a' } },
    };

    const p = await pipeline.evaluar(item);

    expect(obtener).not.toHaveBeenCalled(); // ningún proveedor pedido
    expect(provider.generar).not.toHaveBeenCalled();
    expect(p.detalle.autoCalificado).toBe(true);
    expect(p.confianza).toBe(1);
    expect(p.clasificacion).toBe('listo');
    expect(p.notaSugerida).toBe(100);
  });

  it('TEXTO LIBRE: corre Haiku (normaliza) y luego Sonnet (juzga)', async () => {
    const provider = fakeProvider(juicioListo);
    const { pipeline } = crear(provider);
    const item: ItemEvaluable = {
      tipo: 'caso',
      id: 'c1',
      respuesta: { hallazgos: 'x'.repeat(UMBRAL_TEXTO_LIBRE + 1) },
      verdad: { diagnostico: 'colecistitis' },
      rubrica: [{ criterio: 'dx' }],
    };

    const p = await pipeline.evaluar(item);

    expect(provider.generar).toHaveBeenCalledTimes(2); // Haiku + Sonnet
    expect(p.detalle.normalizadoConHaiku).toBe(true);
    expect(p.detalle.pasos).toEqual(
      expect.arrayContaining(['recopilar', 'rag', expect.stringContaining('haiku'), expect.stringContaining('sonnet')]),
    );
  });

  it('RESPUESTA ESTRUCTURADA (corta): SALTA Haiku, solo Sonnet', async () => {
    const provider = fakeProvider(juicioListo);
    const { pipeline } = crear(provider);
    const item: ItemEvaluable = {
      tipo: 'caso',
      id: 'c2',
      respuesta: { hallazgos: 'corto', diagnostico_presuntivo: 'x' },
      verdad: { diagnostico: 'y' },
    };

    const p = await pipeline.evaluar(item);

    expect(provider.generar).toHaveBeenCalledTimes(1); // solo Sonnet
    expect(p.detalle.normalizadoConHaiku).toBe(false);
  });

  it('clasifica por UMBRAL de confianza (listo ≥ umbral; si no, requiere criterio)', async () => {
    const listo = crear(fakeProvider(juicioListo));
    const dudoso = crear(fakeProvider(juicioDudoso));
    const item: ItemEvaluable = { tipo: 'entrega', id: 'e', respuesta: { hallazgos: 'z' } };

    expect((await listo.pipeline.evaluar(item)).clasificacion).toBe('listo');
    expect((await dudoso.pipeline.evaluar(item)).clasificacion).toBe('requiere_criterio');
  });

  it('juicio NO parseable → requiere_criterio, nota null (nunca inventa nota)', async () => {
    const { pipeline } = crear(fakeProvider('esto no es json'));
    const item: ItemEvaluable = { tipo: 'entrega', id: 'e', respuesta: { hallazgos: 'z' } };

    const p = await pipeline.evaluar(item);
    expect(p.clasificacion).toBe('requiere_criterio');
    expect(p.notaSugerida).toBeNull();
    expect(p.detalle.juicioCrudo).toContain('esto no es json');
  });

  it('el modelo de cada paso sale de la CONFIG (no hardcodeado)', async () => {
    const provider = fakeProvider(juicioListo);
    const { pipeline } = crear(provider);
    const item: ItemEvaluable = {
      tipo: 'caso',
      id: 'c3',
      respuesta: { hallazgos: 'x'.repeat(UMBRAL_TEXTO_LIBRE + 1) },
    };
    await pipeline.evaluar(item);

    const modelos = (provider.generar as jest.Mock).mock.calls.map(([s]) => s.modelo);
    expect(modelos).toContain('haiku'); // clasificador de la config
    expect(modelos).toContain('sonnet'); // juicio de la config
  });
});

describe('helpers puros del pipeline', () => {
  it('requiereNormalizacion se dispara solo con texto libre largo', () => {
    expect(requiereNormalizacion({ tipo: 'entrega', id: '1', respuesta: { t: 'corto' } })).toBe(false);
    expect(
      requiereNormalizacion({ tipo: 'entrega', id: '1', respuesta: { t: 'a'.repeat(UMBRAL_TEXTO_LIBRE + 1) } }),
    ).toBe(true);
  });

  it('parsearJuicio tolera ```json fences y valida la forma', () => {
    const ok = parsearJuicio('```json\n{"nota_sugerida":80,"confianza":0.9,"feedback_borrador":"ok"}\n```');
    expect(ok?.nota_sugerida).toBe(80);
    expect(parsearJuicio('sin json')).toBeNull();
    // Fuera de rango → rechazado por zod.
    expect(parsearJuicio('{"nota_sugerida":80,"confianza":9,"feedback_borrador":"x"}')).toBeNull();
  });
});
