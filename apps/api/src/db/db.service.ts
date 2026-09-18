import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { createSql, type Sql } from '@campus/db';

/**
 * Conexión Postgres del `api`. El dominio (herencia, publicación/versionado) LEE la
 * plantilla del programa y ESCRIBE overrides/versiones. No es proxy de CRUD (§2):
 * las lecturas simples del catálogo van directo `web → Supabase` con RLS; aquí solo
 * vive lo que requiere cómputo (resolver herencia) o transacción (versionar).
 *
 * En local usa el superusuario del contenedor (omite RLS). En producción, la
 * `service_role` key de Supabase (§10). Fuente de verdad: esquema `lxp`.
 */
@Injectable()
export class DbService implements OnApplicationShutdown {
  private readonly logger = new Logger(DbService.name);
  readonly sql: Sql = createSql({ max: 5 });

  async onApplicationShutdown(): Promise<void> {
    await this.sql.end();
    this.logger.log('Conexión Postgres del api cerrada.');
  }
}
