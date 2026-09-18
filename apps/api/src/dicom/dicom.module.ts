import { Module } from '@nestjs/common';
import { IngestaController } from './ingesta.controller';
import { IngestaService } from './ingesta.service';
import { StorageService } from './storage.service';

/** Ingesta DICOM (§8/§9 · Sprint 4.7). Usa DbModule y ColasModule (globales). */
@Module({
  controllers: [IngestaController],
  providers: [IngestaService, StorageService],
})
export class DicomModule {}
