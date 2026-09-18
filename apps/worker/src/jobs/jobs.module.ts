import { Module } from '@nestjs/common';
import { CalculoCompetenciaWorker } from './calculo-competencia.worker';
import { DeteccionDecaimientoWorker } from './deteccion-decaimiento.worker';
import { ProgramarRepasoWorker } from './programar-repaso.worker';
import { DeteccionHitoWorker } from './deteccion-hito.worker';
import { EmisionCertificadoWorker } from './emision-certificado.worker';
import { OtorgarBadgesWorker } from './otorgar-badges.worker';
import { ProcesarDicomWorker } from './procesar-dicom.worker';
import { IndexarRagWorker } from './indexar-rag.worker';
import { EcoEvaluacionWorker } from './eco-evaluacion.worker';
import { IngestaGrabacionZoomWorker } from './ingesta-grabacion-zoom.worker';
import { RenderTtsWorker } from './render-tts.worker';

/** Consumidores BullMQ del dominio (§8, jobs 2-11 + course builder). */
@Module({
  providers: [
    CalculoCompetenciaWorker,
    DeteccionDecaimientoWorker,
    ProgramarRepasoWorker,
    DeteccionHitoWorker,
    EmisionCertificadoWorker,
    OtorgarBadgesWorker,
    ProcesarDicomWorker,
    IndexarRagWorker,
    EcoEvaluacionWorker,
    IngestaGrabacionZoomWorker,
    RenderTtsWorker,
  ],
})
export class JobsModule {}
