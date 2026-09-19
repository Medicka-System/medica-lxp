import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  QUEUE_NOTIFICACIONES,
  QUEUE_OTORGAR_BADGES,
  badgesAOtorgar,
  type AlumnoJob,
  type BadgeCatalogo,
  type ContextoBadges,
  type NotificacionJob,
  type ReglaBadge,
} from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { TrabajadorBase } from './trabajador-base';

/**
 * `otorgar-badges` (§8, job #9): evalúa las reglas automáticas del catálogo contra
 * el contexto del alumno (casos, horas, competencia, hitos) y otorga los nuevos.
 * Idempotente (unique badge+perfil).
 */
@Injectable()
export class OtorgarBadgesWorker extends TrabajadorBase {
  protected readonly nombre = QUEUE_OTORGAR_BADGES;

  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
  ) {
    super();
  }

  async procesar(job: Job<AlumnoJob>): Promise<{ otorgados: number }> {
    const sql = this.db.sql;
    const { alumnoId } = job.data;

    const casosRows = await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.bitacora_casos
      where id_alumno = ${alumnoId} and estado_validacion = 'aprobado'`;
    const comp = await sql<{ dominio_iaim: string; nivel: number; horas: number }[]>`
      select dominio_iaim, nivel::float8 as nivel, horas::float8 as horas
      from lxp.competencia_dominios where id_alumno = ${alumnoId}`;
    const hitos = (
      await sql<{ tipo: string }[]>`select tipo from lxp.hitos where id_alumno = ${alumnoId}`
    ).map((r) => r.tipo);

    const nivelPorDominio: Record<string, number> = {};
    let horasTotales = 0;
    for (const c of comp) {
      nivelPorDominio[c.dominio_iaim] = c.nivel;
      horasTotales += c.horas;
    }

    const ctx: ContextoBadges = {
      casosAprobados: casosRows[0]?.n ?? 0,
      horasTotales,
      nivelPorDominio,
      hitos,
    };

    const catalogo: BadgeCatalogo[] = (
      await sql<{ id: string; clave: string; regla: ReglaBadge | null }[]>`
        select id, clave, regla from lxp.badges`
    ).map((b) => ({ id: b.id, clave: b.clave, regla: b.regla }));

    const yaOtorgados = (
      await sql<{ badge_id: string }[]>`
        select badge_id from lxp.badges_otorgados where id_perfil = ${alumnoId}`
    ).map((r) => r.badge_id);

    const claves = new Map(catalogo.map((b) => [b.id, b.clave]));
    const otorgar = badgesAOtorgar(catalogo, ctx, yaOtorgados);
    for (const badgeId of otorgar) {
      await sql`
        insert into lxp.badges_otorgados (badge_id, id_perfil)
        values (${badgeId}, ${alumnoId})
        on conflict (badge_id, id_perfil) do nothing`;
      // Notifica al alumno la insignia recién otorgada (§8 job #12).
      await this.colas.encolar(QUEUE_NOTIFICACIONES, {
        userId: alumnoId,
        tipo: 'badge_otorgado',
        entidadTipo: 'badge',
        entidadId: badgeId,
        datos: { badge: claves.get(badgeId) ?? '' },
      } satisfies NotificacionJob);
    }

    if (otorgar.length > 0) this.logger.log(`Badges otorgados a ${alumnoId}: ${otorgar.length}.`);
    return { otorgados: otorgar.length };
  }
}
