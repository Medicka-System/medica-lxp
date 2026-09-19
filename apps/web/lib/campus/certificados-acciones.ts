'use server';

import { getSesionAlumno } from '@/lib/session';
import { comoAlumno } from '@/lib/db.server';
import type { VerificacionFolio } from './certificados-contrato';

/**
 * Verificación de folio del PROPIO alumno (§ Sprint 8). Lectura simple `web →
 * Supabase` bajo RLS (Regla de Oro §2): corre con `comoAlumno`, así que la policy
 * certificados_select (propios) es el candado. La verificación PÚBLICA de un folio
 * ajeno (sin sesión) es un endpoint del `api` (ver certificados-contrato · PENDIENTE).
 */
export async function verificarFolio(folioRaw: string): Promise<VerificacionFolio> {
  const folio = folioRaw.trim();
  if (!folio) return { estado: 'vacio' };

  const alumno = await getSesionAlumno();
  const rows = await comoAlumno(alumno.userId, async (sql) => {
    return sql<{ folio: string; titulo: string; emitido_en: Date }[]>`
      select folio, titulo, emitido_en
      from lxp.certificados
      where folio = ${folio}
      limit 1`;
  });

  const cert = rows[0];
  if (!cert) return { estado: 'no_encontrado' };
  return {
    estado: 'valido',
    folio: cert.folio,
    titulo: cert.titulo,
    emitidoEn: cert.emitido_en.toISOString(),
  };
}
