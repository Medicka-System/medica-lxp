import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_ENVIO_XAPI } from '@campus/shared';
import { XapiController } from './xapi.controller';
import { XAPI_QUEUE, XapiService } from './xapi.service';

/**
 * Módulo xAPI del `api`. Provee la cola productora `envio-xapi` (BullMQ) por token
 * para poder mockearla en tests. El consumidor vive en `apps/worker` (§8).
 */
@Module({
  controllers: [XapiController],
  providers: [
    {
      provide: XAPI_QUEUE,
      useFactory: (): Queue => {
        const redisUrl =
          process.env.REDIS_URL ??
          `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? '6379'}`;
        const connection = new IORedis(redisUrl, {
          maxRetriesPerRequest: null,
        });
        return new Queue(QUEUE_ENVIO_XAPI, { connection });
      },
    },
    XapiService,
  ],
  exports: [XapiService],
})
export class XapiModule {}
