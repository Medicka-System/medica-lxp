import { Module } from '@nestjs/common';
import { XapiQueueService } from './xapi-queue.service';

@Module({
  providers: [XapiQueueService],
  exports: [XapiQueueService],
})
export class XapiQueueModule {}
