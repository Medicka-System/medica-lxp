import { Module } from '@nestjs/common';
import { XapiModule } from '../xapi/xapi.module';
import { AteneoController } from './ateneo.controller';
import { AteneoService } from './ateneo.service';

/**
 * Dominio del Ateneo (§5B · Sprint 5). Reusa la capa xAPI (Sprint 2, vía
 * `XapiService`) para el sello de autoridad y la publicación. Usa DbModule (global).
 */
@Module({
  imports: [XapiModule],
  controllers: [AteneoController],
  providers: [AteneoService],
})
export class AteneoModule {}
