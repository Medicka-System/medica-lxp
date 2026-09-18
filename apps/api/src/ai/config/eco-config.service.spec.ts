import { ServiceUnavailableException } from '@nestjs/common';
import { EcoConfigService } from './eco-config.service';
import { DbService } from '../../db/db.service';
import * as repo from './eco-config.repositorio';
import type { EcoConfig } from './eco-config.tipos';

// La config es CONFIGURABLE EN BD: aquí mockeamos su lectura y probamos la carga,
// el cache y el render del template. Nada hardcodeado en el código.
jest.mock('./eco-config.repositorio', () => ({
  cargarConfigActiva: jest.fn(),
}));
const cargar = repo.cargarConfigActiva as jest.Mock;

const CONFIG: EcoConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  nombre: 'evaluacion-default',
  activo: true,
  systemPrompt: 'Eres Eco.',
  userPromptTemplate: 'Verdad: {{verdad}} · Respuesta: {{respuesta}}',
  temperatura: 0.2,
  maxTokens: 1024,
  umbralConfianza: 0.8,
  modelos: {
    clasificador: { proveedor: 'anthropic', modelo: 'claude-haiku-4-5' },
    juicio: { proveedor: 'anthropic', modelo: 'claude-sonnet-4-6' },
    excepcion: { proveedor: 'anthropic', modelo: 'claude-opus-4-8' },
  },
  version: 1,
};

function crear(): EcoConfigService {
  const db = { sql: {} } as unknown as DbService;
  return new EcoConfigService(db);
}

describe('EcoConfigService (config editable en BD · §7A)', () => {
  afterEach(() => jest.clearAllMocks());

  it('lanza si no hay config activa (no adivina defaults)', async () => {
    cargar.mockResolvedValue(null);
    await expect(crear().activa()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('carga la config activa y la cachea (segunda lectura no golpea la BD)', async () => {
    cargar.mockResolvedValue(CONFIG);
    const svc = crear();
    expect((await svc.activa()).nombre).toBe('evaluacion-default');
    await svc.activa();
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('invalidar() fuerza recargar en la próxima lectura', async () => {
    cargar.mockResolvedValue(CONFIG);
    const svc = crear();
    await svc.activa();
    svc.invalidar();
    await svc.activa();
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('renderiza el user prompt de la config con las variables del caso', async () => {
    cargar.mockResolvedValue(CONFIG);
    const svc = crear();
    const r = await svc.renderizarUserPrompt({ verdad: 'colecistitis', respuesta: 'pared engrosada' });
    expect(r.texto).toBe('Verdad: colecistitis · Respuesta: pared engrosada');
    expect(r.faltantes).toEqual([]);
  });
});
