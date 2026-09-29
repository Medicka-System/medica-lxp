'use server';

import { comoAnon } from '@/lib/db.server';
import type { VerificacionFolio } from './certificados-contrato';

/**
 * Verificación PÚBLICA de un folio de certificado (§ Sprint 8). Lectura simple `web →
 * Supabase` (Regla de Oro §2) SIN sesión: corre como el rol `anon` y llama a la función
 * SECURITY DEFINER `lxp.verificar_folio_publico` (mig 0060), que es el candado — `anon`
 * no puede leer `lxp.certificados` bajo RLS, solo consultar un folio exacto y recibir lo
 * que ya está impreso en el certificado (título + fecha), sin PII. Así cualquiera (no
 * solo el propio alumno) confirma la autenticidad de un folio.
 */
export async function verificarFolio(folioRaw: string): Promise<VerificacionFolio> {
  const folio = folioRaw.trim();
  if (!folio) return { estado: 'vacio' };

  const rows = await comoAnon(async (sql) => {
    return sql<{ folio: string; titulo: string; emitido_en: Date }[]>`
      select folio, titulo, emitido_en
      from lxp.verificar_folio_publico(${folio})`;
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
