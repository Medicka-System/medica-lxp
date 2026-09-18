import { Module } from '@nestjs/common';
import { H5pController } from './h5p.controller';
import { H5pService } from './h5p.service';

/**
 * H5P server (§3/§7 · course builder). `DbService` es global; se provee el servicio
 * que monta editor/player/ajax y enlaza el contenido a la lección.
 */
@Module({
  controllers: [H5pController],
  providers: [H5pService],
  exports: [H5pService],
})
export class H5pModule {}
