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
  ],
})
export class AppModule {}
