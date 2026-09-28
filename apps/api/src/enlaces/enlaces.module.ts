import { Module } from '@nestjs/common';
import { EnlacesController } from './enlaces.controller';
import { EnlacesService } from './enlaces.service';

/** Unfurl de enlaces del Ateneo con guard SSRF (§1). Sin dependencias (fetch nativo). */
@Module({
  controllers: [EnlacesController],
  providers: [EnlacesService],
})
export class EnlacesModule {}
