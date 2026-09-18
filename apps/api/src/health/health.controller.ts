import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@campus/shared';

const APP_VERSION = process.env.npm_package_version ?? '0.0.0';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return {
      status: 'ok',
      uptime: process.uptime(),
      version: APP_VERSION,
    };
  }
}
