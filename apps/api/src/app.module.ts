import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { XapiModule } from './xapi/xapi.module';
import { ColasModule } from './colas/colas.module';
import { CompetenciaModule } from './competencia/competencia.module';
import { HitosModule } from './hitos/hitos.module';
import { CertificadosModule } from './certificados/certificados.module';
import { BadgesModule } from './badges/badges.module';

@Module({
  imports: [
    HealthModule,
    XapiModule,
    ColasModule,
    CompetenciaModule,
    HitosModule,
    CertificadosModule,
    BadgesModule,
  ],
})
export class AppModule {}
