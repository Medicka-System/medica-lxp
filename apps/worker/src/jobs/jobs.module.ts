import { Module } from '@nestjs/common';
import { CalculoCompetenciaWorker } from './calculo-competencia.worker';
import { DeteccionDecaimientoWorker } from './deteccion-decaimiento.worker';
import { ProgramarRepasoWorker } from './programar-repaso.worker';
import { DeteccionHitoWorker } from './deteccion-hito.worker';
import { EmisionCertificadoWorker } from './emision-certificado.worker';
import { OtorgarBadgesWorker } from './otorgar-badges.worker';
import { ProcesarDicomWorker } from './procesar-dicom.worker';

/** Consumidores BullMQ del dominio (§8, jobs 2 y 4-9). */
@Module({
  providers: [
    CalculoCompetenciaWorker,
    DeteccionDecaimientoWorker,
    ProgramarRepasoWorker,
    DeteccionHitoWorker,
    EmisionCertificadoWorker,
    OtorgarBadgesWorker,
    ProcesarDicomWorker,
  ],
})
export class JobsModule {}
