import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { healthStatusSchema } from '@campus/shared';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('devuelve un estado que cumple el contrato de /health', () => {
    const result = controller.check();
    expect(() => healthStatusSchema.parse(result)).not.toThrow();
    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });
});
