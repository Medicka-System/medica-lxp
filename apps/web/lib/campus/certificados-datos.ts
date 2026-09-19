import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import type {
  BadgeItem,
  CertificadoItem,
  HitoPeldano,
  ReconocimientoData,
} from './certificados-contrato';

/**
 * Lectura del reconocimiento del alumno (certificados, hitos, badges). Corre con RLS
 * vía `comoAlumno`: certificados/hitos/badges_otorgados propios + catálogo de badges.
 * Todo es SOLO LECTURA (las proyecciones las escribe el worker · §6/§8). Ver
 * certificados-contrato para el reparto REAL vs PENDIENTE (emisión = dominio).
 */

/** Escalera de hitos de horas del programa (§8). */
const METAS: { umbral: number; etiqueta: string }[] = [
  { umbral: 100, etiqueta: 'Primeras 100 horas' },
  { umbral: 500, etiqueta: '500 horas de práctica' },
  { umbral: 1000, etiqueta: '1000 horas · dominio' },
];

export async function getReconocimiento(userId: string): Promise<ReconocimientoData> {
  return comoAlumno(userId, async (sql) => {
    const [certs, comp, hitosRows, badgesRows] = await Promise.all([
      sql<{ id: string; folio: string; titulo: string; emitido_en: Date; tiene_pdf: boolean }[]>`
        select id, folio, titulo, emitido_en, (pdf_ref is not null) as tiene_pdf
        from lxp.certificados
        where id_alumno = ${userId}
        order by emitido_en desc`,
      sql<{ horas: number }[]>`
        select coalesce(sum(horas), 0)::float8 as horas
        from lxp.competencia_dominios where id_alumno = ${userId}`,
      sql<{ horas_umbral: number; alcanzado_en: Date }[]>`
        select horas_umbral::float8 as horas_umbral, alcanzado_en
        from lxp.hitos where id_alumno = ${userId}`,
      sql<
        { clave: string; nombre: string; descripcion: string | null; otorgado_en: Date | null }[]
      >`
        select b.clave, b.nombre, b.descripcion, bo.otorgado_en
        from lxp.badges b
        left join lxp.badges_otorgados bo
          on bo.badge_id = b.id and bo.id_perfil = ${userId}
        order by b.nombre`,
    ]);

    const horasAcreditadas = Math.round(comp[0]?.horas ?? 0);
    const umbralesAlcanzados = new Set(hitosRows.map((h) => Math.round(h.horas_umbral)));
    const fechaPorUmbral = new Map(
      hitosRows.map((h) => [Math.round(h.horas_umbral), h.alcanzado_en]),
    );

    const hitos: HitoPeldano[] = METAS.map((m) => {
      const alcanzado = umbralesAlcanzados.has(m.umbral) || horasAcreditadas >= m.umbral;
      return {
        umbral: m.umbral,
        etiqueta: m.etiqueta,
        alcanzado,
        alcanzadoEn: fechaPorUmbral.get(m.umbral) ?? null,
      };
    });

    const siguienteHito = hitos.find((h) => !h.alcanzado) ?? null;

    const certificados: CertificadoItem[] = certs.map((c) => ({
      id: c.id,
      folio: c.folio,
      titulo: c.titulo,
      emitidoEn: c.emitido_en,
      tienePdf: c.tiene_pdf,
    }));

    const badges: BadgeItem[] = badgesRows.map((b) => ({
      clave: b.clave,
      nombre: b.nombre,
      descripcion: b.descripcion,
      otorgado: b.otorgado_en !== null,
      otorgadoEn: b.otorgado_en,
    }));

    return { horasAcreditadas, certificados, hitos, siguienteHito, badges };
  });
}
