import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { XapiModule } from './xapi/xapi.module';
import { ColasModule } from './colas/colas.module';
import { DbModule } from './db/db.module';
import { CompetenciaModule } from './competencia/competencia.module';
import { HitosModule } from './hitos/hitos.module';
import { CertificadosModule } from './certificados/certificados.module';
import { BadgesModule } from './badges/badges.module';
import { HerenciaModule } from './herencia/herencia.module';
import { PublicacionModule } from './publicacion/publicacion.module';
import { DicomModule } from './dicom/dicom.module';
import { ValidacionModule } from './validacion/validacion.module';
import { AteneoModule } from './ateneo/ateneo.module';
import { AiModule } from './ai/ai.module';
import { MediaModule } from './media/media.module';
import { ClasesModule } from './clases/clases.module';
import { PlayersModule } from './players/players.module';
import { TtsModule } from './tts/tts.module';
import { PaquetesModule } from './paquetes/paquetes.module';
import { H5pModule } from './h5p/h5p.module';
import { RubricasModule } from './rubricas/rubricas.module';
import { ReactivosModule } from './reactivos/reactivos.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { AutoevaluacionModule } from './autoevaluacion/autoevaluacion.module';
import { EntregasModule } from './entregas/entregas.module';

@Module({
  imports: [
    HealthModule,
    XapiModule,
    ColasModule,
    DbModule,
    CompetenciaModule,
    HitosModule,
    CertificadosModule,
    BadgesModule,
    HerenciaModule,
    PublicacionModule,
    DicomModule,
    ValidacionModule,
    AteneoModule,
    AiModule,
    MediaModule,
    ClasesModule,
    PlayersModule,
    TtsModule,
    PaquetesModule,
    H5pModule,
    RubricasModule,
    ReactivosModule,
    NotificacionesModule,
    AutoevaluacionModule,
    EntregasModule,
  ],
})
export class AppModule {}
