import { Test } from '@nestjs/testing';
import { QUEUE_CALCULO_COMPETENCIA, QUEUE_DETECCION_DECAIMIENTO } from '@campus/shared';
import { CompetenciaService } from './competencia.service';
import { ColasProducer } from '../colas/colas-producer';

describe('CompetenciaService (encola comandos de dominio)', () => {
  const colas = { encolar: jest.fn() };

  async function crear(): Promise<CompetenciaService> {
    colas.encolar.mockResolvedValue('job-1');
    const moduleRef = await Test.createTestingModule({
      providers: [CompetenciaService, { provide: ColasProducer, useValue: colas }],
    }).compile();
    return moduleRef.get(CompetenciaService);
  }

  afterEach(() => jest.clearAllMocks());

  it('recalcular encola en calculo-competencia', async () => {
    const svc = await crear();
    const jobId = await svc.recalcular('alumno-1');
    expect(jobId).toBe('job-1');
    expect(colas.encolar).toHaveBeenCalledWith(QUEUE_CALCULO_COMPETENCIA, { alumnoId: 'alumno-1' });
  });

  it('detectarDecaimiento sin alumno encola global', async () => {
    const svc = await crear();
    await svc.detectarDecaimiento();
    expect(colas.encolar).toHaveBeenCalledWith(QUEUE_DETECCION_DECAIMIENTO, {});
  });
});
