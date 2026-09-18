import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { createSql, type Sql } from '@campus/db';

/**
 * Conexión Postgres del worker. Los jobs escriben las PROYECCIONES
 * (competencia/hitos/certificados/badges) con permisos de service_role (en local,
 * el superusuario del contenedor omite RLS · §6/§10). Fuente de verdad: esquema `lxp`.
 */
@Injectable()
export class DbService implements OnApplicationShutdown {
  private readonly logger = new Logger(DbService.name);
  readonly sql: Sql = createSql({ max: 5 });

  async onApplicationShutdown(): Promise<void> {
    await this.sql.end();
    this.logger.log('Conexión Postgres del worker cerrada.');
  }
}
