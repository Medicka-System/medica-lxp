import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';

/** Conexión Postgres compartida por los módulos de dominio del `api` (global). */
@Global()
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
