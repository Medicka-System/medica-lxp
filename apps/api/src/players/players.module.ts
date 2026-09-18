import { Module } from '@nestjs/common';
import { XapiModule } from '../xapi/xapi.module';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

/**
 * Players (§7 · Sprint 6). Usa DbModule (global) e importa XapiModule para reportar el
 * progreso/completado al LRS (xAPI). Reusa la capa xAPI del Sprint 2, no la reimplementa.
 */
@Module({
  imports: [XapiModule],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}
