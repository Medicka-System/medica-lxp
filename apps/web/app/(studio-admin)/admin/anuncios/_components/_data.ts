import 'server-only';
import { comoStaff } from '@/lib/db.server';
import { fechaCorta } from '@/lib/format';
import type { AnunciosData, AnuncioFila, TipoAlcance, Canal, Prioridad, EstadoAnuncio } from './contrato';

/**
 * Lectura de Anuncios CON RLS (`comoStaff`). Los anuncios y el conteo de audiencia
 * por rol son reales (`lxp.anuncios`, `lxp.perfiles`). Estado y vigencia se derivan
 * de `vigente_desde`/`vigente_hasta`. La métrica de lectura (vistas/%) no se registra
 * aún: la vista la marca como placeholder.
 */

type AlcanceJson = { tipo?: TipoAlcance; prioridad?: Prioridad };

function estadoDe(desde: Date, hasta: Date | null, ahora: Date): EstadoAnuncio {
  if (desde > ahora) return 'programado';
  if (hasta && hasta < ahora) return 'vencido';
  return 'publicado';
}

function fechaLegible(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

export async function getAnuncios(userId: string, rol: 'admin' | 'super_admin'): Promise<AnunciosData> {
  return comoStaff(userId, async (sql) => {
    const [rows, aud] = await Promise.all([
      sql<
        {
          id: string;
          titulo: string;
          cuerpo: string;
          alcance: AlcanceJson;
          canales: Canal[];
          vigente_desde: Date;
          vigente_hasta: Date | null;
        }[]
      >`
        select id, titulo, cuerpo, alcance, canales, vigente_desde, vigente_hasta
        from lxp.anuncios order by vigente_desde desc, created_at desc`,
      sql<{ comunidad: number; alumnos: number; staff: number }[]>`
        select
          count(*)::int as comunidad,
          count(*) filter (where rol = 'alumno')::int as alumnos,
          count(*) filter (where rol <> 'alumno')::int as staff
        from lxp.perfiles`,
    ]);

    const audiencia = {
      comunidad: aud[0]?.comunidad ?? 0,
      alumnos: aud[0]?.alumnos ?? 0,
      staff: aud[0]?.staff ?? 0,
    };
    const ahora = new Date();

    const anuncios: AnuncioFila[] = rows.map((r) => {
      const tipo: TipoAlcance = r.alcance?.tipo ?? 'comunidad';
      const prioridad: Prioridad = r.alcance?.prioridad ?? 'normal';
      const estado = estadoDe(r.vigente_desde, r.vigente_hasta, ahora);
      const venceHoy = !!r.vigente_hasta && r.vigente_hasta.toDateString() === ahora.toDateString();
      return {
        id: r.id,
        titulo: r.titulo,
        cuerpo: r.cuerpo,
        prioridad,
        estado,
        alcanceTipo: tipo,
        personas: `${audiencia[tipo]} personas`,
        canales: (r.canales?.length ? r.canales : ['in_app']) as Canal[],
        publicacion:
          estado === 'programado'
            ? `sale el ${fechaLegible(r.vigente_desde)}`
            : `publicado ${fechaCorta(r.vigente_desde)}`,
        vigencia: r.vigente_hasta
          ? estado === 'vencido'
            ? `venció el ${fechaLegible(r.vigente_hasta)}`
            : `vence el ${fechaLegible(r.vigente_hasta)}`
          : 'sin caducidad',
        vencePronto: venceHoy && estado === 'publicado',
      };
    });

    const conteos = {
      publicado: anuncios.filter((a) => a.estado === 'publicado').length,
      programado: anuncios.filter((a) => a.estado === 'programado').length,
      vencido: anuncios.filter((a) => a.estado === 'vencido').length,
    };

    return { rol, anuncios, conteos, audiencia };
  });
}
