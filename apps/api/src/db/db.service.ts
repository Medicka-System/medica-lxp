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

  /**
   * Ejecuta `fn` IMPERSONANDO al usuario `userId` bajo RLS (§2/§10) — mismo mecanismo
   * que `comoStaff`/`comoAlumno` del web: dentro de una transacción fija
   * `request.jwt.claims` (sub) + `set local role authenticated`, de modo que las MISMAS
   * policies (`lxp.es_staff()` / `lxp.rol_actual()`…) filtran igual que en producción.
   *
   * Lo usa el chat de Eco (§7A): las herramientas leen datos del alumno CON RLS, para
   * que un rol solo vea lo que le corresponde — la BD es el segundo candado (el primero
   * es validar el rol antes de ejecutar la tool). NO es proxy de CRUD: es orquestación
   * de IA que sí vive en el `api` (§2).
   */
  async comoUsuario<T>(userId: string, fn: (sql: Sql) => Promise<T>): Promise<T> {
    return this.sql.begin(async (tx) => {
      const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
      await tx`select set_config('request.jwt.claims', ${claims}, true)`;
      await tx.unsafe('set local role authenticated');
      return fn(tx as unknown as Sql);
    }) as Promise<T>;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.sql.end();
    this.logger.log('Conexión Postgres del api cerrada.');
  }
}
