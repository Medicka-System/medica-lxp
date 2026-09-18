import { Global, Module } from '@nestjs/common';
import { ColasProducer } from './colas-producer';

/** Productor de colas de dominio, compartido por los módulos (global). */
@Global()
@Module({
  providers: [ColasProducer],
  exports: [ColasProducer],
})
export class ColasModule {}
