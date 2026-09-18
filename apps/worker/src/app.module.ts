import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { ColasModule } from './colas/colas.module';
import { JobsModule } from './jobs/jobs.module';
import { XapiQueueModule } from './queues/xapi/xapi-queue.module';

/**
 * Worker NestJS standalone (§2/§8): hospeda los consumidores BullMQ. Db y Colas
 * son globales; Jobs son el dominio (competencia/decaimiento/repaso/hitos/
 * certificados/badges); Xapi es el envío al LRS (Sprint 2).
 */
@Module({
  imports: [DbModule, ColasModule, JobsModule, XapiQueueModule],
})
export class AppModule {}
