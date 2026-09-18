import { Global, Module } from '@nestjs/common';
import { ColasProducer } from './colas-producer';

/** Productor de colas compartido por todos los jobs (global). */
@Global()
@Module({
  providers: [ColasProducer],
  exports: [ColasProducer],
})
export class ColasModule {}
