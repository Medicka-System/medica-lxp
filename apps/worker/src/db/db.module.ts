import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';

/** Conexión Postgres compartida por todos los jobs (global). */
@Global()
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
