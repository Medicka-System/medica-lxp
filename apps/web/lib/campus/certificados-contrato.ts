/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Certificados y badges (§ Sprint 8, §6/§8). Reconocimiento del alumno. Qué es REAL
 * (lectura RLS de proyecciones) y qué es PENDIENTE (emisión = dominio/worker).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * REAL (web→Supabase, SOLO LECTURA · comoAlumno):
 *   • Certificados del alumno (lxp.certificados · policy certificados_select: propios).
 *   • Hitos alcanzados (lxp.hitos) y horas acreditadas (competencia_dominios) para el
 *     avance hacia el siguiente hito.
 *   • Badges: catálogo (lxp.badges, legible por todos) cruzado con los otorgados al
 *     alumno (lxp.badges_otorgados · propios) → logrados vs en-progreso.
 *   • Verificación de folio PROPIO: el alumno confirma que su folio existe (RLS).
 *
 * PENDIENTE DE API / worker (fuera de apps/web · §8):
 *   • Emisión de certificados y otorgamiento de badges: los ESCRIBE el worker
 *     (deteccion-hito → emision-certificado / otorgar-badges) con service_role. Aquí
 *     todo es SOLO LECTURA (0010 revoca insert/update/delete a authenticated).
 *   • Verificación PÚBLICA de folio por terceros (sin sesión): endpoint sin auth en
 *     `api` (GET /certificados/verificar?folio=). Aquí solo se verifica el folio del
 *     propio alumno bajo RLS; la verificación pública de un folio ajeno es del `api`.
 */

/** Certificado emitido al alumno. */
export type CertificadoItem = {
  id: string;
  folio: string;
  titulo: string;
  emitidoEn: Date;
  /** Tiene PDF generado en object storage (pdf_ref no nulo). */
  tienePdf: boolean;
};

/** Peldaño de la escalera de hitos de horas (100/500/1000…). */
export type HitoPeldano = {
  umbral: number;
  etiqueta: string;
  alcanzado: boolean;
  alcanzadoEn: Date | null;
};

/** Badge del catálogo, con si el alumno lo tiene. */
export type BadgeItem = {
  clave: string;
  nombre: string;
  descripcion: string | null;
  otorgado: boolean;
  otorgadoEn: Date | null;
};

export type ReconocimientoData = {
  horasAcreditadas: number;
  certificados: CertificadoItem[];
  hitos: HitoPeldano[];
  /** Siguiente hito por alcanzar (null si ya alcanzó el máximo). */
  siguienteHito: HitoPeldano | null;
  badges: BadgeItem[];
};

/** Resultado de verificar un folio (propio · RLS). */
export type VerificacionFolio =
  | { estado: 'valido'; folio: string; titulo: string; emitidoEn: string }
  | { estado: 'no_encontrado' }
  | { estado: 'vacio' };
